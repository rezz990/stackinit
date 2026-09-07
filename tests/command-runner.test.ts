import { describe, expect, test } from "bun:test";

import { ExecaCommandRunner } from "../src/adapters/execa-command-runner.ts";

describe("ExecaCommandRunner", () => {
  test("captures command output and exit status", async () => {
    const result = await new ExecaCommandRunner().run("bun", [
      "-e",
      'console.log("ready")',
    ]);

    expect(result).toEqual({ exitCode: 0, stdout: "ready", stderr: "" });
  });
});
