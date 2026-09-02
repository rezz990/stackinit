import { execa } from "execa";

import type {
  CommandResult,
  CommandRunner,
  RunCommandOptions,
} from "../core/command-runner.ts";

export class ExecaCommandRunner implements CommandRunner {
  async run(
    command: string,
    arguments_: readonly string[],
    options: RunCommandOptions = {},
  ): Promise<CommandResult> {
    const result = await execa(command, arguments_, {
      ...(options.cwd === undefined ? {} : { cwd: options.cwd }),
      ...(options.env === undefined ? {} : { env: options.env }),
      reject: false,
    });

    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  }
}
