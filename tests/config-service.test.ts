import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  findProjectRoot,
  readConfig,
  STACKINIT_CONFIG_FILENAME,
  StackInitConfigParseError,
  StackInitProjectNotFoundError,
  writeConfig,
} from "../src/core/config-service.ts";
import {
  type StackInitConfig,
  StackInitConfigValidationError,
  validateConfig,
} from "../src/core/stackinit-config.ts";
import { createProjectManifest } from "../src/core/project-manifest.ts";

const temporaryDirectories: string[] = [];

const supabaseConfig: StackInitConfig = {
  $schema: "https://stackinit.dev/schema.json",
  version: 1,
  framework: "nextjs",
  packageManager: "bun",
  database: "supabase",
  orm: "prisma",
  styling: ["tailwind"],
};

const noDatabaseConfig: StackInitConfig = {
  ...supabaseConfig,
  database: "none",
  orm: "none",
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "stackinit-config-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("StackInit configuration schema", () => {
  test("accepts supported database and ORM combinations", () => {
    expect(validateConfig(supabaseConfig)).toEqual(supabaseConfig);
    expect(validateConfig(noDatabaseConfig)).toEqual(noDatabaseConfig);
  });

  test("accepts client-only Vite projects and rejects server database wiring", () => {
    const viteConfig: StackInitConfig = {
      ...noDatabaseConfig,
      framework: "react-vite",
    };
    expect(validateConfig(viteConfig)).toEqual(viteConfig);
    expect(() =>
      validateConfig({ ...supabaseConfig, framework: "vue-vite" }),
    ).toThrow("The database and ORM configuration is not supported.");
  });

  test("creates manifests from database and no-database project contexts", () => {
    expect(
      createProjectManifest({
        name: "with-supabase",
        rootDirectory: "/projects/with-supabase",
        framework: "nextjs",
        packageManager: "bun",
        database: "supabase",
        orm: "prisma",
        styling: "tailwind",
      }),
    ).toEqual(supabaseConfig);

    expect(
      createProjectManifest({
        name: "without-database",
        rootDirectory: "/projects/without-database",
        framework: "nextjs",
        packageManager: "bun",
        database: "none",
        orm: "none",
        styling: "none",
      }),
    ).toEqual({ ...noDatabaseConfig, styling: [] });
  });

  test("rejects unsupported database and ORM combinations safely", () => {
    expect(() =>
      validateConfig({ ...supabaseConfig, orm: "none" }),
    ).toThrow("The database and ORM configuration is not supported.");
    expect(() =>
      validateConfig({ ...noDatabaseConfig, orm: "prisma" }),
    ).toThrow("The database and ORM configuration is not supported.");
  });

  test("rejects unsupported manifest versions", () => {
    expect(() => validateConfig({ ...supabaseConfig, version: 2 })).toThrow(
      new StackInitConfigValidationError(
        "The StackInit manifest version is not supported.",
      ),
    );
  });
});

describe("StackInit config service", () => {
  test("writes deterministic configuration and reads it back", async () => {
    const root = await temporaryDirectory();

    await writeConfig(root, supabaseConfig);

    const contents = await readFile(join(root, STACKINIT_CONFIG_FILENAME), "utf8");
    expect(contents).toBe(
      `${JSON.stringify(supabaseConfig, null, 2)}\n`,
    );
    expect(await readConfig(root)).toEqual({
      rootDirectory: root,
      config: supabaseConfig,
    });
    expect((await readdir(root)).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
  });

  test("discovers the project root from nested directories", async () => {
    const root = await temporaryDirectory();
    const nested = join(root, "src", "app", "dashboard");
    await mkdir(nested, { recursive: true });
    await writeConfig(root, noDatabaseConfig);

    expect(await findProjectRoot(nested)).toBe(root);
    expect((await readConfig(nested)).config).toEqual(noDatabaseConfig);
  });

  test("reports malformed JSON without exposing its contents", async () => {
    const root = await temporaryDirectory();
    const secret = "database-password";
    await writeFile(
      join(root, STACKINIT_CONFIG_FILENAME),
      `{ malformed ${secret}`,
    );

    try {
      await readConfig(root);
      throw new Error("Expected malformed configuration to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(StackInitConfigParseError);
      expect(String(error)).toContain(".stackinit.json could not be parsed");
      expect(String(error)).not.toContain(secret);
    }
  });

  test("reports directories that are not managed", async () => {
    const root = await temporaryDirectory();

    await expect(readConfig(root)).rejects.toEqual(
      new StackInitProjectNotFoundError(),
    );
  });
});
