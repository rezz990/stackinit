import { describe, expect, test } from "bun:test";

import {
  assertValidDatabaseConfig,
  createProjectContext,
  validateProjectName,
} from "../src/core/project-configuration.ts";

describe("project configuration", () => {
  test("validates project names", () => {
    expect(validateProjectName("washflow")).toBeUndefined();
    expect(validateProjectName("wash-flow-2")).toBeUndefined();
    expect(validateProjectName("")).toBe("Project name is required.");
    expect(validateProjectName("WashFlow")).toBe(
      "Project name must be lowercase.",
    );
    expect(validateProjectName("wash flow")).toContain("lowercase letters");
    expect(validateProjectName("-washflow")).toContain("do not start or end");
  });

  test("creates a normalized ProjectContext", () => {
    const context = createProjectContext(
      {
        name: " washflow ",
        framework: "nextjs",
        packageManager: "bun",
        database: "supabase",
        styling: "tailwind",
      },
      "/workspaces",
    );

    expect(context).toEqual({
      name: "washflow",
      rootDirectory: "/workspaces/washflow",
      framework: "nextjs",
      packageManager: "bun",
      database: "supabase",
      orm: "prisma",
      styling: "tailwind",
    });
  });

  test("maps Supabase to Prisma", () => {
    const context = createProjectContext(
      {
        name: "washflow",
        framework: "nextjs",
        packageManager: "npm",
        database: "supabase",
        styling: "none",
      },
      "/workspaces",
    );

    expect(context.orm).toBe("prisma");
  });

  test("maps no database to no ORM", () => {
    const context = createProjectContext(
      {
        name: "washflow",
        framework: "nextjs",
        packageManager: "npm",
        database: "none",
        styling: "none",
      },
      "/workspaces",
    );

    expect(context.orm).toBe("none");
  });

  test("rejects impossible database and ORM combinations", () => {
    expect(() =>
      assertValidDatabaseConfig({ database: "none", orm: "prisma" }),
    ).toThrow("none requires no ORM");
    expect(() =>
      assertValidDatabaseConfig({ database: "supabase", orm: "none" }),
    ).toThrow("supabase requires Prisma");
  });

  test("rejects an invalid name when creating the context", () => {
    expect(() =>
      createProjectContext(
        {
          name: "Invalid Name",
          framework: "nextjs",
          packageManager: "bun",
          database: "none",
          styling: "none",
        },
        "/workspaces",
      ),
    ).toThrow("Project name must be lowercase.");
  });
});
