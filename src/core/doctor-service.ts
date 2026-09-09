import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createPackageManager } from "../adapters/package-manager.ts";
import { packageManagerDoctor } from "../adapters/package-manager-doctor.ts";
import { projectDoctor } from "../adapters/project-doctor.ts";
import {
  getDatabaseDoctor,
  getFrameworkIntegration,
  getOrmDoctor,
  getStylingDoctor,
} from "../integrations/registry.ts";
import type { CommandRunner } from "./command-runner.ts";
import { AdapterRegistry } from "./adapter-registry.ts";
import { findProjectRoot, readConfig } from "./config-service.ts";
import {
  createDoctorReport,
  failure,
  type DoctorCheck,
  type DoctorReport,
} from "./doctor.ts";
import type { StackInitConfig } from "./stackinit-config.ts";

export async function runDoctor(
  startDirectory: string,
  commandRunner: CommandRunner,
  processEnvironment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<DoctorReport> {
  let rootDirectory: string;
  try {
    rootDirectory = await findProjectRoot(startDirectory);
  } catch (error) {
    return createDoctorReport([
      failure(
        "project.manifest.missing",
        "Project",
        error instanceof Error
          ? error.message
          : "StackInit configuration is missing",
      ),
    ]);
  }

  let config: StackInitConfig;
  try {
    ({ config } = await readConfig(rootDirectory));
  } catch (error) {
    return createDoctorReport([
      failure(
        "project.manifest.invalid",
        "Project",
        error instanceof Error
          ? error.message
          : "Invalid StackInit configuration",
      ),
    ]);
  }

  const packageManager = createPackageManager(
    config.packageManager,
    commandRunner,
  );
  const context = {
    rootDirectory,
    config,
    packageJson: await readPackageJson(rootDirectory),
    packageManager,
    environment: await readEnvironment(rootDirectory, processEnvironment),
  };
  const checks = createDoctorChecks(config);
  const nestedResults = await Promise.all(
    checks.map((check) => check.run(context)),
  );
  return createDoctorReport(nestedResults.flat());
}

export function createDoctorChecks(config: StackInitConfig): readonly DoctorCheck[] {
  const stylingDoctor = getStylingDoctor(config.styling);
  const databaseDoctor = getDatabaseDoctor(config.database);
  const ormDoctor = getOrmDoctor(config.orm);
  const registeredChecks = [
    projectDoctor,
    packageManagerDoctor,
    getFrameworkIntegration(config.framework).doctor,
    ...(stylingDoctor ? [stylingDoctor] : []),
    ...(databaseDoctor ? [databaseDoctor] : []),
    ...(ormDoctor ? [ormDoctor] : []),
  ];
  const registry = new AdapterRegistry<DoctorCheck>(registeredChecks);
  return registeredChecks.map((check) => registry.get(check.id));
}

async function readPackageJson(
  rootDirectory: string,
): Promise<Readonly<Record<string, unknown>> | undefined> {
  try {
    const parsed: unknown = JSON.parse(
      await readFile(join(rootDirectory, "package.json"), "utf8"),
    );
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Readonly<Record<string, unknown>>)
      : undefined;
  } catch {
    return undefined;
  }
}

async function readEnvironment(
  rootDirectory: string,
  processEnvironment: Readonly<Record<string, string | undefined>>,
): Promise<Readonly<Record<string, string | undefined>>> {
  let fileEnvironment: Record<string, string> = {};
  try {
    fileEnvironment = parseEnvironmentFile(
      await readFile(join(rootDirectory, ".env"), "utf8"),
    );
  } catch {
    // A missing .env is represented by missing values in the returned object.
  }
  return {
    DATABASE_URL:
      fileEnvironment.DATABASE_URL ?? processEnvironment.DATABASE_URL,
    DIRECT_URL: fileEnvironment.DIRECT_URL ?? processEnvironment.DIRECT_URL,
  };
}

function parseEnvironmentFile(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = /^\s*(DATABASE_URL|DIRECT_URL)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1] || match[2] === undefined) continue;
    const rawValue = match[2].trim();
    values[match[1]] =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
  }
  return values;
}
