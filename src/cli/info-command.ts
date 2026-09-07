import type { Command } from "commander";

import { readConfig } from "../core/config-service.ts";
import { PACKAGE_MANAGER_OPTIONS } from "../core/package-manager-options.ts";
import { getOptionLabel } from "../core/project-option.ts";
import type { StackInitConfig } from "../core/stackinit-config.ts";
import { INTEGRATION_OPTIONS, ORM_LABELS } from "../integrations/registry.ts";
import { Logger } from "../utils/logger.ts";

export function formatProjectInfo(config: StackInitConfig): string {
  const styling = config.styling.includes("tailwind") ? "Tailwind CSS" : "None";
  return [
    "StackInit Project",
    "",
    `Framework        ${getOptionLabel(INTEGRATION_OPTIONS.frameworks, config.framework)}`,
    `Package Manager  ${getOptionLabel(PACKAGE_MANAGER_OPTIONS, config.packageManager)}`,
    `Database         ${getOptionLabel(INTEGRATION_OPTIONS.databases, config.database)}`,
    `ORM              ${ORM_LABELS[config.orm]}`,
    `Styling          ${styling}`,
  ].join("\n");
}

export async function showProjectInfo(
  directory: string,
  logger: Logger,
): Promise<boolean> {
  try {
    const { config } = await readConfig(directory);
    logger.info(formatProjectInfo(config));
    return true;
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "Unable to read project configuration.");
    return false;
  }
}

export function registerInfoCommand(program: Command): void {
  program
    .command("info")
    .description("Show the current StackInit project configuration")
    .action(async () => {
      const success = await showProjectInfo(process.cwd(), new Logger());
      if (!success) process.exitCode = 1;
    });
}
