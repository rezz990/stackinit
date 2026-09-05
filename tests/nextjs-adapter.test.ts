import { describe, expect, test } from "bun:test";

import { NextjsAdapter } from "../src/adapters/nextjs-adapter.ts";
import type { PackageManager } from "../src/core/package-manager.ts";
import type { PackageManagerId, ProjectContext } from "../src/types/project-context.ts";

class RecordingPackageManager implements PackageManager {
  readonly name = "Test package manager";
  packageName: string | undefined;
  arguments: readonly string[] | undefined;
  error: Error | undefined;

  constructor(readonly id: PackageManagerId = "bun") {}

  isAvailable(): Promise<boolean> {
    return Promise.resolve(true);
  }

  install(_cwd: string): Promise<void> {
    return Promise.resolve();
  }

  add(_packages: readonly string[], _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  addDev(_packages: readonly string[], _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  remove(_packages: readonly string[], _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  run(_script: string, _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  exec(packageName: string, arguments_: readonly string[]): Promise<void> {
    if (this.error !== undefined) return Promise.reject(this.error);
    this.packageName = packageName;
    this.arguments = arguments_;
    return Promise.resolve();
  }

  execute(_binaryName: string, _arguments: readonly string[], _cwd: string): Promise<void> {
    return Promise.resolve();
  }

  formatRunCommand(script: string): string {
    return `test run ${script}`;
  }
}

function context(
  overrides: Partial<Omit<ProjectContext, "database" | "orm">> = {},
): ProjectContext {
  return {
    name: "washflow",
    rootDirectory: "/workspaces/washflow",
    framework: "nextjs",
    packageManager: "bun",
    database: "none",
    orm: "none",
    styling: "tailwind",
    ...overrides,
  };
}

describe("NextjsAdapter", () => {
  test("forwards a non-interactive create-next-app invocation", async () => {
    const packageManager = new RecordingPackageManager();

    await new NextjsAdapter(packageManager).create(context());

    expect(packageManager.packageName).toBe("create-next-app@latest");
    expect(packageManager.arguments).toEqual([
      "/workspaces/washflow",
      "--ts",
      "--eslint",
      "--app",
      "--src-dir",
      "--import-alias",
      "@/*",
      "--use-bun",
      "--tailwind",
      "--yes",
    ]);
  });

  test("disables Tailwind when it is not selected", async () => {
    const packageManager = new RecordingPackageManager();

    await new NextjsAdapter(packageManager).create(
      context({ styling: "none" }),
    );

    expect(packageManager.arguments).toContain("--no-tailwind");
    expect(packageManager.arguments).not.toContain("--tailwind");
  });

  test("rejects a mismatched package manager", async () => {
    const packageManager = new RecordingPackageManager("pnpm");

    await expect(
      new NextjsAdapter(packageManager).create(context()),
    ).rejects.toThrow('Package manager "pnpm" does not match');
  });

  test("propagates package manager errors", async () => {
    const packageManager = new RecordingPackageManager();
    packageManager.error = new Error("generator failed");

    await expect(
      new NextjsAdapter(packageManager).create(context()),
    ).rejects.toThrow("generator failed");
  });
});
