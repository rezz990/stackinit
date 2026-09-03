import type { CommandRunner } from "../core/command-runner.ts";
import type { FrameworkAdapter } from "../core/framework-adapter.ts";
import type { PackageManager, ProjectContext } from "../types/project-context.ts";

interface GeneratorInvocation {
  readonly command: string;
  readonly arguments: readonly string[];
}

const packageManagerLaunchers: Readonly<
  Record<
    PackageManager,
    (generatorArguments: readonly string[]) => GeneratorInvocation
  >
> = {
  bun: (generatorArguments) => ({
    command: "bunx",
    arguments: ["create-next-app@latest", ...generatorArguments],
  }),
  npm: (generatorArguments) => ({
    command: "npx",
    arguments: ["--yes", "create-next-app@latest", ...generatorArguments],
  }),
  pnpm: (generatorArguments) => ({
    command: "pnpm",
    arguments: ["dlx", "create-next-app@latest", ...generatorArguments],
  }),
  yarn: (generatorArguments) => ({
    command: "yarn",
    arguments: ["dlx", "create-next-app@latest", ...generatorArguments],
  }),
};

export class NextjsCreationError extends Error {
  constructor(readonly details: string) {
    super(
      details.length === 0
        ? "create-next-app failed. Check your connection and try again."
        : `create-next-app failed.\n\n${details}`,
    );
    this.name = "NextjsCreationError";
  }
}

export class NextjsAdapter implements FrameworkAdapter {
  readonly id = "nextjs";
  readonly name = "Next.js";

  constructor(private readonly commandRunner: CommandRunner) {}

  async create(context: ProjectContext): Promise<void> {
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
    const invocation = packageManagerLaunchers[context.packageManager](
      generatorArguments,
    );
    const result = await this.commandRunner.run(
      invocation.command,
      invocation.arguments,
    );

    if (result.exitCode !== 0) {
      throw new NextjsCreationError(result.stderr.trim());
    }
  }
}
