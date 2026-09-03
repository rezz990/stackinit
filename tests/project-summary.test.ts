import { describe, expect, test } from "bun:test";

import { formatProjectSummary } from "../src/cli/create-command.ts";

describe("project summary", () => {
  test("uses user-facing option labels", () => {
    expect(
      formatProjectSummary({
        name: "washflow",
        rootDirectory: "/workspaces/washflow",
        framework: "nextjs",
        packageManager: "bun",
        database: "mysql",
        orm: "prisma",
        styling: "tailwind",
      }),
    ).toBe(
      [
        "Project washflow",
        "Framework Next.js",
        "Package Manager Bun",
        "Database MySQL",
        "ORM Prisma",
        "Styling Tailwind CSS",
      ].join("\n"),
    );
  });
});
