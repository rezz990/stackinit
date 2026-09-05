import type { DatabaseAdapter } from "../core/database-adapter.ts";

export const supabaseAdapter: DatabaseAdapter = {
  id: "supabase",
  name: "Supabase",
  provider: "postgresql",
};
