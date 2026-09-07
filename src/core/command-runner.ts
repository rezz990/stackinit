export interface RunCommandOptions {
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

export interface CommandResult {
  readonly exitCode: number | undefined;
  readonly stdout: string;
  readonly stderr: string;
}

export interface CommandRunner {
  run(
    command: string,
    arguments_: readonly string[],
    options?: RunCommandOptions,
  ): Promise<CommandResult>;
}
