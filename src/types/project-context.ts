export type Framework = "nextjs";
export type PackageManagerId = "bun" | "npm" | "pnpm" | "yarn";
export type Database = "mysql" | "postgresql" | "sqlite" | "none";
export type Orm = "prisma" | "drizzle" | "none";
export type Styling = "tailwind" | "none";

export interface ProjectContext {
  readonly name: string;
  readonly rootDirectory: string;
  readonly framework: Framework;
  readonly packageManager: PackageManagerId;
  readonly database: Database;
  readonly orm: Orm;
  readonly styling: Styling;
}
