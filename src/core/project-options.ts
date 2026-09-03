import type {
  Database,
  Framework,
  Orm,
  PackageManagerId,
  Styling,
} from "../types/project-context.ts";

export interface ProjectOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export const PROJECT_OPTIONS = {
  frameworks: [{ value: "nextjs", label: "Next.js" }],
  packageManagers: [
    { value: "bun", label: "Bun" },
    { value: "npm", label: "npm" },
    { value: "pnpm", label: "pnpm" },
    { value: "yarn", label: "yarn" },
  ],
  databases: [
    { value: "mysql", label: "MySQL" },
    { value: "postgresql", label: "PostgreSQL" },
    { value: "sqlite", label: "SQLite" },
    { value: "none", label: "None" },
  ],
  orms: [
    { value: "prisma", label: "Prisma" },
    { value: "drizzle", label: "Drizzle" },
    { value: "none", label: "None" },
  ],
  styling: [
    { value: "tailwind", label: "Tailwind CSS" },
    { value: "none", label: "None" },
  ],
} as const satisfies {
  readonly frameworks: readonly ProjectOption<Framework>[];
  readonly packageManagers: readonly ProjectOption<PackageManagerId>[];
  readonly databases: readonly ProjectOption<Database>[];
  readonly orms: readonly ProjectOption<Orm>[];
  readonly styling: readonly ProjectOption<Styling>[];
};

export function getOptionLabel<Value extends string>(
  options: readonly ProjectOption<Value>[],
  value: Value,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
