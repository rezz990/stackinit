import { describe, expect, test } from "bun:test";

import {
  PROJECT_OPTIONS,
  resolveDatabaseIntegration,
} from "../src/integrations/registry.ts";

describe("built-in integration registry", () => {
  test("exposes the v0.1 integration choices", () => {
    expect(PROJECT_OPTIONS.frameworks).toEqual([
      { value: "nextjs", label: "Next.js" },
    ]);
    expect(PROJECT_OPTIONS.databases.map(({ value }) => value)).toEqual([
      "supabase",
      "none",
    ]);
  });

  test("owns the v0.1 database and ORM compatibility policy", () => {
    expect(resolveDatabaseIntegration("supabase")).toEqual({
      database: "supabase",
      orm: "prisma",
    });
    expect(resolveDatabaseIntegration("none")).toEqual({
      database: "none",
      orm: "none",
    });
  });
});
