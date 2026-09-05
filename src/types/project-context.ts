export type Framework = "nextjs";
export type PackageManagerId = "bun" | "npm" | "pnpm" | "yarn";
export type DatabaseId = "supabase" | "none";
export type OrmId = "prisma" | "none";
export type Styling = "tailwind" | "none";

export type DatabaseConfig =
  | { readonly database: "supabase"; readonly orm: "prisma" }
  | { readonly database: "none"; readonly orm: "none" };

interface ProjectDetails {
  readonly name: string;
  readonly rootDirectory: string;
  readonly framework: Framework;
  readonly packageManager: PackageManagerId;
  readonly styling: Styling;
}

export type ProjectContext = ProjectDetails & DatabaseConfig;
