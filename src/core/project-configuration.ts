import { resolve } from "node:path";

import type {
  Database,
  Framework,
  Orm,
  PackageManager,
  ProjectContext,
  Styling,
} from "../types/project-context.ts";

export interface ProjectConfiguration {
  readonly name: string;
  readonly framework: Framework;
  readonly packageManager: PackageManager;
  readonly database: Database;
  readonly orm: Orm;
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

  return {
    ...configuration,
    name,
    rootDirectory: resolve(baseDirectory, name),
    orm: configuration.database === "none" ? "none" : configuration.orm,
  };
}
