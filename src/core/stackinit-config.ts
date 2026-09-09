import { z } from "zod";
import {
  assertCompatibleProjectSpec,
  IncompatibleProjectSpecError,
} from "../integrations/compatibility.ts";

const commonManifestSchema = z.object({
  $schema: z.literal("https://stackinit.dev/schema.json"),
  version: z.literal(1),
  framework: z.enum(["nextjs", "react-vite", "vue-vite"]),
  packageManager: z.enum(["bun", "npm", "pnpm", "yarn"]),
  styling: z.array(z.literal("tailwind")).max(1),
});

export const stackInitConfigSchema = commonManifestSchema.extend({
  database: z.enum(["supabase", "none"]),
  orm: z.enum(["prisma", "none"]),
}).superRefine((config, context) => {
  try {
    assertCompatibleProjectSpec({
      framework: config.framework,
      packageManager: config.packageManager,
      styling: config.styling.includes("tailwind") ? "tailwind" : "none",
      database: config.database,
      orm: config.orm,
    });
  } catch (error) {
    if (!(error instanceof IncompatibleProjectSpecError)) throw error;
    context.addIssue({
      code: "custom",
      path: [error.field],
      message: error.message,
    });
  }
});

export type StackInitConfig = z.infer<typeof stackInitConfigSchema>;

export function validateConfig(value: unknown): StackInitConfig {
  const result = stackInitConfigSchema.safeParse(value);
  if (result.success) return result.data;

  if (hasIssueAtPath(result.error.issues, "version")) {
    throw new StackInitConfigValidationError(
      "The StackInit manifest version is not supported.",
    );
  }
  if (
    hasIssueAtPath(result.error.issues, "database") ||
    hasIssueAtPath(result.error.issues, "orm")
  ) {
    throw new StackInitConfigValidationError(
      "The database and ORM configuration is not supported.",
    );
  }
  throw new StackInitConfigValidationError(
    "The manifest does not match a supported StackInit configuration.",
  );
}

export class StackInitConfigValidationError extends Error {
  constructor(readonly reason: string) {
    super(`Invalid StackInit configuration.\n\n${reason}`);
    this.name = "StackInitConfigValidationError";
  }
}

function hasIssueAtPath(
  issues: readonly z.core.$ZodIssue[],
  pathSegment: string,
): boolean {
  return issues.some((issue) => issue.path.includes(pathSegment));
}
