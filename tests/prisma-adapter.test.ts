import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  PrismaAdapter,
  PRISMA_DEVELOPMENT_DEPENDENCIES,
  PRISMA_RUNTIME_DEPENDENCIES,
  PRISMA_VERSION,
} from "../src/adapters/prisma-adapter.ts";
import { supabaseAdapter } from "../src/adapters/supabase-adapter.ts";
import type { PackageManager } from "../src/core/package-manager.ts";
import type { ProjectContext } from "../src/types/project-context.ts";

class RecordingPackageManager implements PackageManager {
  readonly id = "bun";
  readonly name = "Bun";
  readonly calls: { operation: string; values: readonly string[]; cwd: string }[] = [];
  addError: Error | undefined;
  executeError: Error | undefined;

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  install(_cwd: string): Promise<void> {
    return Promise.resolve();
  }

  add(packages: readonly string[], cwd: string): Promise<void> {
    if (this.addError !== undefined) return Promise.reject(this.addError);
    this.calls.push({ operation: "add", values: packages, cwd });
    return Promise.resolve();
  }

  addDev(packages: readonly string[], cwd: string): Promise<void> {
    this.calls.push({ operation: "addDev", values: packages, cwd });
    return Promise.resolve();
  }

  remove(_packages: readonly string[], _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  run(_script: string, _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  exec(_packageName: string, _arguments: readonly string[]): Promise<void> {
    return Promise.resolve();
  }

  execute(binaryName: string, arguments_: readonly string[], cwd: string): Promise<void> {
    if (this.executeError !== undefined) return Promise.reject(this.executeError);
    this.calls.push({ operation: "execute", values: [binaryName, ...arguments_], cwd });
    return Promise.resolve();
  }

  formatRunCommand(script: string): string {
    return `bun run ${script}`;
  }
}

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function fixture(): Promise<{ root: string; context: ProjectContext }> {
  const root = await mkdtemp(join(tmpdir(), "stackinit-prisma-"));
  temporaryDirectories.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  return {
    root,
    context: {
      name: "washflow",
      rootDirectory: root,
      framework: "nextjs",
      packageManager: "bun",
      database: "supabase",
      orm: "prisma",
      styling: "tailwind",
    },
  };
}

describe("PrismaAdapter", () => {
  test("uses one pinned Prisma major and requests required dependencies", async () => {
    const { context, root } = await fixture();
    const packageManager = new RecordingPackageManager();
    const adapter = new PrismaAdapter(packageManager, supabaseAdapter);

    await adapter.install(context);

    expect(PRISMA_VERSION).toBe("7.0.0");
    expect(packageManager.calls).toEqual([
      { operation: "add", values: PRISMA_RUNTIME_DEPENDENCIES, cwd: root },
      { operation: "addDev", values: PRISMA_DEVELOPMENT_DEPENDENCIES, cwd: root },
    ]);
  });

  test("generates Prisma, runtime client, and safe environment configuration", async () => {
    const { context, root } = await fixture();
    await writeFile(join(root, ".env.example"), "EXISTING_VALUE=kept\n");
    await writeFile(join(root, ".gitignore"), "node_modules\n");
    const adapter = new PrismaAdapter(
      new RecordingPackageManager(),
      supabaseAdapter,
    );

    await adapter.configure(context);

    const schema = await readFile(join(root, "prisma", "schema.prisma"), "utf8");
    expect(schema).toContain('provider = "postgresql"');
    expect(schema).toContain('provider = "prisma-client"');
    expect(schema).not.toContain("model ");

    const config = await readFile(join(root, "prisma.config.ts"), "utf8");
    expect(config).toContain('from "prisma/config"');
    expect(config).toContain('url: env("DIRECT_URL")');

    const client = await readFile(join(root, "src", "lib", "prisma.ts"), "utf8");
    expect(client).toContain('from "@prisma/adapter-pg"');
    expect(client).toContain("process.env.DATABASE_URL");
    expect(client).toContain("globalForPrisma.prisma");

    const environment = await readFile(join(root, ".env.example"), "utf8");
    expect(environment).toContain("EXISTING_VALUE=kept");
    expect(environment).toContain('DATABASE_URL="YOUR_SUPABASE_POOLED_DATABASE_URL"');
    expect(environment).toContain('DIRECT_URL="YOUR_SUPABASE_DIRECT_DATABASE_URL"');
    expect(environment).not.toContain("postgresql://");

    expect(await readFile(join(root, ".env"), "utf8")).toContain(
      "YOUR_SUPABASE_POOLED_DATABASE_URL",
    );
    const gitignore = (await readFile(join(root, ".gitignore"), "utf8")).split(
      "\n",
    );
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain("!.env.example");
  });

  test("does not overwrite an existing .env or duplicate template keys", async () => {
    const { context, root } = await fixture();
    await writeFile(join(root, ".env"), "PRIVATE_EXISTING_VALUE=preserved\n");
    await writeFile(join(root, ".env.example"), 'DATABASE_URL="custom"\n');
    const adapter = new PrismaAdapter(
      new RecordingPackageManager(),
      supabaseAdapter,
    );

    await adapter.configure(context);
    await adapter.configure(context);

    expect(await readFile(join(root, ".env"), "utf8")).toBe(
      "PRIVATE_EXISTING_VALUE=preserved\n",
    );
    const template = await readFile(join(root, ".env.example"), "utf8");
    expect(template.match(/^DATABASE_URL=/gm)).toHaveLength(1);
    expect(template.match(/^DIRECT_URL=/gm)).toHaveLength(1);
  });

  test("propagates failed dependency installation", async () => {
    const { context } = await fixture();
    const packageManager = new RecordingPackageManager();
    packageManager.addError = new Error("install failed");

    await expect(
      new PrismaAdapter(packageManager, supabaseAdapter).install(context),
    ).rejects.toThrow("install failed");
    expect(packageManager.calls).toHaveLength(0);
  });

  test("runs and propagates Prisma generate", async () => {
    const { context, root } = await fixture();
    const packageManager = new RecordingPackageManager();
    const adapter = new PrismaAdapter(packageManager, supabaseAdapter);

    await adapter.generate(context);
    expect(packageManager.calls).toEqual([
      { operation: "execute", values: ["prisma", "generate"], cwd: root },
    ]);

    packageManager.executeError = new Error("generate failed");
    await expect(adapter.generate(context)).rejects.toThrow("generate failed");
  });

  test("rejects contexts that are not Supabase with Prisma", async () => {
    const { context } = await fixture();
    const invalidContext = {
      ...context,
      database: "none",
      orm: "none",
    } as unknown as ProjectContext;

    await expect(
      new PrismaAdapter(
        new RecordingPackageManager(),
        supabaseAdapter,
      ).install(invalidContext),
    ).rejects.toThrow("requires database=supabase, orm=prisma");
  });
});
