import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { formatProjectInfo, showProjectInfo } from "../src/cli/info-command.ts";
import { writeConfig } from "../src/core/config-service.ts";
import type { StackInitConfig } from "../src/core/stackinit-config.ts";
import { Logger } from "../src/utils/logger.ts";

const temporaryDirectories: string[] = [];
const config: StackInitConfig = {
  $schema: "https://stackinit.dev/schema.json",
  version: 1,
  framework: "nextjs",
  packageManager: "bun",
  database: "supabase",
  orm: "prisma",
  styling: ["tailwind"],
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("stackinit info", () => {
  test("formats supported labels without secret values", () => {
    const secret = "should-never-be-shown";
    const value = { ...config, internalSecret: secret };

    const output = formatProjectInfo(value);

    expect(output).toBe(
      [
        "StackInit Project",
        "",
        "Framework        Next.js",
        "Package Manager  Bun",
        "Database         Supabase",
        "ORM              Prisma",
        "Styling          Tailwind CSS",
      ].join("\n"),
    );
    expect(output).not.toContain(secret);
    expect(output).not.toContain("DATABASE_URL");
  });

  test("formats projects without a database", () => {
    const output = formatProjectInfo({
      ...config,
      database: "none",
      orm: "none",
      styling: [],
    });

    expect(output).toContain("Database         None");
    expect(output).toContain("ORM              None");
    expect(output).toContain("Styling          None");
  });

  test("reads configuration from a nested project directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackinit-info-"));
    temporaryDirectories.push(root);
    const nested = join(root, "src", "app");
    await mkdir(nested, { recursive: true });
    await writeConfig(root, config);
    const output: string[] = [];
    const errors: string[] = [];
    const logger = new Logger({
      output: (message) => output.push(message),
      errorOutput: (message) => errors.push(message),
    });

    expect(await showProjectInfo(nested, logger)).toBe(true);
    expect(output).toEqual([formatProjectInfo(config)]);
    expect(errors).toEqual([]);
  });

  test("returns a clean not-managed error", async () => {
    const root = await mkdtemp(join(tmpdir(), "stackinit-info-"));
    temporaryDirectories.push(root);
    const errors: string[] = [];
    const logger = new Logger({ errorOutput: (message) => errors.push(message) });

    expect(await showProjectInfo(root, logger)).toBe(false);
    expect(errors).toEqual(["This directory is not managed by StackInit."]);
  });
});
