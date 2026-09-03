import type { CommandRunner } from "../core/command-runner.ts";
import type { PackageManager } from "../core/package-manager.ts";
import type { PackageManagerId } from "../types/project-context.ts";

interface PackageManagerCommands {
  readonly name: string;
  readonly install: readonly string[];
  readonly add: readonly string[];
  readonly addDev: readonly string[];
  readonly remove: readonly string[];
  readonly run: readonly string[];
  readonly exec: readonly string[];
}

const PACKAGE_MANAGER_COMMANDS: Readonly<
  Record<PackageManagerId, PackageManagerCommands>
> = {
  bun: {
    name: "Bun",
    install: ["install"],
    add: ["add"],
    addDev: ["add", "-d"],
    remove: ["remove"],
    run: ["run"],
    exec: [],
  },
  npm: {
    name: "npm",
    install: ["install"],
    add: ["install"],
    addDev: ["install", "-D"],
    remove: ["uninstall"],
    run: ["run"],
    exec: ["--yes"],
  },
  pnpm: {
    name: "pnpm",
    install: ["install"],
    add: ["add"],
    addDev: ["add", "-D"],
    remove: ["remove"],
    run: ["run"],
    exec: ["dlx"],
  },
  yarn: {
    name: "Yarn",
    install: ["install"],
    add: ["add"],
    addDev: ["add", "-D"],
    remove: ["remove"],
    run: ["run"],
    exec: ["dlx"],
  },
};

const EXECUTABLES: Readonly<Record<PackageManagerId, string>> = {
  bun: "bun",
  npm: "npm",
  pnpm: "pnpm",
  yarn: "yarn",
};

const EXEC_EXECUTABLES: Readonly<Record<PackageManagerId, string>> = {
  bun: "bunx",
  npm: "npx",
  pnpm: "pnpm",
  yarn: "yarn",
};

export class PackageManagerUnavailableError extends Error {
  constructor(readonly packageManagerId: PackageManagerId) {
    super(
      `Selected package manager "${packageManagerId}" is not installed.\n\nInstall ${packageManagerId} or choose another package manager.`,
    );
    this.name = "PackageManagerUnavailableError";
  }
}

export class UnsupportedYarnVersionError extends Error {
  constructor(readonly version: string) {
    super(
      `Yarn ${version} does not support "yarn dlx".\n\nUse Yarn 2 or newer, or choose another package manager.`,
    );
    this.name = "UnsupportedYarnVersionError";
  }
}

export class PackageManagerCommandError extends Error {
  constructor(
    readonly command: string,
    readonly details: string,
  ) {
    super(
      details.length === 0
        ? `Command failed: ${command}`
        : `Command failed: ${command}\n\n${details}`,
    );
    this.name = "PackageManagerCommandError";
  }
}

export class CommandPackageManager implements PackageManager {
  readonly name: string;
  readonly #commands: PackageManagerCommands;
  #version: Promise<string | undefined> | undefined;

  constructor(
    readonly id: PackageManagerId,
    private readonly commandRunner: CommandRunner,
  ) {
    this.#commands = PACKAGE_MANAGER_COMMANDS[id];
    this.name = this.#commands.name;
  }

  async isAvailable(): Promise<boolean> {
    return (await this.#getVersion()) !== undefined;
  }

  async install(cwd: string): Promise<void> {
    await this.#execute(EXECUTABLES[this.id], this.#commands.install, cwd);
  }

  async add(packages: readonly string[], cwd: string): Promise<void> {
    await this.#execute(
      EXECUTABLES[this.id],
      [...this.#commands.add, ...packages],
      cwd,
    );
  }

  async addDev(packages: readonly string[], cwd: string): Promise<void> {
    await this.#execute(
      EXECUTABLES[this.id],
      [...this.#commands.addDev, ...packages],
      cwd,
    );
  }

  async remove(packages: readonly string[], cwd: string): Promise<void> {
    await this.#execute(
      EXECUTABLES[this.id],
      [...this.#commands.remove, ...packages],
      cwd,
    );
  }

  async run(script: string, cwd: string): Promise<void> {
    await this.#execute(
      EXECUTABLES[this.id],
      [...this.#commands.run, script],
      cwd,
    );
  }

  async exec(
    packageName: string,
    arguments_: readonly string[],
    cwd?: string,
  ): Promise<void> {
    const version = await this.#requireVersion();
    if (this.id === "yarn" && Number.parseInt(version, 10) < 2) {
      throw new UnsupportedYarnVersionError(version);
    }

    await this.#run(
      EXEC_EXECUTABLES[this.id],
      [...this.#commands.exec, packageName, ...arguments_],
      cwd,
    );
  }

  formatRunCommand(script: string): string {
    return [EXECUTABLES[this.id], ...this.#commands.run, script].join(" ");
  }

  async #execute(
    executable: string,
    arguments_: readonly string[],
    cwd: string,
  ): Promise<void> {
    await this.#requireVersion();
    await this.#run(executable, arguments_, cwd);
  }

  async #run(
    executable: string,
    arguments_: readonly string[],
    cwd: string | undefined,
  ): Promise<void> {
    const result = await this.commandRunner.run(executable, arguments_, {
      ...(cwd === undefined ? {} : { cwd }),
    });
    if (result.exitCode !== 0) {
      throw new PackageManagerCommandError(
        [executable, ...arguments_].join(" "),
        result.stderr.trim(),
      );
    }
  }

  async #requireVersion(): Promise<string> {
    const version = await this.#getVersion();
    if (version === undefined) throw new PackageManagerUnavailableError(this.id);
    return version;
  }

  #getVersion(): Promise<string | undefined> {
    this.#version ??= this.#detectVersion();
    return this.#version;
  }

  async #detectVersion(): Promise<string | undefined> {
    try {
      const result = await this.commandRunner.run(EXECUTABLES[this.id], [
        "--version",
      ]);
      return result.exitCode === 0 ? result.stdout.trim() : undefined;
    } catch {
      return undefined;
    }
  }
}

export function createPackageManager(
  id: PackageManagerId,
  commandRunner: CommandRunner,
): PackageManager {
  return new CommandPackageManager(id, commandRunner);
}
