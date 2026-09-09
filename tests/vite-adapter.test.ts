import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ViteAdapter } from "../src/adapters/vite-adapter.ts";
import type { PackageManager } from "../src/core/package-manager.ts";
import type { PackageManagerId, ProjectContext } from "../src/types/project-context.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

class RecordingPackageManager implements PackageManager {
  readonly name = "Test";
  readonly calls: string[] = [];
  constructor(readonly id: PackageManagerId, private readonly scaffold: () => Promise<void>) {}
  isAvailable(): Promise<boolean> { return Promise.resolve(true); }
  install(cwd: string): Promise<void> { this.calls.push(`install:${cwd}`); return Promise.resolve(); }
  add(): Promise<void> { return Promise.resolve(); }
  addDev(packages: readonly string[], cwd: string): Promise<void> {
    this.calls.push(`addDev:${packages.join(",")}:${cwd}`);
    return Promise.resolve();
  }
  remove(): Promise<void> { return Promise.resolve(); }
  run(): Promise<void> { return Promise.resolve(); }
  async exec(packageName: string, arguments_: readonly string[], cwd?: string): Promise<void> {
    this.calls.push(`exec:${packageName}:${arguments_.join("|")}:${cwd ?? ""}`);
    await this.scaffold();
  }
  execute(): Promise<void> { return Promise.resolve(); }
  formatRunCommand(script: string): string { return `${this.id} run ${script}`; }
  formatAddCommand(packages: readonly string[]): string { return `${this.id} add ${packages.join(" ")}`; }
  formatExecuteCommand(binary: string, arguments_: readonly string[]): string {
    return `${this.id} ${binary} ${arguments_.join(" ")}`;
  }
}

async function fixture(framework: "react-vite" | "vue-vite", styling: "tailwind" | "none") {
  const parent = await mkdtemp(join(tmpdir(), "stackinit-vite-"));
  temporaryDirectories.push(parent);
  const root = join(parent, "app");
  const css = framework === "react-vite" ? "src/index.css" : "src/style.css";
  const plugin = framework === "react-vite" ? "react" : "vue";
  const packageManager = new RecordingPackageManager("npm", async () => {
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "vite.config.ts"),
      `import ${plugin} from '@vitejs/plugin-${plugin}'\nimport { defineConfig } from 'vite'\nexport default defineConfig({ plugins: [${plugin}()] })\n`,
    );
    await writeFile(join(root, css), "body { margin: 0; }\n");
  });
  const context: ProjectContext = {
    name: "app",
    rootDirectory: root,
    framework,
    packageManager: "npm",
    database: "none",
    orm: "none",
    styling,
  };
  return { root, css, context, packageManager };
}

describe("ViteAdapter", () => {
  test("creates React TypeScript and configures current Tailwind Vite integration", async () => {
    const { root, css, context, packageManager } = await fixture("react-vite", "tailwind");
    await new ViteAdapter("react-vite", packageManager).create(context);

    expect(packageManager.calls[0]).toContain("create-vite@latest");
    expect(packageManager.calls[0]).toContain("--template|react-ts|--no-interactive");
    expect(packageManager.calls).toContain(`install:${root}`);
    expect(packageManager.calls).toContain(
      `addDev:tailwindcss@latest,@tailwindcss/vite@latest:${root}`,
    );
    expect(await readFile(join(root, "vite.config.ts"), "utf8")).toContain("tailwindcss()");
    expect(await readFile(join(root, css), "utf8")).toStartWith('@import "tailwindcss";');
  });

  test("creates Vue TypeScript without styling dependencies when None is selected", async () => {
    const { context, packageManager } = await fixture("vue-vite", "none");
    await new ViteAdapter("vue-vite", packageManager).create(context);

    expect(packageManager.calls[0]).toContain("--template|vue-ts|--no-interactive");
    expect(packageManager.calls.some((call) => call.startsWith("addDev:"))).toBe(false);
  });
});
