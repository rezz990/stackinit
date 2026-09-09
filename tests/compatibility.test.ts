import { describe, expect, test } from "bun:test";

import {
  assertCompatibleProjectSpec,
  getCompatibleDatabaseIds,
  resolveDataSelection,
  satisfiesCapabilities,
} from "../src/integrations/compatibility.ts";
import { DATABASE_DEFINITIONS } from "../src/integrations/catalog.ts";
import type { ProjectSpec } from "../src/types/project-context.ts";

const validNextSpec: ProjectSpec = {
  framework: "nextjs",
  packageManager: "bun",
  styling: "tailwind",
  database: "supabase",
  orm: "prisma",
};

describe("project compatibility", () => {
  test("uses server capability requirements instead of framework IDs", () => {
    const requirements = DATABASE_DEFINITIONS[0]?.requiredCapabilities;
    expect(requirements).toEqual({ server: true });
    expect(
      satisfiesCapabilities(
        { client: true, server: true, typescript: true },
        requirements ?? {},
      ),
    ).toBe(true);
    expect(
      satisfiesCapabilities(
        { client: true, server: false, typescript: true },
        requirements ?? {},
      ),
    ).toBe(false);
  });

  test("derives database choices from registered capabilities", () => {
    expect(getCompatibleDatabaseIds("nextjs")).toEqual(["supabase", "none"]);
    expect(getCompatibleDatabaseIds("react-vite")).toEqual(["none"]);
    expect(getCompatibleDatabaseIds("vue-vite")).toEqual(["none"]);
  });

  test("resolves the database-required ORM from integration metadata", () => {
    expect(DATABASE_DEFINITIONS[0]?.requiredOrm).toBe("prisma");
    expect(resolveDataSelection("nextjs", "supabase")).toEqual({
      database: "supabase",
      orm: "prisma",
    });
  });

  test("accepts valid manually supplied project specs", () => {
    expect(() => assertCompatibleProjectSpec(validNextSpec)).not.toThrow();
    expect(() =>
      assertCompatibleProjectSpec({
        ...validNextSpec,
        framework: "react-vite",
        database: "none",
        orm: "none",
      }),
    ).not.toThrow();
  });

  test("rejects invalid manually supplied project specs", () => {
    expect(() =>
      assertCompatibleProjectSpec({
        ...validNextSpec,
        framework: "react-vite",
      }),
    ).toThrow("requires a framework with a server runtime");
    expect(() =>
      assertCompatibleProjectSpec({
        ...validNextSpec,
        framework: "vue-vite",
      }),
    ).toThrow("requires a framework with a server runtime");
    expect(() =>
      assertCompatibleProjectSpec({
        ...validNextSpec,
        database: "none",
      }),
    ).toThrow("without a database cannot select an ORM");
  });
});
