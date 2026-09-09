import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  failure,
  getDeclaredDependencyVersion,
  success,
  type DoctorCheck,
  type DoctorResult,
} from "../core/doctor.ts";

export const tailwindDoctor: DoctorCheck = {
  id: "styling.tailwind",
  async run(context): Promise<readonly DoctorResult[]> {
    const results: DoctorResult[] = [
      getDeclaredDependencyVersion(context.packageJson, "tailwindcss")
        ? success("styling.tailwind.dependency", "Project", "Tailwind CSS dependency")
        : failure(
            "styling.tailwind.dependency",
            "Project",
            "Tailwind CSS dependency is missing",
            context.packageManager.formatAddCommand(["tailwindcss"], true),
          ),
    ];

    if (context.config.framework === "nextjs") return results;

    results.push(
      getDeclaredDependencyVersion(context.packageJson, "@tailwindcss/vite")
        ? success("styling.tailwind.vite-plugin", "Project", "Tailwind Vite plugin")
        : failure(
            "styling.tailwind.vite-plugin",
            "Project",
            "Tailwind Vite plugin is missing",
            context.packageManager.formatAddCommand(["@tailwindcss/vite"], true),
          ),
    );

    const config = await readText(join(context.rootDirectory, "vite.config.ts"));
    results.push(
      config?.includes("tailwindcss()")
        ? success("styling.tailwind.vite-config", "Project", "Tailwind Vite configuration")
        : failure(
            "styling.tailwind.vite-config",
            "Project",
            "Tailwind is not configured in vite.config.ts",
          ),
    );

    const stylesheet = context.config.framework === "react-vite"
      ? "src/index.css"
      : "src/style.css";
    const css = await readText(join(context.rootDirectory, stylesheet));
    results.push(
      css?.includes('@import "tailwindcss"') || css?.includes("@import 'tailwindcss'")
        ? success("styling.tailwind.stylesheet", "Project", "Tailwind stylesheet import")
        : failure(
            "styling.tailwind.stylesheet",
            "Project",
            "Tailwind is not imported by the application stylesheet",
          ),
    );
    return results;
  },
};

async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}
