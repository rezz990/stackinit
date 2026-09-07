import { describe, expect, test } from "bun:test";

import {
  INTEGRATION_OPTIONS,
  resolveDatabaseIntegration,
} from "../src/integrations/registry.ts";

describe("built-in integration registry", () => {
  test("exposes the v0.1 integration choices", () => {
    expect(INTEGRATION_OPTIONS.frameworks).toEqual([
      { value: "nextjs", label: "Next.js" },
    ]);
    expect(INTEGRATION_OPTIONS.databases.map(({ value }) => value)).toEqual([
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
