import { NextjsAdapter } from "../adapters/nextjs-adapter.ts";
import { nextjsDoctor } from "../adapters/nextjs-doctor.ts";
import { PrismaAdapter } from "../adapters/prisma-adapter.ts";
import { prismaDoctor } from "../adapters/prisma-doctor.ts";
import { supabaseAdapter } from "../adapters/supabase-adapter.ts";
import { supabaseDoctor } from "../adapters/supabase-doctor.ts";
import { ViteAdapter } from "../adapters/vite-adapter.ts";
import { createViteDoctor } from "../adapters/vite-doctor.ts";
import { tailwindDoctor } from "../adapters/tailwind-doctor.ts";
import type { DoctorCheck } from "../core/doctor.ts";
import type {
  FrameworkAdapter,
  FrameworkCapabilities,
} from "../core/framework-adapter.ts";
import type { PackageManager } from "../core/package-manager.ts";
import type { OrmAdapter } from "../core/orm-adapter.ts";
import type { ProjectOption } from "../core/project-option.ts";
import type {
  DatabaseId,
  Framework,
  ProjectStack,
  Styling,
} from "../types/project-context.ts";

export interface FrameworkIntegration {
  readonly id: Framework;
  readonly name: string;
  readonly description: string;
  readonly capabilities: FrameworkCapabilities;
  readonly supportedDatabases: readonly DatabaseId[];
  readonly supportedStyling: readonly Styling[];
  createAdapter(packageManager: PackageManager): FrameworkAdapter;
  readonly doctor: DoctorCheck;
}

export const FRAMEWORK_INTEGRATIONS: readonly FrameworkIntegration[] = [
  {
    id: "nextjs",
    name: "Next.js",
    description: "Full-stack React framework with App Router",
    capabilities: { client: true, server: true, typescript: true },
    supportedDatabases: ["supabase", "none"],
    supportedStyling: ["tailwind", "none"],
    createAdapter: (packageManager) => new NextjsAdapter(packageManager),
    doctor: nextjsDoctor,
  },
  {
    id: "react-vite",
    name: "React + Vite",
    description: "Client-side React application powered by Vite",
    capabilities: { client: true, server: false, typescript: true },
    supportedDatabases: ["none"],
    supportedStyling: ["tailwind", "none"],
    createAdapter: (packageManager) =>
      new ViteAdapter("react-vite", packageManager),
    doctor: createViteDoctor("react-vite"),
  },
  {
    id: "vue-vite",
    name: "Vue + Vite",
    description: "Client-side Vue application powered by Vite",
    capabilities: { client: true, server: false, typescript: true },
    supportedDatabases: ["none"],
    supportedStyling: ["tailwind", "none"],
    createAdapter: (packageManager) =>
      new ViteAdapter("vue-vite", packageManager),
    doctor: createViteDoctor("vue-vite"),
  },
];

export const DATABASE_INTEGRATIONS = [
  {
    ...supabaseAdapter,
    description: "Managed PostgreSQL for server-side access through Prisma",
    requiredOrm: "prisma" as const,
    doctor: supabaseDoctor,
  },
] as const;

export const ORM_INTEGRATIONS = [
  {
    id: "prisma" as const,
    name: "Prisma",
    description: "Type-safe ORM and generated database client",
    supportedDatabases: ["supabase"] as const,
    doctor: prismaDoctor,
    createAdapter: (packageManager: PackageManager): OrmAdapter =>
      new PrismaAdapter(packageManager, supabaseAdapter),
  },
] as const;

export const INTEGRATION_OPTIONS = {
  frameworks: FRAMEWORK_INTEGRATIONS.map(({ id, name }) => ({
    value: id,
    label: name,
  })),
  databases: [
    ...DATABASE_INTEGRATIONS.map(({ id, name }) => ({ value: id, label: name })),
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

export const ORM_LABELS = { prisma: "Prisma", none: "None" } as const;

export function getFrameworkIntegration(id: Framework): FrameworkIntegration {
  const integration = FRAMEWORK_INTEGRATIONS.find((candidate) => candidate.id === id);
  if (!integration) throw new Error(`Unsupported framework integration: ${id}`);
  return integration;
}

export function getDatabaseOptions(
  framework: Framework,
): readonly ProjectOption<DatabaseId>[] {
  const supported = getFrameworkIntegration(framework).supportedDatabases;
  return INTEGRATION_OPTIONS.databases.filter(({ value }) =>
    supported.includes(value),
  );
}

export function getStylingOptions(
  framework: Framework,
): readonly ProjectOption<Styling>[] {
  const supported = getFrameworkIntegration(framework).supportedStyling;
  return INTEGRATION_OPTIONS.styling.filter(({ value }) => supported.includes(value));
}

export function getStylingDoctor(
  styling: readonly "tailwind"[],
): DoctorCheck | undefined {
  return styling.includes("tailwind") ? tailwindDoctor : undefined;
}

export function getDatabaseDoctor(database: DatabaseId): DoctorCheck | undefined {
  return database === "none"
    ? undefined
    : DATABASE_INTEGRATIONS.find(({ id }) => id === database)?.doctor;
}

export function getOrmDoctor(orm: "prisma" | "none"): DoctorCheck | undefined {
  return orm === "none"
    ? undefined
    : ORM_INTEGRATIONS.find(({ id }) => id === orm)?.doctor;
}

export function createOrmAdapter(
  orm: "prisma" | "none",
  packageManager: PackageManager,
): OrmAdapter | undefined {
  return orm === "none"
    ? undefined
    : ORM_INTEGRATIONS.find(({ id }) => id === orm)?.createAdapter(packageManager);
}

export function getDatabaseSetupNote(
  database: DatabaseId,
  packageManager: PackageManager,
): { readonly title: string; readonly message: string } | undefined {
  if (database !== "supabase") return undefined;
  return {
    title: "Supabase setup",
    message: [
      "1. Open your Supabase project.",
      "2. Copy the pooled runtime database URL.",
      "3. Set DATABASE_URL in .env.",
      "4. Copy the direct or session database URL.",
      "5. Set DIRECT_URL in .env.",
      "",
      "Then run:",
      packageManager.formatExecuteCommand("prisma", ["migrate", "dev"]),
    ].join("\n"),
  };
}

/** Resolve the compatibility policy supplied by StackInit's built-in integrations. */
export function resolveDatabaseIntegration(
  framework: Framework,
  database: DatabaseId,
): ProjectStack {
  if (database === "supabase") {
    const integration = getFrameworkIntegration(framework);
    if (
      !integration.supportedDatabases.includes(database) ||
      framework !== "nextjs"
    ) {
      throw new Error(`Supabase + Prisma requires a framework with a server runtime.`);
    }
    return { framework: "nextjs", database, orm: "prisma" };
  }
  return { framework, database: "none", orm: "none" };
}
