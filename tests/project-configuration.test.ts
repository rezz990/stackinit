import { describe, expect, test } from "bun:test";

import { createProjectContext, validateProjectName } from "../src/core/project-configuration.ts";

describe("project configuration", () => {
  test("validates project names", () => {
    for (const name of ["washflow", "my-app", "stackinit-demo", "project123"]) {
      expect(validateProjectName(name)).toBeUndefined();
    }
    for (const name of [
      "",
      ".",
      "..",
      "../test",
      "../../test",
      "/path",
      "test/",
      "my_app",
      "project\u0000name",
      "node_modules",
      "favicon.ico",
    ]) {
      expect(validateProjectName(name)).toBeDefined();
    }
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
        orm: "prisma",
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

  test("rejects impossible database and ORM combinations", () => {
    expect(() =>
      createProjectContext({
        name: "invalid",
        framework: "nextjs",
        packageManager: "npm",
        styling: "none",
        database: "none",
        orm: "prisma",
      }, "/workspaces"),
    ).toThrow("without a database cannot select an ORM");
    expect(() =>
      createProjectContext({
        name: "invalid",
        framework: "nextjs",
        packageManager: "npm",
        styling: "none",
        database: "supabase",
        orm: "none",
      }, "/workspaces"),
    ).toThrow("supabase requires the prisma ORM integration");
  });

  test("rejects an invalid name when creating the context", () => {
    expect(() =>
      createProjectContext(
        {
          name: "Invalid Name",
          framework: "nextjs",
          packageManager: "bun",
          database: "none",
          orm: "none",
          styling: "none",
        },
        "/workspaces",
      ),
    ).toThrow("Project name must be lowercase.");
  });
});
