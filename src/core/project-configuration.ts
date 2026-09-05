import { resolve } from "node:path";

import type {
  DatabaseConfig,
  DatabaseId,
  Framework,
  OrmId,
  PackageManagerId,
  ProjectContext,
  Styling,
} from "../types/project-context.ts";

export interface ProjectConfiguration {
  readonly name: string;
  readonly framework: Framework;
  readonly packageManager: PackageManagerId;
  readonly database: DatabaseId;
  readonly styling: Styling;
}

export function validateProjectName(value: string | undefined): string | undefined {
  const name = value?.trim() ?? "";

  if (name.length === 0) return "Project name is required.";
  if (name.length > 214) return "Project name must be 214 characters or fewer.";
  if (name !== name.toLowerCase()) return "Project name must be lowercase.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return "Use only lowercase letters, numbers, and hyphens; do not start or end with a hyphen.";
  }

  return undefined;
}

export function createProjectContext(
  configuration: ProjectConfiguration,
  baseDirectory: string,
): ProjectContext {
  const name = configuration.name.trim();
  const validationError = validateProjectName(name);
  if (validationError !== undefined) throw new Error(validationError);

  const databaseConfig: DatabaseConfig =
    configuration.database === "supabase"
      ? { database: "supabase", orm: "prisma" }
      : { database: "none", orm: "none" };

  return {
    ...configuration,
    name,
    rootDirectory: resolve(baseDirectory, name),
    ...databaseConfig,
  };
}

export function assertValidDatabaseConfig(configuration: {
  readonly database: DatabaseId;
  readonly orm: OrmId;
}): asserts configuration is DatabaseConfig {
  const valid =
    (configuration.database === "supabase" && configuration.orm === "prisma") ||
    (configuration.database === "none" && configuration.orm === "none");
  if (!valid) {
    throw new Error(
      `Invalid database configuration: ${configuration.database} requires ${configuration.database === "supabase" ? "Prisma" : "no ORM"}.`,
    );
  }
}
