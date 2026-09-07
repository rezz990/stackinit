import type { PackageManagerId } from "../types/project-context.ts";
import type { ProjectOption } from "./project-option.ts";

/** Package managers available for generated projects. */
export const PACKAGE_MANAGER_OPTIONS = [
  { value: "bun", label: "Bun" },
  { value: "npm", label: "npm" },
  { value: "pnpm", label: "pnpm" },
  { value: "yarn", label: "yarn" },
] as const satisfies readonly ProjectOption<PackageManagerId>[];
