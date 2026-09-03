import { describe, expect, test } from "bun:test";

import { NextjsAdapter, NextjsCreationError } from "../src/adapters/nextjs-adapter.ts";
import type {
  CommandResult,
  CommandRunner,
  RunCommandOptions,
} from "../src/core/command-runner.ts";
import type { ProjectContext } from "../src/types/project-context.ts";

class RecordingCommandRunner implements CommandRunner {
  command: string | undefined;
  arguments: readonly string[] | undefined;

  constructor(
    private readonly result: CommandResult = {
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
  ) {}

  run(
    command: string,
    arguments_: readonly string[],
    _options?: RunCommandOptions,
  ): Promise<CommandResult> {
    this.command = command;
    this.arguments = arguments_;
    return Promise.resolve(this.result);
  }
}

function context(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    name: "washflow",
    rootDirectory: "/workspaces/washflow",
    framework: "nextjs",
    packageManager: "bun",
    database: "none",
    orm: "none",
    styling: "tailwind",
    ...overrides,
  };
}

describe("NextjsAdapter", () => {
  test("builds a non-interactive Bun create-next-app command", async () => {
    const runner = new RecordingCommandRunner();

    await new NextjsAdapter(runner).create(context());

    expect(runner.command).toBe("bunx");
    expect(runner.arguments).toEqual([
      "create-next-app@latest",
      "/workspaces/washflow",
      "--ts",
      "--eslint",
      "--app",
      "--src-dir",
      "--import-alias",
      "@/*",
      "--use-bun",
      "--tailwind",
      "--yes",
    ]);
  });

  test("disables Tailwind when it is not selected", async () => {
    const runner = new RecordingCommandRunner();

    await new NextjsAdapter(runner).create(context({ styling: "none" }));

    expect(runner.arguments).toContain("--no-tailwind");
    expect(runner.arguments).not.toContain("--tailwind");
  });

  test("uses the selected package manager", async () => {
    const runner = new RecordingCommandRunner();

    await new NextjsAdapter(runner).create(context({ packageManager: "pnpm" }));

    expect(runner.command).toBe("pnpm");
    expect(runner.arguments?.slice(0, 2)).toEqual([
      "dlx",
      "create-next-app@latest",
    ]);
    expect(runner.arguments).toContain("--use-pnpm");
  });

  test("reports generator failures", async () => {
    const runner = new RecordingCommandRunner({
      exitCode: 1,
      stdout: "",
      stderr: "network unavailable",
    });

    await expect(new NextjsAdapter(runner).create(context())).rejects.toEqual(
      new NextjsCreationError("network unavailable"),
    );
  });

  test("propagates command runner errors", async () => {
    const runner: CommandRunner = {
      run: () => Promise.reject(new Error("could not launch bunx")),
    };

    await expect(new NextjsAdapter(runner).create(context())).rejects.toThrow(
      "could not launch bunx",
    );
  });
});
