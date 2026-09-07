import type { FrameworkAdapter } from "../core/framework-adapter.ts";
import type { PackageManager } from "../core/package-manager.ts";
import type { ProjectContext } from "../types/project-context.ts";

export class NextjsAdapter implements FrameworkAdapter {
  readonly id = "nextjs";
  readonly name = "Next.js";

  constructor(private readonly packageManager: PackageManager) {}

  async create(context: ProjectContext): Promise<void> {
    if (this.packageManager.id !== context.packageManager) {
      throw new Error(
        `Package manager "${this.packageManager.id}" does not match project configuration "${context.packageManager}".`,
      );
    }

    const generatorArguments = [
      context.rootDirectory,
      "--ts",
      "--eslint",
      "--app",
      "--src-dir",
      "--import-alias",
      "@/*",
      `--use-${context.packageManager}`,
      context.styling === "tailwind" ? "--tailwind" : "--no-tailwind",
      "--yes",
    ];
    await this.packageManager.exec(
      "create-next-app@latest",
      generatorArguments,
    );
  }
}
