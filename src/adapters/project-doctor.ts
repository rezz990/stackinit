import { access } from "node:fs/promises";
import { join } from "node:path";

import {
  failure,
  success,
  type DoctorCheck,
  type DoctorContext,
  type DoctorResult,
} from "../core/doctor.ts";

export const projectDoctor: DoctorCheck = {
  id: "project",
  async run(context: DoctorContext): Promise<readonly DoctorResult[]> {
    const results: DoctorResult[] = [
      success("project.manifest", "Project", "StackInit configuration"),
    ];
    results.push(
      context.packageJson
        ? success("project.package-json", "Project", "package.json")
        : failure(
            "project.package-json",
            "Project",
            "package.json is missing or invalid",
          ),
    );

    try {
      await access(join(context.rootDirectory, "node_modules"));
      results.push(
        success("project.dependencies-installed", "Project", "Dependencies installed"),
      );
    } catch {
      results.push(
        failure(
          "project.dependencies-installed",
          "Project",
          "Dependencies are not installed",
          `Run ${context.packageManager.name}'s install command in the project root.`,
        ),
      );
    }
    return results;
  },
};
