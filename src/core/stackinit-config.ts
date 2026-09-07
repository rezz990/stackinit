import { z } from "zod";

const commonManifestSchema = z.object({
  $schema: z.literal("https://stackinit.dev/schema.json"),
  version: z.literal(1),
  framework: z.literal("nextjs"),
  packageManager: z.enum(["bun", "npm", "pnpm", "yarn"]),
  styling: z.array(z.literal("tailwind")).max(1),
});

export const stackInitConfigSchema = z.intersection(
  commonManifestSchema,
  z.discriminatedUnion("database", [
    z.object({ database: z.literal("supabase"), orm: z.literal("prisma") }),
    z.object({ database: z.literal("none"), orm: z.literal("none") }),
  ]),
);

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
