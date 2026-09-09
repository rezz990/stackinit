export type Framework = "nextjs" | "react-vite" | "vue-vite";
export type PackageManagerId = "bun" | "npm" | "pnpm" | "yarn";
export type DatabaseId = "supabase" | "none";
export type OrmId = "prisma" | "none";
export type Styling = "tailwind" | "none";

export interface ProjectSpec {
  readonly framework: Framework;
  readonly packageManager: PackageManagerId;
  readonly styling: Styling;
  readonly database: DatabaseId;
  readonly orm: OrmId;
}

interface ProjectDetails extends ProjectSpec {
  readonly name: string;
  readonly rootDirectory: string;
}

export type ProjectContext = ProjectDetails;
