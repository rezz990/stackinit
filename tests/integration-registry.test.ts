import { describe, expect, test } from "bun:test";

import {
  FRAMEWORK_INTEGRATIONS,
  INTEGRATION_OPTIONS,
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
      framework: "nextjs",
      database: "supabase",
      orm: "prisma",
    });
    expect(resolveDatabaseIntegration("react-vite", "none")).toEqual({
      framework: "react-vite",
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
});
