import type { ProjectOption } from "../core/project-option.ts";
import type {
  DatabaseConfig,
  DatabaseId,
  Framework,
  Styling,
} from "../types/project-context.ts";

export const INTEGRATION_OPTIONS = {
  frameworks: [{ value: "nextjs", label: "Next.js" }],
  databases: [
    { value: "supabase", label: "Supabase" },
    { value: "none", label: "None" },
  ],
  styling: [
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "none", label: "None" },
  ],
} as const satisfies {
  readonly frameworks: readonly ProjectOption<Framework>[];
  readonly databases: readonly ProjectOption<DatabaseId>[];
  readonly styling: readonly ProjectOption<Styling>[];
};

export const ORM_LABELS = {
  prisma: "Prisma",
  none: "None",
} as const;

/** Resolve the compatibility policy supplied by StackInit's v0.1 integrations. */
export function resolveDatabaseIntegration(database: DatabaseId): DatabaseConfig {
  switch (database) {
    case "supabase":
      return { database, orm: "prisma" };
    case "none":
      return { database, orm: "none" };
  }
}
