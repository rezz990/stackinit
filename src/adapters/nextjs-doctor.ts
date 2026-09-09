import { access } from "node:fs/promises";
import { join } from "node:path";

import {
  failure,
  getDeclaredDependencyVersion,
  success,
  type DoctorCheck,
  type DoctorContext,
  type DoctorResult,
} from "../core/doctor.ts";

export const nextjsDoctor: DoctorCheck = {
  id: "framework.nextjs",
  async run(context: DoctorContext): Promise<readonly DoctorResult[]> {
    const results: DoctorResult[] = [];
    results.push(
      getDeclaredDependencyVersion(context.packageJson, "next")
        ? success("framework.nextjs.dependency", "Project", "Next.js dependency")
        : failure(
            "framework.nextjs.dependency",
            "Project",
            "Next.js dependency is missing",
            context.packageManager.formatAddCommand(["next"]),
          ),
    );

    const configNames = ["next.config.ts", "next.config.mjs", "next.config.js"];
    const hasConfig = await anyPathExists(
      configNames.map((name) => join(context.rootDirectory, name)),
    );
    results.push(
      hasConfig
        ? success("framework.nextjs.config", "Project", "Next.js configuration")
        : failure(
            "framework.nextjs.config",
            "Project",
            "Next.js configuration is missing",
          ),
    );
    return results;
  },
};

async function anyPathExists(paths: readonly string[]): Promise<boolean> {
  const results = await Promise.all(
    paths.map(async (path) => {
      try {
        await access(path);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return results.some(Boolean);
}
