import * as prompts from "@clack/prompts";
import type { Command } from "commander";

import { ExecaCommandRunner } from "../adapters/execa-command-runner.ts";
import { NextjsAdapter } from "../adapters/nextjs-adapter.ts";
import { createProject } from "../core/create-project.ts";
import {
  createProjectContext,
  validateProjectName,
} from "../core/project-configuration.ts";
import { getOptionLabel, PROJECT_OPTIONS } from "../core/project-options.ts";
import type {
  Database,
  Framework,
  Orm,
  PackageManager,
  ProjectContext,
  Styling,
} from "../types/project-context.ts";

function wasCancelled(value: unknown): value is symbol {
  if (!prompts.isCancel(value)) return false;
  prompts.cancel("Project configuration cancelled.");
  return true;
}

export async function promptForProjectContext(
  suppliedName: string | undefined,
  baseDirectory: string,
): Promise<ProjectContext | undefined> {
  prompts.intro("StackInit");

  let name: string;
  if (suppliedName === undefined) {
    const promptedName = await prompts.text({
      message: "Project name",
      placeholder: "my-app",
      validate: validateProjectName,
    });
    if (wasCancelled(promptedName)) return undefined;
    name = promptedName;
  } else {
    const validationError = validateProjectName(suppliedName);
    if (validationError !== undefined) {
      prompts.cancel(validationError);
      return undefined;
    }
    name = suppliedName;
  }

  const framework = await prompts.select<Framework>({
    message: "Framework",
    options: [...PROJECT_OPTIONS.frameworks],
  });
  if (wasCancelled(framework)) return undefined;

  const packageManager = await prompts.select<PackageManager>({
    message: "Package manager",
    options: [...PROJECT_OPTIONS.packageManagers],
  });
  if (wasCancelled(packageManager)) return undefined;

  const database = await prompts.select<Database>({
    message: "Database",
    options: [...PROJECT_OPTIONS.databases],
  });
  if (wasCancelled(database)) return undefined;

  let orm: Orm = "none";
  if (database !== "none") {
    const selectedOrm = await prompts.select<Orm>({
      message: "ORM",
      options: [...PROJECT_OPTIONS.orms],
    });
    if (wasCancelled(selectedOrm)) return undefined;
    orm = selectedOrm;
  }

  const styling = await prompts.select<Styling>({
    message: "Styling",
    options: [...PROJECT_OPTIONS.styling],
  });
  if (wasCancelled(styling)) return undefined;

  const confirmed = await prompts.confirm({
    message: "Use this configuration?",
  });
  if (wasCancelled(confirmed)) return undefined;
  if (!confirmed) {
    prompts.cancel("Project configuration was not confirmed.");
    return undefined;
  }

  return createProjectContext(
    { name, framework, packageManager, database, orm, styling },
    baseDirectory,
  );
}

export function formatProjectSummary(context: ProjectContext): string {
  return [
    `Project ${context.name}`,
    `Framework ${getOptionLabel(PROJECT_OPTIONS.frameworks, context.framework)}`,
    `Package Manager ${getOptionLabel(PROJECT_OPTIONS.packageManagers, context.packageManager)}`,
    `Database ${getOptionLabel(PROJECT_OPTIONS.databases, context.database)}`,
    `ORM ${getOptionLabel(PROJECT_OPTIONS.orms, context.orm)}`,
    `Styling ${getOptionLabel(PROJECT_OPTIONS.styling, context.styling)}`,
  ].join("\n");
}

export function registerCreateCommand(program: Command): void {
  program
    .command("create [project-name]")
    .description("Configure a new project")
    .action(async (projectName: string | undefined) => {
      const context = await promptForProjectContext(projectName, process.cwd());
      if (context === undefined) return;

      prompts.note(formatProjectSummary(context), "StackInit");
      const progress = prompts.spinner();
      progress.start("Creating project...");

      try {
        await createProject(context, new NextjsAdapter(new ExecaCommandRunner()));
        progress.stop("Next.js project created");
      } catch (error) {
        progress.error("Project creation failed");
        prompts.cancel(error instanceof Error ? error.message : "Unexpected error.");
        process.exitCode = 1;
        return;
      }

      const runCommand =
        context.packageManager === "npm"
          ? "npm run dev"
          : `${context.packageManager} dev`;
      prompts.outro(`Project ready.\n\ncd ${context.name}\n${runCommand}`);
    });
}
