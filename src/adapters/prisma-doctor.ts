import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  failure,
  getDeclaredDependencyVersion,
  success,
  type DoctorCheck,
  type DoctorContext,
  type DoctorResult,
} from "../core/doctor.ts";

const REQUIRED_PACKAGES = [
  { name: "prisma", label: "Prisma", development: true },
  { name: "@prisma/client", label: "Prisma Client", development: false },
  { name: "@prisma/adapter-pg", label: "PostgreSQL adapter", development: false },
  { name: "pg", label: "PostgreSQL driver", development: false },
] as const;

export const prismaDoctor: DoctorCheck = {
  id: "orm.prisma",
  async run(context: DoctorContext): Promise<readonly DoctorResult[]> {
    const results: DoctorResult[] = REQUIRED_PACKAGES.map((dependency) => {
      const version = getDeclaredDependencyVersion(
        context.packageJson,
        dependency.name,
      );
      return version
        ? success(
            `prisma.dependency.${dependency.name}`,
            "Prisma",
            `${dependency.label} installed`,
          )
        : failure(
            `prisma.dependency.${dependency.name}`,
            "Prisma",
            `${dependency.name} is missing`,
            context.packageManager.formatAddCommand(
              [dependency.name],
              dependency.development,
            ),
          );
    });

    results.push(await checkPrismaConfig(context));
    results.push(await checkPrismaSchema(context));
    results.push(
      await checkFile(
        join(context.rootDirectory, "src", "lib", "prisma.ts"),
        "prisma.runtime-client",
        "Runtime Prisma client",
      ),
    );
    results.push(await checkGeneratedClient(context));
    results.push(checkVersionConsistency(context));
    return results;
  },
};

async function checkPrismaConfig(context: DoctorContext): Promise<DoctorResult> {
  try {
    const contents = await readFile(
      join(context.rootDirectory, "prisma.config.ts"),
      "utf8",
    );
    return contents.includes('env("DIRECT_URL")')
      ? success("prisma.config", "Prisma", "Prisma configuration")
      : failure(
          "prisma.config",
          "Prisma",
          "Prisma configuration does not use DIRECT_URL",
        );
  } catch {
    return failure("prisma.config", "Prisma", "Prisma configuration is missing");
  }
}

async function checkPrismaSchema(context: DoctorContext): Promise<DoctorResult> {
  try {
    const contents = await readFile(
      join(context.rootDirectory, "prisma", "schema.prisma"),
      "utf8",
    );
    const datasource = findPrismaBlock(contents, "datasource", "db");
    const provider = datasource ? findPrismaProperty(datasource, "provider") : undefined;
    return provider === "postgresql"
      ? success("prisma.schema", "Prisma", "Prisma PostgreSQL schema")
      : failure(
          "prisma.schema",
          "Prisma",
          "Prisma datasource provider must be PostgreSQL",
        );
  } catch {
    return failure("prisma.schema", "Prisma", "Prisma schema is missing");
  }
}

async function checkGeneratedClient(context: DoctorContext): Promise<DoctorResult> {
  try {
    const entries = await readdir(
      join(context.rootDirectory, "src", "generated", "prisma"),
    );
    return entries.length > 0
      ? success("prisma.generated-client", "Prisma", "Generated Prisma Client")
      : failure(
          "prisma.generated-client",
          "Prisma",
          "Generated Prisma Client is missing",
          context.packageManager.formatExecuteCommand("prisma", ["generate"]),
        );
  } catch {
    return failure(
      "prisma.generated-client",
      "Prisma",
      "Generated Prisma Client is missing",
      context.packageManager.formatExecuteCommand("prisma", ["generate"]),
    );
  }
}

function checkVersionConsistency(context: DoctorContext): DoctorResult {
  const packages = ["prisma", "@prisma/client", "@prisma/adapter-pg"] as const;
  const majors = packages
    .map((name) => majorVersion(getDeclaredDependencyVersion(context.packageJson, name)))
    .filter((major): major is number => major !== undefined);
  return new Set(majors).size <= 1
    ? success("prisma.version-consistency", "Prisma", "Prisma package versions")
    : failure(
        "prisma.version-consistency",
        "Prisma",
        "Prisma package versions are inconsistent",
        "Align prisma, @prisma/client, and @prisma/adapter-pg to the same major version.",
      );
}

async function checkFile(
  path: string,
  id: string,
  message: string,
): Promise<DoctorResult> {
  try {
    await access(path);
    return success(id, "Prisma", message);
  } catch {
    return failure(id, "Prisma", `${message} is missing`);
  }
}

function majorVersion(version: string | undefined): number | undefined {
  const match = version?.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function findPrismaBlock(
  source: string,
  kind: string,
  name: string,
): string | undefined {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const header = new RegExp(`\\b${kind}\\s+${name}\\s*\\{`, "g").exec(
    withoutComments,
  );
  if (!header) return undefined;
  const start = header.index + header[0].length;
  let depth = 1;
  for (let index = start; index < withoutComments.length; index += 1) {
    if (withoutComments[index] === "{") depth += 1;
    if (withoutComments[index] === "}") depth -= 1;
    if (depth === 0) return withoutComments.slice(start, index);
  }
  return undefined;
}

function findPrismaProperty(block: string, property: string): string | undefined {
  for (const line of block.split(/\r?\n/)) {
    const [key, rawValue] = line.split("=", 2).map((part) => part?.trim());
    if (key === property && rawValue) return rawValue.replace(/^"|"$/g, "");
  }
  return undefined;
}
