import * as prompts from "@clack/prompts";
import type { Command } from "commander";

import { ExecaCommandRunner } from "../adapters/execa-command-runner.ts";
import { NextjsAdapter } from "../adapters/nextjs-adapter.ts";
import { createPackageManager } from "../adapters/package-manager.ts";
import { PrismaAdapter } from "../adapters/prisma-adapter.ts";
import { supabaseAdapter } from "../adapters/supabase-adapter.ts";
import { createProject } from "../core/create-project.ts";
import {
  createProjectContext,
  validateProjectName,
} from "../core/project-configuration.ts";
import {
  getOptionLabel,
  ORM_LABELS,
  PROJECT_OPTIONS,
} from "../core/project-options.ts";
import type {
  DatabaseId,
  Framework,
  PackageManagerId,
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

  const packageManager = await prompts.select<PackageManagerId>({
    message: "Package manager",
    options: [...PROJECT_OPTIONS.packageManagers],
  });
  if (wasCancelled(packageManager)) return undefined;

  const database = await prompts.select<DatabaseId>({
    message: "Database",
    options: [...PROJECT_OPTIONS.databases],
  });
  if (wasCancelled(database)) return undefined;

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
    { name, framework, packageManager, database, styling },
    baseDirectory,
  );
}

export function formatProjectSummary(context: ProjectContext): string {
  return [
    `Project ${context.name}`,
    `Framework ${getOptionLabel(PROJECT_OPTIONS.frameworks, context.framework)}`,
    `Package Manager ${getOptionLabel(PROJECT_OPTIONS.packageManagers, context.packageManager)}`,
    `Database ${getOptionLabel(PROJECT_OPTIONS.databases, context.database)}`,
    `ORM ${ORM_LABELS[context.orm]}`,
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
      let nextjsCreated = false;

      try {
        const packageManager = createPackageManager(
          context.packageManager,
          new ExecaCommandRunner(),
        );
        await createProject(context, new NextjsAdapter(packageManager));
        nextjsCreated = true;
        progress.stop("Next.js project created");

        if (context.database === "supabase") {
          const prismaAdapter = new PrismaAdapter(
            packageManager,
            supabaseAdapter,
          );
          progress.start("Installing Prisma dependencies...");
          await prismaAdapter.install(context);
          progress.stop("Prisma dependencies installed");

          progress.start("Configuring Prisma and Supabase...");
          await prismaAdapter.configure(context);
          progress.stop("Prisma and Supabase configured");

          progress.start("Generating Prisma Client...");
          await prismaAdapter.generate(context);
          progress.stop("Prisma Client generated");

          prompts.note(
            "Add your Supabase connection strings to .env:\n\nDATABASE_URL\nDIRECT_URL",
            "Supabase configuration required",
          );
        }

        prompts.outro(
          `Project ready.\n\ncd ${context.name}\n${packageManager.formatRunCommand("dev")}`,
        );
      } catch (error) {
        progress.error(nextjsCreated ? "Prisma setup failed" : "Project creation failed");
        const details = error instanceof Error ? error.message : "Unexpected error.";
        prompts.cancel(
          nextjsCreated
            ? `The project was created, but Supabase + Prisma setup could not be completed.\n\n${details}`
            : details,
        );
        process.exitCode = 1;
        return;
      }
    });
}
