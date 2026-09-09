import type { FrameworkCapabilities } from "../core/framework-adapter.ts";
import type {
  DatabaseId,
  Framework,
  OrmId,
  Styling,
} from "../types/project-context.ts";

export interface FrameworkDefinition {
  readonly id: Framework;
  readonly name: string;
  readonly description: string;
  readonly capabilities: FrameworkCapabilities;
  readonly supportedStyling: readonly Styling[];
}

export interface DatabaseDefinition {
  readonly id: Exclude<DatabaseId, "none">;
  readonly name: string;
  readonly description: string;
  readonly requiredCapabilities: Partial<FrameworkCapabilities>;
  readonly requiredOrm: Exclude<OrmId, "none">;
}

export interface OrmDefinition {
  readonly id: Exclude<OrmId, "none">;
  readonly name: string;
  readonly description: string;
  readonly supportedDatabases: readonly Exclude<DatabaseId, "none">[];
}

export const FRAMEWORK_DEFINITIONS: readonly FrameworkDefinition[] = [
  {
    id: "nextjs",
    name: "Next.js",
    description: "Full-stack React framework with App Router",
    capabilities: { client: true, server: true, typescript: true },
    supportedStyling: ["tailwind", "none"],
  },
  {
    id: "react-vite",
    name: "React + Vite",
    description: "Client-side React application powered by Vite",
    capabilities: { client: true, server: false, typescript: true },
    supportedStyling: ["tailwind", "none"],
  },
  {
    id: "vue-vite",
    name: "Vue + Vite",
    description: "Client-side Vue application powered by Vite",
    capabilities: { client: true, server: false, typescript: true },
    supportedStyling: ["tailwind", "none"],
  },
];

export const DATABASE_DEFINITIONS: readonly DatabaseDefinition[] = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Managed PostgreSQL for server-side access through Prisma",
    requiredCapabilities: { server: true },
    requiredOrm: "prisma",
  },
];

export const ORM_DEFINITIONS: readonly OrmDefinition[] = [
  {
    id: "prisma",
    name: "Prisma",
    description: "Type-safe ORM and generated database client",
    supportedDatabases: ["supabase"],
  },
];
