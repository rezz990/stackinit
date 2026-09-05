import { describe, expect, test } from "bun:test";

import {
  CommandPackageManager,
  PackageManagerCommandError,
  PackageManagerUnavailableError,
  UnsupportedYarnVersionError,
} from "../src/adapters/package-manager.ts";
import type {
  CommandResult,
  CommandRunner,
  RunCommandOptions,
} from "../src/core/command-runner.ts";

type RecordedCall = {
  readonly command: string;
  readonly arguments: readonly string[];
  readonly options: RunCommandOptions | undefined;
};

class RecordingCommandRunner implements CommandRunner {
  readonly calls: RecordedCall[] = [];

  constructor(
    private readonly version = "10.0.0",
    private readonly commandResult: CommandResult = {
      exitCode: 0,
      stdout: "",
      stderr: "",
    },
  ) {}

  run(
    command: string,
    arguments_: readonly string[],
    options?: RunCommandOptions,
  ): Promise<CommandResult> {
    this.calls.push({ command, arguments: arguments_, options });
    if (arguments_.length === 1 && arguments_[0] === "--version") {
      return Promise.resolve({
        exitCode: 0,
        stdout: this.version,
        stderr: "",
      });
    }
    return Promise.resolve(this.commandResult);
  }
}

function lastCall(runner: RecordingCommandRunner): RecordedCall {
  const call = runner.calls.at(-1);
  if (call === undefined) throw new Error("Expected a recorded command");
  return call;
}

describe("CommandPackageManager", () => {
  test.each([
    ["bun", "bun", ["install"]],
    ["npm", "npm", ["install"]],
    ["pnpm", "pnpm", ["install"]],
    ["yarn", "yarn", ["install"]],
  ] as const)("generates %s install commands", async (id, command, arguments_) => {
    const runner = new RecordingCommandRunner();
    const packageManager = new CommandPackageManager(id, runner);

    await packageManager.install("/project");

    expect(lastCall(runner)).toEqual({
      command,
      arguments: arguments_,
      options: { cwd: "/project" },
    });
  });

  test.each([
    ["bun", "bunx", ["prisma", "generate"]],
    ["npm", "npx", ["--no-install", "prisma", "generate"]],
    ["pnpm", "pnpm", ["exec", "prisma", "generate"]],
    ["yarn", "yarn", ["exec", "prisma", "generate"]],
  ] as const)("executes local binaries with %s", async (id, command, arguments_) => {
    const runner = new RecordingCommandRunner("4.0.0");
    const packageManager = new CommandPackageManager(id, runner);

    await packageManager.execute("prisma", ["generate"], "/project");

    expect(lastCall(runner)).toEqual({
      command,
      arguments: arguments_,
      options: { cwd: "/project" },
    });
  });

  test("generates dependency lifecycle commands", async () => {
    const runner = new RecordingCommandRunner();
    const packageManager = new CommandPackageManager("npm", runner);

    await packageManager.add(["zod", "react"], "/project");
    expect(lastCall(runner).arguments).toEqual(["install", "zod", "react"]);

    await packageManager.addDev(["typescript"], "/project");
    expect(lastCall(runner).arguments).toEqual(["install", "-D", "typescript"]);

    await packageManager.remove(["zod"], "/project");
    expect(lastCall(runner).arguments).toEqual(["uninstall", "zod"]);

    await packageManager.run("build", "/project");
    expect(lastCall(runner).arguments).toEqual(["run", "build"]);
  });

  test.each([
    ["bun", "bunx", ["tool", "--flag"]],
    ["npm", "npx", ["--yes", "tool", "--flag"]],
    ["pnpm", "pnpm", ["dlx", "tool", "--flag"]],
    ["yarn", "yarn", ["dlx", "tool", "--flag"]],
  ] as const)("forwards %s exec arguments", async (id, command, arguments_) => {
    const runner = new RecordingCommandRunner("4.0.0");
    const packageManager = new CommandPackageManager(id, runner);

    await packageManager.exec("tool", ["--flag"], "/project");

    expect(lastCall(runner)).toEqual({
      command,
      arguments: arguments_,
      options: { cwd: "/project" },
    });
  });

  test("checks executable availability and caches the result", async () => {
    const runner = new RecordingCommandRunner("1.2.3");
    const packageManager = new CommandPackageManager("bun", runner);

    expect(await packageManager.isAvailable()).toBe(true);
    expect(await packageManager.isAvailable()).toBe(true);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]).toEqual({
      command: "bun",
      arguments: ["--version"],
      options: undefined,
    });
  });

  test("reports an unavailable executable before running a command", async () => {
    const runner: CommandRunner = {
      run: () => Promise.reject(new Error("ENOENT")),
    };
    const packageManager = new CommandPackageManager("pnpm", runner);

    expect(await packageManager.isAvailable()).toBe(false);
    await expect(packageManager.install("/project")).rejects.toEqual(
      new PackageManagerUnavailableError("pnpm"),
    );
  });

  test("reports failed package manager commands", async () => {
    const runner = new RecordingCommandRunner("1.2.3", {
      exitCode: 1,
      stdout: "",
      stderr: "registry unavailable",
    });
    const packageManager = new CommandPackageManager("bun", runner);

    await expect(packageManager.add(["zod"], "/project")).rejects.toEqual(
      new PackageManagerCommandError("bun add zod", "registry unavailable"),
    );
  });

  test("rejects yarn classic for dlx with a clear error", async () => {
    const runner = new RecordingCommandRunner("1.22.22");
    const packageManager = new CommandPackageManager("yarn", runner);

    await expect(packageManager.exec("tool", [])).rejects.toEqual(
      new UnsupportedYarnVersionError("1.22.22"),
    );
  });

  test("formats run commands centrally", () => {
    const runner = new RecordingCommandRunner();

    expect(new CommandPackageManager("bun", runner).formatRunCommand("dev")).toBe(
      "bun run dev",
    );
    expect(new CommandPackageManager("npm", runner).formatRunCommand("dev")).toBe(
      "npm run dev",
    );
  });
});
