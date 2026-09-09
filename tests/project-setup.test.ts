import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import type { FrameworkAdapter } from "../src/core/framework-adapter.ts";
import type { OrmAdapter } from "../src/core/orm-adapter.ts";
import {
  ProjectSetupError,
  setupProject,
  type ProjectSetupStage,
} from "../src/core/project-setup.ts";
import type { ProjectContext } from "../src/types/project-context.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function fixture(): Promise<ProjectContext> {
  const parent = await mkdtemp(join(tmpdir(), "stackinit-setup-"));
  temporaryDirectories.push(parent);
  return {
    name: "app",
    rootDirectory: join(parent, "app"),
    framework: "nextjs",
    packageManager: "bun",
    database: "supabase",
    orm: "prisma",
    styling: "tailwind",
  };
}

function adapters(
  events: string[],
  failAt?: string,
): { framework: FrameworkAdapter; orm: OrmAdapter } {
  const operation = async (name: string, context: ProjectContext) => {
    events.push(name);
    if (failAt === name) throw new Error(`${name} failed`);
    if (name === "framework") await mkdir(context.rootDirectory);
  };
  return {
    framework: {
      id: "nextjs",
      name: "Next.js",
      capabilities: { client: true, server: true, typescript: true },
      create: (context) => operation("framework", context),
    },
    orm: {
      id: "prisma",
      name: "Prisma",
      install: (context) => operation("install", context),
      configure: (context) => operation("configure", context),
      generate: (context) => operation("generate", context),
    },
  };
}

describe("project setup pipeline", () => {
  test("runs required stages before writing the manifest", async () => {
    const context = await fixture();
    const events: string[] = [];
    const selected = adapters(events);
    const completed: ProjectSetupStage[] = [];

    await setupProject(context, {
      frameworkAdapter: selected.framework,
      ormAdapter: selected.orm,
      manifestWriter: () => {
        events.push("manifest");
        return Promise.resolve();
      },
      observer: { start: () => undefined, complete: (stage) => completed.push(stage) },
    });

    expect(events).toEqual([
      "framework",
      "install",
      "configure",
      "generate",
      "manifest",
    ]);
    expect(completed).toEqual([
      "framework",
      "orm-dependencies",
      "orm-configuration",
      "orm-generation",
      "manifest",
    ]);
  });

  test("stops after a failed Prisma stage and never writes a manifest", async () => {
    const context = await fixture();
    const events: string[] = [];
    const selected = adapters(events, "install");

    await expect(
      setupProject(context, {
        frameworkAdapter: selected.framework,
        ormAdapter: selected.orm,
        manifestWriter: () => {
          events.push("manifest");
          return Promise.resolve();
        },
      }),
    ).rejects.toEqual(
      new ProjectSetupError("orm-dependencies", new Error("install failed")),
    );
    expect(events).toEqual(["framework", "install"]);
  });

  test("does not run later stages after framework generation fails", async () => {
    const context = await fixture();
    const events: string[] = [];
    const selected = adapters(events, "framework");

    await expect(
      setupProject(context, {
        frameworkAdapter: selected.framework,
        ormAdapter: selected.orm,
        manifestWriter: () => {
          events.push("manifest");
          return Promise.resolve();
        },
      }),
    ).rejects.toBeInstanceOf(ProjectSetupError);
    expect(events).toEqual(["framework"]);
  });
});
