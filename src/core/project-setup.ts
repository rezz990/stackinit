import { writeConfig } from "./config-service.ts";
import { createProject } from "./create-project.ts";
import type { FrameworkAdapter } from "./framework-adapter.ts";
import type { OrmAdapter } from "./orm-adapter.ts";
import { createProjectManifest } from "./project-manifest.ts";
import type { StackInitConfig } from "./stackinit-config.ts";
import type { ProjectContext } from "../types/project-context.ts";

export type ProjectSetupStage =
  | "framework"
  | "orm-dependencies"
  | "orm-configuration"
  | "orm-generation"
  | "manifest";

export interface ProjectSetupObserver {
  start(stage: ProjectSetupStage): void;
  complete(stage: ProjectSetupStage): void;
}

export interface ProjectSetupDependencies {
  readonly frameworkAdapter: FrameworkAdapter;
  readonly ormAdapter?: OrmAdapter;
  readonly observer?: ProjectSetupObserver;
  readonly manifestWriter?: (
    rootDirectory: string,
    config: StackInitConfig,
  ) => Promise<void>;
}

export class ProjectSetupError extends Error {
  constructor(
    readonly stage: ProjectSetupStage,
    override readonly cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : "Unexpected project setup error.");
    this.name = "ProjectSetupError";
  }
}

export async function setupProject(
  context: ProjectContext,
  dependencies: ProjectSetupDependencies,
): Promise<void> {
  await runStage("framework", dependencies, () =>
    createProject(context, dependencies.frameworkAdapter),
  );

  if (context.orm === "prisma") {
    const ormAdapter = dependencies.ormAdapter;
    if (!ormAdapter) {
      throw new ProjectSetupError(
        "orm-dependencies",
        new Error("A Prisma adapter is required for this project."),
      );
    }
    await runStage("orm-dependencies", dependencies, () =>
      ormAdapter.install(context),
    );
    await runStage("orm-configuration", dependencies, () =>
      ormAdapter.configure(context),
    );
    await runStage("orm-generation", dependencies, () =>
      ormAdapter.generate(context),
    );
  }

  await runStage("manifest", dependencies, () =>
    (dependencies.manifestWriter ?? writeConfig)(
      context.rootDirectory,
      createProjectManifest(context),
    ),
  );
}

async function runStage(
  stage: ProjectSetupStage,
  dependencies: ProjectSetupDependencies,
  operation: () => Promise<void>,
): Promise<void> {
  dependencies.observer?.start(stage);
  try {
    await operation();
    dependencies.observer?.complete(stage);
  } catch (error) {
    throw new ProjectSetupError(stage, error);
  }
}
