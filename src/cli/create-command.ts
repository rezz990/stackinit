import * as prompts from "@clack/prompts";
import type { Command } from "commander";

import { ExecaCommandRunner } from "../adapters/execa-command-runner.ts";
import { createPackageManager } from "../adapters/package-manager.ts";
import {
  ProjectSetupError,
  setupProject,
  type ProjectSetupStage,
} from "../core/project-setup.ts";
import {
  createProjectContext,
  validateProjectName,
} from "../core/project-configuration.ts";
import { PACKAGE_MANAGER_OPTIONS } from "../core/package-manager-options.ts";
import { getOptionLabel } from "../core/project-option.ts";
import {
  ORM_LABELS,
  INTEGRATION_OPTIONS,
  getDatabaseOptions,
  getDatabaseSetupNote,
  getFrameworkIntegration,
  getStylingOptions,
  createOrmAdapter,
  resolveDatabaseIntegration,
} from "../integrations/registry.ts";
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
): Promise<ProjectPromptResult> {
  prompts.intro("StackInit");

  let name: string;
  if (suppliedName === undefined) {
    const promptedName = await prompts.text({
      message: "Project name",
      placeholder: "my-app",
      validate: validateProjectName,
    });
    if (wasCancelled(promptedName)) return { status: "cancelled" };
    name = promptedName;
  } else {
    const validationError = validateProjectName(suppliedName);
    if (validationError !== undefined) {
      prompts.cancel(validationError);
      return { status: "invalid" };
    }
    name = suppliedName;
  }

  const framework = await prompts.select<Framework>({
    message: "Framework",
    options: [...INTEGRATION_OPTIONS.frameworks],
  });
  if (wasCancelled(framework)) return { status: "cancelled" };

  const packageManager = await prompts.select<PackageManagerId>({
    message: "Package manager",
    options: [...PACKAGE_MANAGER_OPTIONS],
  });
  if (wasCancelled(packageManager)) return { status: "cancelled" };

  const database = await prompts.select<DatabaseId>({
    message: "Database",
    options: [...getDatabaseOptions(framework)],
  });
  if (wasCancelled(database)) return { status: "cancelled" };

  const styling = await prompts.select<Styling>({
    message: "Styling",
    options: [...getStylingOptions(framework)],
  });
  if (wasCancelled(styling)) return { status: "cancelled" };

  const confirmed = await prompts.confirm({
    message: "Use this configuration?",
  });
  if (wasCancelled(confirmed)) return { status: "cancelled" };
  if (!confirmed) {
    prompts.cancel("Project configuration was not confirmed.");
    return { status: "cancelled" };
  }

  return {
    status: "ready",
    context: createProjectContext(
      {
        name,
        framework,
        packageManager,
        styling,
        ...resolveDatabaseIntegration(framework, database),
      },
      baseDirectory,
    ),
  };
}

export type ProjectPromptResult =
  | { readonly status: "ready"; readonly context: ProjectContext }
  | { readonly status: "cancelled" | "invalid" };

export function formatProjectSummary(context: ProjectContext): string {
  return [
    `Project ${context.name}`,
    `Framework ${getOptionLabel(INTEGRATION_OPTIONS.frameworks, context.framework)}`,
    `Package Manager ${getOptionLabel(PACKAGE_MANAGER_OPTIONS, context.packageManager)}`,
    `Database ${getOptionLabel(INTEGRATION_OPTIONS.databases, context.database)}`,
    `ORM ${ORM_LABELS[context.orm]}`,
    `Styling ${getOptionLabel(INTEGRATION_OPTIONS.styling, context.styling)}`,
  ].join("\n");
}

export function registerCreateCommand(program: Command): void {
  program
    .command("create [project-name]")
    .description("Create a new project from a supported stack")
    .action(async (projectName: string | undefined) => {
      const promptResult = await promptForProjectContext(
        projectName,
        process.cwd(),
      );
      if (promptResult.status !== "ready") {
        if (promptResult.status === "invalid") process.exitCode = 1;
        return;
      }
      const { context } = promptResult;

      prompts.note(formatProjectSummary(context), "StackInit");
      const progress = prompts.spinner();

      try {
        const packageManager = createPackageManager(
          context.packageManager,
          new ExecaCommandRunner(),
        );
        const ormAdapter = createOrmAdapter(context.orm, packageManager);
        await setupProject(context, {
          frameworkAdapter: getFrameworkIntegration(
            context.framework,
          ).createAdapter(packageManager),
          ...(ormAdapter ? { ormAdapter } : {}),
          observer: {
            start: (stage) => progress.start(stageStartMessage(stage)),
            complete: (stage) =>
              progress.stop(stageCompleteMessage(stage, context)),
          },
        });

        const setupNote = getDatabaseSetupNote(context.database, packageManager);
        if (setupNote) prompts.note(setupNote.message, setupNote.title);

        prompts.outro(
          `Project ready.\n\ncd ${context.name}\n${packageManager.formatRunCommand("dev")}`,
        );
      } catch (error) {
        const stage = error instanceof ProjectSetupError ? error.stage : undefined;
        progress.error(stageFailureMessage(stage));
        const details = error instanceof Error ? error.message : "Unexpected error.";
        prompts.cancel(
          stage !== undefined && stage !== "framework"
            ? `${stage.startsWith("orm-") ? "The project was created, but the selected data integrations could not be configured." : "The project was created, but StackInit setup could not be completed."}\n\n${details}`
            : details,
        );
        process.exitCode = 1;
        return;
      }
    });
}

const STAGE_MESSAGES: Readonly<
  Record<ProjectSetupStage, { readonly start: string; readonly complete: string }>
> = {
  framework: { start: "Creating project...", complete: "Project scaffold created" },
  "orm-dependencies": {
    start: "Installing ORM dependencies...",
    complete: "ORM dependencies installed",
  },
  "orm-configuration": {
    start: "Configuring data integrations...",
    complete: "Data integrations configured",
  },
  "orm-generation": {
    start: "Generating ORM client...",
    complete: "ORM client generated",
  },
  manifest: {
    start: "Saving StackInit manifest...",
    complete: "StackInit manifest saved",
  },
};

function stageStartMessage(stage: ProjectSetupStage): string {
  return STAGE_MESSAGES[stage].start;
}

function stageCompleteMessage(stage: ProjectSetupStage, context: ProjectContext): string {
  return stage === "framework"
    ? `${getFrameworkIntegration(context.framework).name} project created`
    : STAGE_MESSAGES[stage].complete;
}

function stageFailureMessage(stage: ProjectSetupStage | undefined): string {
  if (stage === "framework" || stage === undefined) return "Project creation failed";
  if (stage.startsWith("orm-")) return "Data integration setup failed";
  return "StackInit manifest could not be saved";
}
