import type { DatabaseId } from "../types/project-context.ts";

export interface DatabaseAdapter {
  readonly id: Exclude<DatabaseId, "none">;
  readonly name: string;
  readonly provider: "postgresql";
}
