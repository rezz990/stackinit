import { describe, expect, test } from "bun:test";

import {
  DATABASE_INTEGRATIONS,
  FRAMEWORK_INTEGRATIONS,
  INTEGRATION_OPTIONS,
  ORM_INTEGRATIONS,
  getDatabaseOptions,
  getFrameworkIntegration,
  resolveDatabaseIntegration,
} from "../src/integrations/registry.ts";

describe("built-in integration registry", () => {
  test("exposes the v0.1 integration choices", () => {
    expect(INTEGRATION_OPTIONS.frameworks).toEqual([
      { value: "nextjs", label: "Next.js" },
      { value: "react-vite", label: "React + Vite" },
      { value: "vue-vite", label: "Vue + Vite" },
    ]);
    expect(INTEGRATION_OPTIONS.databases.map(({ value }) => value)).toEqual([
      "supabase",
      "none",
    ]);
  });

  test("owns the v0.1 database and ORM compatibility policy", () => {
    expect(resolveDatabaseIntegration("nextjs", "supabase")).toEqual({
      database: "supabase",
      orm: "prisma",
    });
    expect(resolveDatabaseIntegration("react-vite", "none")).toEqual({
      database: "none",
      orm: "none",
    });
    expect(() => resolveDatabaseIntegration("vue-vite", "supabase")).toThrow(
      "requires a framework with a server runtime",
    );
  });

  test("derives selectable combinations from framework capabilities", () => {
    expect(FRAMEWORK_INTEGRATIONS.find(({ id }) => id === "nextjs")?.capabilities.server).toBe(true);
    expect(FRAMEWORK_INTEGRATIONS.find(({ id }) => id === "react-vite")?.capabilities.server).toBe(false);
    expect(getDatabaseOptions("nextjs").map(({ value }) => value)).toEqual(["supabase", "none"]);
    expect(getDatabaseOptions("vue-vite").map(({ value }) => value)).toEqual(["none"]);
  });

  test("registers generator and doctor capabilities together", () => {
    const integration = getFrameworkIntegration("vue-vite");
    expect(integration.description).toContain("Vue");
    expect(integration.doctor.id).toBe("framework.vue-vite");
    expect(typeof integration.createAdapter).toBe("function");
  });

  test("binds database and ORM implementations by definition ID", () => {
    const database = DATABASE_INTEGRATIONS.find(({ id }) => id === "supabase");
    const orm = ORM_INTEGRATIONS.find(({ id }) => id === "prisma");

    expect(database?.description).toContain("PostgreSQL");
    expect(database?.doctor.id).toBe("database.supabase");
    expect(orm?.supportedDatabases).toContain("supabase");
    expect(orm?.doctor.id).toBe("orm.prisma");
  });
});
