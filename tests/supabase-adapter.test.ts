import { describe, expect, test } from "bun:test";

import { supabaseAdapter } from "../src/adapters/supabase-adapter.ts";

describe("Supabase adapter", () => {
  test("exposes the PostgreSQL database metadata", () => {
    expect(supabaseAdapter).toEqual({
      id: "supabase",
      name: "Supabase",
      provider: "postgresql",
    });
  });
});
