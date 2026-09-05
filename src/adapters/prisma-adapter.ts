import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { DatabaseAdapter } from "../core/database-adapter.ts";
import type { OrmAdapter } from "../core/orm-adapter.ts";
import type { PackageManager } from "../core/package-manager.ts";
import type { ProjectContext } from "../types/project-context.ts";

export const PRISMA_VERSION = "7.0.0";

export const PRISMA_RUNTIME_DEPENDENCIES = [
  `@prisma/client@${PRISMA_VERSION}`,
  `@prisma/adapter-pg@${PRISMA_VERSION}`,
  "pg",
  "dotenv",
] as const;

export const PRISMA_DEVELOPMENT_DEPENDENCIES = [
  `prisma@${PRISMA_VERSION}`,
  "@types/pg",
] as const;

const PRISMA_SCHEMA = `generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
`;

const PRISMA_CONFIG = `import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
});
`;

const PRISMA_CLIENT = `import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
`;

const ENV_TEMPLATE = `# Runtime Prisma connection.
# For serverless deployments, use the Supabase transaction pooler connection.
DATABASE_URL="YOUR_SUPABASE_POOLED_DATABASE_URL"

# Prisma CLI connection used for migrations and introspection.
# Use a direct or suitable Supabase session connection.
DIRECT_URL="YOUR_SUPABASE_DIRECT_DATABASE_URL"
`;

export class PrismaAdapter implements OrmAdapter {
  readonly id = "prisma";
  readonly name = "Prisma";

  constructor(
    private readonly packageManager: PackageManager,
    private readonly databaseAdapter: DatabaseAdapter,
  ) {}

  async install(context: ProjectContext): Promise<void> {
    this.#validate(context);
    await this.packageManager.add(
      PRISMA_RUNTIME_DEPENDENCIES,
      context.rootDirectory,
    );
    await this.packageManager.addDev(
      PRISMA_DEVELOPMENT_DEPENDENCIES,
      context.rootDirectory,
    );
  }

  async configure(context: ProjectContext): Promise<void> {
    this.#validate(context);
    const root = context.rootDirectory;
    await mkdir(join(root, "prisma"), { recursive: true });
    await mkdir(join(root, "src", "lib"), { recursive: true });
    await writeFile(join(root, "prisma", "schema.prisma"), PRISMA_SCHEMA);
    await writeFile(join(root, "prisma.config.ts"), PRISMA_CONFIG);
    await writeFile(join(root, "src", "lib", "prisma.ts"), PRISMA_CLIENT);
    await mergeEnvironmentTemplate(join(root, ".env.example"));
    await createEnvironmentFileIfMissing(join(root, ".env"));
    await ensureGitignoreEntry(join(root, ".gitignore"), ".env");
    await ensureGitignoreEntry(join(root, ".gitignore"), "!.env.example");
  }

  async generate(context: ProjectContext): Promise<void> {
    this.#validate(context);
    await this.packageManager.execute(
      "prisma",
      ["generate"],
      context.rootDirectory,
      {
        // `prisma generate` does not connect, but Prisma still validates the URL.
        // Avoid requiring or persisting real credentials during scaffolding.
        env: { DIRECT_URL: "postgresql://localhost/stackinit" },
      },
    );
  }

  #validate(context: ProjectContext): void {
    if (
      context.database !== this.databaseAdapter.id ||
      context.orm !== this.id ||
      this.databaseAdapter.provider !== "postgresql"
    ) {
      throw new Error(
        "Prisma Supabase setup requires database=supabase, orm=prisma, and a PostgreSQL provider.",
      );
    }
  }
}

async function mergeEnvironmentTemplate(path: string): Promise<void> {
  const existing = await readOptionalFile(path);
  const additions: string[] = [];
  if (!hasEnvironmentKey(existing, "DATABASE_URL")) {
    additions.push(ENV_TEMPLATE.split("\n\n")[0] ?? "");
  }
  if (!hasEnvironmentKey(existing, "DIRECT_URL")) {
    additions.push(ENV_TEMPLATE.split("\n\n")[1]?.trimEnd() ?? "");
  }
  if (additions.length === 0) return;

  const separator = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  await writeFile(
    path,
    `${existing}${separator}${existing.length === 0 ? "" : "\n"}${additions.join("\n\n")}\n`,
  );
}

async function ensureGitignoreEntry(path: string, entry: string): Promise<void> {
  const existing = await readOptionalFile(path);
  if (existing.split(/\r?\n/).includes(entry)) return;
  const separator = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
  await writeFile(path, `${existing}${separator}${entry}\n`);
}

async function createEnvironmentFileIfMissing(path: string): Promise<void> {
  const existing = await readOptionalFile(path);
  if (existing.length > 0) return;

  try {
    await writeFile(path, ENV_TEMPLATE, { flag: "wx" });
  } catch (error) {
    if (!isFileExistsError(error)) throw error;
  }
}

async function readOptionalFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { readonly code?: unknown }).code === "ENOENT"
    ) {
      return "";
    }
    throw error;
  }
}

function hasEnvironmentKey(contents: string, key: string): boolean {
  return new RegExp(`^\\s*${key}\\s*=`, "m").test(contents);
}

function isFileExistsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { readonly code?: unknown }).code === "EEXIST"
  );
}
