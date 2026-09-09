import { resolve } from "node:path";

import { assertCompatibleProjectSpec } from "../integrations/compatibility.ts";
import type { ProjectContext, ProjectSpec } from "../types/project-context.ts";

export type ProjectConfiguration = ProjectSpec & {
  readonly name: string;
};

export function validateProjectName(value: string | undefined): string | undefined {
  const name = value?.trim() ?? "";

  if (name.length === 0) return "Project name is required.";
  if (name.length > 214) return "Project name must be 214 characters or fewer.";
  if (name !== name.toLowerCase()) return "Project name must be lowercase.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return "Use only lowercase letters, numbers, and hyphens; do not start or end with a hyphen.";
  }
  if (name === "node_modules" || name === "favicon.ico") {
    return `Project name "${name}" is reserved. Choose another project name.`;
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
  assertCompatibleProjectSpec(configuration);

  return {
    ...configuration,
    name,
    rootDirectory: resolve(baseDirectory, name),
  };
}
