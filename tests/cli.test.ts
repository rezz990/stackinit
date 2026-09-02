import { describe, expect, test } from "bun:test";

import { createProgram } from "../src/cli/program.ts";

function runCli(arguments_: readonly string[]): string {
  let output = "";
  const program = createProgram();
  program.configureOutput({
    writeOut: (text) => {
      output += text;
    },
  });
  program.exitOverride();

  try {
    program.parse(["bun", "stackinit", ...arguments_]);
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "CommanderError") {
      throw error;
    }
  }

  return output;
}

describe("stackinit CLI", () => {
  test("shows help", () => {
    const output = runCli(["--help"]);

    expect(output).toContain("Usage: stackinit [options]");
    expect(output).toContain("Bootstrap and manage modern application stacks.");
  });

  test("shows the package version", () => {
    expect(runCli(["--version"])).toBe("0.1.0\n");
  });
});
