import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type {
  FrameworkAdapter,
  FrameworkCapabilities,
} from "../core/framework-adapter.ts";
import type { PackageManager } from "../core/package-manager.ts";
import type { ProjectContext } from "../types/project-context.ts";

type ViteFrameworkId = "react-vite" | "vue-vite";

const VITE_FRAMEWORKS = {
  "react-vite": { name: "React + Vite", template: "react-ts", css: "src/index.css" },
  "vue-vite": { name: "Vue + Vite", template: "vue-ts", css: "src/style.css" },
} as const;

export class ViteAdapter implements FrameworkAdapter {
  readonly name: string;
  readonly capabilities: FrameworkCapabilities = {
    client: true,
    server: false,
    typescript: true,
  };

  constructor(
    readonly id: ViteFrameworkId,
    private readonly packageManager: PackageManager,
  ) {
    this.name = VITE_FRAMEWORKS[id].name;
  }

  async create(context: ProjectContext): Promise<void> {
    if (context.framework !== this.id) {
      throw new Error(
        `Framework adapter "${this.id}" cannot create "${context.framework}" projects.`,
      );
    }
    if (context.database !== "none" || context.orm !== "none") {
      throw new Error(`${this.name} does not provide a server runtime for database integrations.`);
    }
    if (this.packageManager.id !== context.packageManager) {
      throw new Error(
        `Package manager "${this.packageManager.id}" does not match project configuration "${context.packageManager}".`,
      );
    }

    const definition = VITE_FRAMEWORKS[this.id];
    await this.packageManager.exec("create-vite@latest", [
      basename(context.rootDirectory),
      "--template",
      definition.template,
      "--no-interactive",
    ], dirname(context.rootDirectory));
    await this.packageManager.install(context.rootDirectory);

    if (context.styling === "tailwind") {
      await this.configureTailwind(context.rootDirectory, definition.css);
    }
  }

  private async configureTailwind(rootDirectory: string, cssPath: string): Promise<void> {
    await this.packageManager.addDev(
      ["tailwindcss@latest", "@tailwindcss/vite@latest"],
      rootDirectory,
    );

    const configPath = join(rootDirectory, "vite.config.ts");
    const config = await readFile(configPath, "utf8");
    const withImport =
      `import tailwindcss from '@tailwindcss/vite'\n${config}`;
    const configured = withImport.replace(
      /plugins:\s*\[([^\]]*)\]/,
      (_match, plugins: string) => `plugins: [${plugins.trim()}, tailwindcss()]`,
    );
    if (configured === withImport) {
      throw new Error("Unable to configure Tailwind CSS in vite.config.ts.");
    }
    await writeFile(configPath, configured, "utf8");

    const stylesheetPath = join(rootDirectory, cssPath);
    const stylesheet = await readFile(stylesheetPath, "utf8");
    await writeFile(stylesheetPath, `@import "tailwindcss";\n\n${stylesheet}`, "utf8");
  }
}
