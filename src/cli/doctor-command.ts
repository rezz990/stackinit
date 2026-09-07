import type { Command } from "commander";

import { ExecaCommandRunner } from "../adapters/execa-command-runner.ts";
import type {
  DoctorCategory,
  DoctorReport,
  DoctorResult,
} from "../core/doctor.ts";
import { runDoctor } from "../core/doctor-service.ts";
import { Logger } from "../utils/logger.ts";

const CATEGORY_ORDER: readonly DoctorCategory[] = [
  "Project",
  "Environment",
  "Supabase",
  "Prisma",
];

export function formatDoctorReport(report: DoctorReport): string {
  const lines = ["StackInit Doctor"];
  for (const category of CATEGORY_ORDER) {
    const results = report.results.filter((result) => result.category === category);
    if (results.length === 0) continue;
    lines.push("", category);
    for (const result of results) lines.push(...formatResult(result));
  }

  const errors = report.results.filter((result) => result.severity === "error").length;
  lines.push("", errors === 0 ? "No errors found." : `${errors} ${errors === 1 ? "error" : "errors"} found.`);
  return lines.join("\n");
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check the current StackInit project")
    .action(async () => {
      const report = await runDoctor(process.cwd(), new ExecaCommandRunner());
      new Logger().info(formatDoctorReport(report));
      process.exitCode = report.exitCode;
    });
}

function formatResult(result: DoctorResult): string[] {
  const symbol =
    result.severity === "success"
      ? "✓"
      : result.severity === "warning"
        ? "⚠"
        : "✖";
  return [
    `${symbol} ${result.message}`,
    ...(result.hint ? [`  ${result.hint}`] : []),
  ];
}
