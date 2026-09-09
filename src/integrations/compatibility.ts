import type { FrameworkCapabilities } from "../core/framework-adapter.ts";
import type {
  DatabaseId,
  Framework,
  OrmId,
  ProjectSpec,
  Styling,
} from "../types/project-context.ts";
import {
  DATABASE_DEFINITIONS,
  FRAMEWORK_DEFINITIONS,
  ORM_DEFINITIONS,
} from "./catalog.ts";

export type DataSelection = {
  readonly database: DatabaseId;
  readonly orm: OrmId;
};

export class IncompatibleProjectSpecError extends Error {
  constructor(
    readonly field: "framework" | "styling" | "database" | "orm",
    message: string,
  ) {
    super(message);
    this.name = "IncompatibleProjectSpecError";
  }
}

export function resolveDataSelection(
  framework: Framework,
  database: DatabaseId,
): DataSelection {
  if (database === "none") return { database, orm: "none" };

  const databaseDefinition = DATABASE_DEFINITIONS.find(
    (candidate) => candidate.id === database,
  );
  if (!databaseDefinition) {
    throw new IncompatibleProjectSpecError(
      "database",
      `Database integration "${database}" is not registered.`,
    );
  }
  const frameworkDefinition = getFrameworkDefinition(framework);
  if (
    !satisfiesCapabilities(
      frameworkDefinition.capabilities,
      databaseDefinition.requiredCapabilities,
    )
  ) {
    throw new IncompatibleProjectSpecError(
      "database",
      `${databaseDefinition.name} requires a framework with a server runtime.`,
    );
  }
  const orm = ORM_DEFINITIONS.find(
    (candidate) => candidate.id === databaseDefinition.requiredOrm,
  );
  if (!orm?.supportedDatabases.includes(database)) {
    throw new IncompatibleProjectSpecError(
      "orm",
      `${databaseDefinition.name} requires a compatible ${databaseDefinition.requiredOrm} integration.`,
    );
  }
  return { database, orm: databaseDefinition.requiredOrm };
}

export function assertCompatibleProjectSpec(spec: ProjectSpec): void {
  const framework = getFrameworkDefinition(spec.framework);
  if (!framework.supportedStyling.includes(spec.styling)) {
    throw new IncompatibleProjectSpecError(
      "styling",
      `${framework.name} does not support the selected styling integration.`,
    );
  }
  const expectedData = resolveDataSelection(spec.framework, spec.database);
  if (spec.orm !== expectedData.orm) {
    throw new IncompatibleProjectSpecError(
      "orm",
      spec.database === "none"
        ? "Projects without a database cannot select an ORM."
        : `${spec.database} requires the ${expectedData.orm} ORM integration.`,
    );
  }
}

export function getCompatibleDatabaseIds(framework: Framework): readonly DatabaseId[] {
  const compatible = DATABASE_DEFINITIONS.filter((database) => {
    try {
      resolveDataSelection(framework, database.id);
      return true;
    } catch (error) {
      if (error instanceof IncompatibleProjectSpecError) return false;
      throw error;
    }
  }).map(({ id }) => id);
  return [...compatible, "none"];
}

export function getCompatibleStylingIds(framework: Framework): readonly Styling[] {
  return getFrameworkDefinition(framework).supportedStyling;
}

export function satisfiesCapabilities(
  capabilities: FrameworkCapabilities,
  requirements: Partial<FrameworkCapabilities>,
): boolean {
  return Object.entries(requirements).every(
    ([capability, required]) =>
      capabilities[capability as keyof FrameworkCapabilities] === required,
  );
}

function getFrameworkDefinition(framework: Framework) {
  const definition = FRAMEWORK_DEFINITIONS.find(
    (candidate) => candidate.id === framework,
  );
  if (!definition) {
    throw new IncompatibleProjectSpecError(
      "framework",
      `Framework integration "${framework}" is not registered.`,
    );
  }
  return definition;
}
