import { access } from "node:fs/promises";
import { join } from "node:path";

import {
  failure,
  getDeclaredDependencyVersion,
  success,
  type DoctorCheck,
  type DoctorResult,
} from "../core/doctor.ts";
import type { Framework } from "../types/project-context.ts";

export function createViteDoctor(framework: Extract<Framework, `${string}-vite`>): DoctorCheck {
  const dependency = framework === "react-vite" ? "react" : "vue";
  const name = framework === "react-vite" ? "React" : "Vue";
  return {
    id: `framework.${framework}`,
    async run(context): Promise<readonly DoctorResult[]> {
      const results: DoctorResult[] = [
        getDeclaredDependencyVersion(context.packageJson, "vite")
          ? success(`framework.${framework}.vite`, "Project", "Vite dependency")
          : failure(
              `framework.${framework}.vite`,
              "Project",
              "Vite dependency is missing",
              context.packageManager.formatAddCommand(["vite"], true),
            ),
        getDeclaredDependencyVersion(context.packageJson, dependency)
          ? success(`framework.${framework}.dependency`, "Project", `${name} dependency`)
          : failure(
              `framework.${framework}.dependency`,
              "Project",
              `${name} dependency is missing`,
              context.packageManager.formatAddCommand([dependency]),
            ),
      ];
      try {
        await access(join(context.rootDirectory, "vite.config.ts"));
        results.push(success(`framework.${framework}.config`, "Project", "Vite configuration"));
      } catch {
        results.push(failure(`framework.${framework}.config`, "Project", "Vite configuration is missing"));
      }
      return results;
    },
  };
}
