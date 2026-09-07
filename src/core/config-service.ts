import { randomUUID } from "node:crypto";
import { access, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, parse, resolve } from "node:path";

import {
  type StackInitConfig,
  validateConfig,
} from "./stackinit-config.ts";

export const STACKINIT_CONFIG_FILENAME = ".stackinit.json";

export interface StackInitProjectConfig {
  readonly rootDirectory: string;
  readonly config: StackInitConfig;
}

export class StackInitProjectNotFoundError extends Error {
  constructor() {
    super("This directory is not managed by StackInit.");
    this.name = "StackInitProjectNotFoundError";
  }
}

export class StackInitConfigParseError extends Error {
  constructor() {
    super(
      "Invalid StackInit configuration.\n\n.stackinit.json could not be parsed.",
    );
    this.name = "StackInitConfigParseError";
  }
}

export async function findProjectRoot(
  startDirectory: string = process.cwd(),
): Promise<string> {
  let current = resolve(startDirectory);
  const filesystemRoot = parse(current).root;

  while (true) {
    try {
      await access(join(current, STACKINIT_CONFIG_FILENAME));
      return current;
    } catch {
      if (current === filesystemRoot) throw new StackInitProjectNotFoundError();
      current = dirname(current);
    }
  }
}

export async function readConfig(
  startDirectory: string = process.cwd(),
): Promise<StackInitProjectConfig> {
  const rootDirectory = await findProjectRoot(startDirectory);
  const contents = await readFile(
    join(rootDirectory, STACKINIT_CONFIG_FILENAME),
    "utf8",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new StackInitConfigParseError();
  }

  return { rootDirectory, config: validateConfig(parsed) };
}

export async function writeConfig(
  rootDirectory: string,
  config: StackInitConfig,
): Promise<void> {
  const validated = validateConfig(config);
  const destination = join(rootDirectory, STACKINIT_CONFIG_FILENAME);
  const temporary = join(
    rootDirectory,
    `.${STACKINIT_CONFIG_FILENAME}.${process.pid}.${randomUUID()}.tmp`,
  );
  const serialized = `${JSON.stringify(orderedConfig(validated), null, 2)}\n`;

  try {
    await writeFile(temporary, serialized, { flag: "wx" });
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function orderedConfig(config: StackInitConfig): StackInitConfig {
  const common = {
    $schema: config.$schema,
    version: config.version,
    framework: config.framework,
    packageManager: config.packageManager,
  };
  return config.database === "supabase"
    ? {
        ...common,
        database: "supabase",
        orm: "prisma",
        styling: config.styling,
      }
    : {
        ...common,
        database: "none",
        orm: "none",
        styling: config.styling,
      };
}
