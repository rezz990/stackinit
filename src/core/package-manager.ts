import type { PackageManagerId } from "../types/project-context.ts";

export interface PackageManager {
  readonly id: PackageManagerId;
  readonly name: string;

  isAvailable(): Promise<boolean>;
  install(cwd: string): Promise<void>;
  add(packages: readonly string[], cwd: string): Promise<void>;
  addDev(packages: readonly string[], cwd: string): Promise<void>;
  remove(packages: readonly string[], cwd: string): Promise<void>;
  run(script: string, cwd: string): Promise<void>;
  exec(
    packageName: string,
    arguments_: readonly string[],
    cwd?: string,
  ): Promise<void>;
  execute(
    binaryName: string,
    arguments_: readonly string[],
    cwd: string,
    options?: PackageManagerExecutionOptions,
  ): Promise<void>;
  formatRunCommand(script: string): string;
}

export interface PackageManagerExecutionOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
}
