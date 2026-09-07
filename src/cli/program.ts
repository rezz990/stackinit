import { Command } from "commander";

import packageJson from "../../package.json" with { type: "json" };
import { registerCreateCommand } from "./create-command.ts";
import { registerDoctorCommand } from "./doctor-command.ts";
import { registerInfoCommand } from "./info-command.ts";

export function createProgram(): Command {
  const program = new Command()
    .name("stackinit")
    .description("Bootstrap and manage modern application stacks.")
    .version(packageJson.version);

  registerCreateCommand(program);
  registerInfoCommand(program);
  registerDoctorCommand(program);
  return program;
}
