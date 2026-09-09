import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { formatDoctorReport } from "../src/cli/doctor-command.ts";
import type { CommandResult, CommandRunner } from "../src/core/command-runner.ts";
import { writeConfig } from "../src/core/config-service.ts";
import { createDoctorChecks, runDoctor } from "../src/core/doctor-service.ts";
import type { DoctorReport } from "../src/core/doctor.ts";
import type { StackInitConfig } from "../src/core/stackinit-config.ts";

class AvailabilityRunner implements CommandRunner {
  constructor(private readonly available = true) {}

  run(): Promise<CommandResult> {
    return Promise.resolve({
      exitCode: this.available ? 0 : 1,
      stdout: this.available ? "1.2.3" : "",
      stderr: "",
    });
  }
}

const temporaryDirectories: string[] = [];

const baseConfig: StackInitConfig = {
  $schema: "https://stackinit.dev/schema.json",
  version: 1,
  framework: "nextjs",
  packageManager: "bun",
  database: "supabase",
  orm: "prisma",
  styling: ["tailwind"],
};

const packageJson = {
  dependencies: {
    next: "16.0.0",
    "@prisma/client": "7.0.0",
    "@prisma/adapter-pg": "7.0.0",
    pg: "8.0.0",
  },
  devDependencies: { prisma: "7.0.0", tailwindcss: "4.0.0" },
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function healthyProject(
  config: StackInitConfig = baseConfig,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "stackinit-doctor-"));
  temporaryDirectories.push(root);
  await writeConfig(root, config);
  await mkdir(join(root, "node_modules"));
  await writeFile(join(root, "package.json"), JSON.stringify(packageJson));
  await writeFile(join(root, "next.config.ts"), "export default {};\n");

  if (config.database === "supabase") {
    await mkdir(join(root, "prisma"));
    await mkdir(join(root, "src", "lib"), { recursive: true });
    await mkdir(join(root, "src", "generated", "prisma"), { recursive: true });
    await writeFile(
      join(root, "prisma", "schema.prisma"),
      'datasource db {\n  provider = "postgresql"\n}\n',
    );
    await writeFile(
      join(root, "prisma.config.ts"),
      'export default { datasource: { url: env("DIRECT_URL") } };\n',
    );
    await writeFile(join(root, "src", "lib", "prisma.ts"), "DATABASE_URL\n");
    await writeFile(
      join(root, "src", "generated", "prisma", "client.ts"),
      "export class PrismaClient {}\n",
    );
    await writeFile(
      join(root, ".env"),
      [
        'DATABASE_URL="postgresql://user:runtime@pool.example.com/app"',
        'DIRECT_URL="postgresql://user:direct@db.example.com/app"',
      ].join("\n"),
    );
  }
  return root;
}

function result(report: DoctorReport, id: string) {
  const found = report.results.find((item) => item.id === id);
  if (!found) throw new Error(`Missing doctor result ${id}`);
  return found;
}

