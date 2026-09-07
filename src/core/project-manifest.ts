import type { StackInitConfig } from "./stackinit-config.ts";
import type { ProjectContext } from "../types/project-context.ts";

export function createProjectManifest(context: ProjectContext): StackInitConfig {
  const styling: StackInitConfig["styling"] =
    context.styling === "tailwind" ? ["tailwind"] : [];
  const common = {
    $schema: "https://stackinit.dev/schema.json" as const,
    version: 1 as const,
    framework: context.framework,
    packageManager: context.packageManager,
    styling,
  };
  return context.database === "supabase"
    ? { ...common, database: "supabase", orm: "prisma" }
    : { ...common, database: "none", orm: "none" };
}
