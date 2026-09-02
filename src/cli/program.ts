import { Command } from "commander";

import packageJson from "../../package.json" with { type: "json" };

export function createProgram(): Command {
  return new Command()
    .name("stackinit")
    .description("Bootstrap and manage modern application stacks.")
    .version(packageJson.version);
}