describe("StackInit doctor", () => {
  test("reports a healthy Supabase and Prisma project", async () => {
    const root = await healthyProject();
    const report = await runDoctor(root, new AvailabilityRunner());

    expect(report.exitCode).toBe(0);
    expect(report.results.every((item) => item.severity === "success")).toBe(true);
    expect(formatDoctorReport(report)).toContain("No errors found.");
  });

  test("skips Supabase and Prisma checks for a no-database project", async () => {
    const config: StackInitConfig = {
      ...baseConfig,
      database: "none",
      orm: "none",
    };
    const root = await healthyProject(config);
    const report = await runDoctor(root, new AvailabilityRunner());

    expect(report.exitCode).toBe(0);
    expect(report.results.some((item) => item.category === "Supabase")).toBe(false);
    expect(report.results.some((item) => item.category === "Prisma")).toBe(false);
  });

  test.each([
    ["DATABASE_URL", "supabase.database-url"],
    ["DIRECT_URL", "supabase.direct-url"],
  ] as const)("detects a missing %s", async (variable, id) => {
    const root = await healthyProject();
    const remaining = variable === "DATABASE_URL"
      ? 'DIRECT_URL="postgresql://db.example.com/app"\n'
      : 'DATABASE_URL="postgresql://pool.example.com/app"\n';
    await writeFile(join(root, ".env"), remaining);

    const report = await runDoctor(root, new AvailabilityRunner(), {});

    expect(report.exitCode).toBe(1);
    expect(result(report, id).severity).toBe("error");
    expect(result(report, id).message).toContain("is not configured");
  });

  test("detects malformed URLs without leaking secrets", async () => {
    const root = await healthyProject();
    const secret = "super-secret-password-123";
    await writeFile(
      join(root, ".env"),
      `DATABASE_URL="http://user:${secret}@example.com/app"\nDIRECT_URL="postgresql://db.example.com/app"\n`,
    );

    const report = await runDoctor(root, new AvailabilityRunner(), {});
    const output = formatDoctorReport(report);

    expect(result(report, "supabase.database-url").severity).toBe("error");
    expect(output).not.toContain(secret);
    expect(output).not.toContain("postgresql://");
  });

  test.each([
    ["prisma", "prisma.dependency.prisma"],
    ["@prisma/client", "prisma.dependency.@prisma/client"],
    ["@prisma/adapter-pg", "prisma.dependency.@prisma/adapter-pg"],
  ] as const)("detects missing %s", async (dependency, id) => {
    const root = await healthyProject();
    const current = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    delete current.dependencies[dependency];
    delete current.devDependencies[dependency];
    await writeFile(join(root, "package.json"), JSON.stringify(current));

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, id).severity).toBe("error");
    expect(result(report, id).hint).toContain("bun add");
  });

  test("detects missing and invalid Prisma files", async () => {
    const root = await healthyProject();
    await unlink(join(root, "prisma.config.ts"));
    await writeFile(
      join(root, "prisma", "schema.prisma"),
      'datasource db {\n provider = "mysql"\n}\n',
    );
    await unlink(join(root, "src", "lib", "prisma.ts"));
    await rm(join(root, "src", "generated", "prisma"), { recursive: true });

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, "prisma.config").severity).toBe("error");
    expect(result(report, "prisma.schema").message).toContain("PostgreSQL");
    expect(result(report, "prisma.runtime-client").severity).toBe("error");
    expect(result(report, "prisma.generated-client").severity).toBe("error");
  });

  test("detects incompatible Prisma major versions", async () => {
    const root = await healthyProject();
    const current = structuredClone(packageJson);
    current.dependencies["@prisma/client"] = "^6.0.0";
    await writeFile(join(root, "package.json"), JSON.stringify(current));

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, "prisma.version-consistency").severity).toBe("error");
  });

  test("detects a missing selected styling dependency", async () => {
    const root = await healthyProject();
    const current = structuredClone(packageJson);
    delete (current.devDependencies as Record<string, string>).tailwindcss;
    await writeFile(join(root, "package.json"), JSON.stringify(current));

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, "styling.tailwind.dependency").severity).toBe("error");
    expect(report.exitCode).toBe(1);
  });

  test("treats identical connection roles as a warning with exit zero", async () => {
    const root = await healthyProject();
    const url = "postgresql://db.example.com/app";
    await writeFile(
      join(root, ".env"),
      `DATABASE_URL="${url}"\nDIRECT_URL="${url}"\n`,
    );

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, "supabase.connection-roles.identical").severity).toBe(
      "warning",
    );
    expect(report.exitCode).toBe(0);
  });

  test("reports unavailable selected package managers", async () => {
    const root = await healthyProject();
    const report = await runDoctor(root, new AvailabilityRunner(false));

    expect(result(report, "environment.package-manager").severity).toBe(
      "error",
    );
    expect(report.exitCode).toBe(1);
  });

  test("registers checks from each selected adapter area", () => {
    expect(createDoctorChecks(baseConfig).map((check) => check.id)).toEqual([
      "project",
      "package-manager",
      "framework.nextjs",
      "styling.tailwind",
      "database.supabase",
      "orm.prisma",
    ]);
  });

  test("validates a healthy React + Vite Tailwind project", async () => {
    const config: StackInitConfig = {
      ...baseConfig,
      framework: "react-vite",
      database: "none",
      orm: "none",
    };
    const root = await mkdtemp(join(tmpdir(), "stackinit-doctor-vite-"));
    temporaryDirectories.push(root);
    await writeConfig(root, config);
    await mkdir(join(root, "node_modules"));
    await mkdir(join(root, "src"));
    await writeFile(join(root, "package.json"), JSON.stringify({
      dependencies: { react: "19.0.0" },
      devDependencies: {
        vite: "8.0.0",
        tailwindcss: "4.0.0",
        "@tailwindcss/vite": "4.0.0",
      },
    }));
    await writeFile(join(root, "vite.config.ts"), "plugins: [react(), tailwindcss()]\n");
    await writeFile(join(root, "src", "index.css"), '@import "tailwindcss";\n');

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(report.exitCode).toBe(0);
    expect(result(report, "framework.react-vite.dependency").severity).toBe("success");
    expect(result(report, "styling.tailwind.vite-plugin").severity).toBe("success");
    expect(result(report, "styling.tailwind.stylesheet").severity).toBe("success");
  });

  test.each([
    ["bun", "bun add @prisma/client"],
    ["npm", "npm install @prisma/client"],
    ["pnpm", "pnpm add @prisma/client"],
    ["yarn", "yarn add @prisma/client"],
  ] as const)("uses %s-specific repair hints", async (packageManager, hint) => {
    const root = await healthyProject({ ...baseConfig, packageManager });
    const current = structuredClone(packageJson);
    delete (current.dependencies as Record<string, string>)["@prisma/client"];
    await writeFile(join(root, "package.json"), JSON.stringify(current));

    const report = await runDoctor(root, new AvailabilityRunner());

    expect(result(report, "prisma.dependency.@prisma/client").hint).toBe(hint);
  });
});
