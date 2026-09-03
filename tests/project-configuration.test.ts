import { describe, expect, test } from "bun:test";

import {
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
        database: "mysql",
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
      database: "mysql",
      orm: "prisma",
      styling: "tailwind",
    });
  });

  test("forces ORM to None when no database is selected", () => {
    const context = createProjectContext(
      {
        name: "washflow",
        framework: "nextjs",
        packageManager: "npm",
        database: "none",
        orm: "drizzle",
        styling: "none",
      },
      "/workspaces",
    );

    expect(context.orm).toBe("none");
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
