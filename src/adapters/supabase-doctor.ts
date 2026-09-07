import {
  failure,
  success,
  warning,
  type DoctorCheck,
  type DoctorContext,
  type DoctorResult,
} from "../core/doctor.ts";
import { assertValidPostgresqlUrl } from "../core/postgresql-url.ts";

export const supabaseDoctor: DoctorCheck = {
  id: "database.supabase",
  run(context: DoctorContext): Promise<readonly DoctorResult[]> {
    const runtimeUrl = context.environment.DATABASE_URL;
    const directUrl = context.environment.DIRECT_URL;
    const results = [
      checkUrl(
        "supabase.database-url",
        "DATABASE_URL",
        runtimeUrl,
        "Add the pooled Supabase connection to .env.",
      ),
      checkUrl(
        "supabase.direct-url",
        "DIRECT_URL",
        directUrl,
        "Add the direct or session Supabase connection to .env.",
      ),
    ];

    if (runtimeUrl && directUrl && runtimeUrl === directUrl) {
      results.push(
        warning(
          "supabase.connection-roles.identical",
          "Supabase",
          "DATABASE_URL and DIRECT_URL are identical",
          "For production or serverless deployments, consider a pooled runtime connection and a direct or session connection for Prisma CLI operations.",
        ),
      );
    }
    return Promise.resolve(results);
  },
};

function checkUrl(
  id: string,
  variable: "DATABASE_URL" | "DIRECT_URL",
  value: string | undefined,
  missingHint: string,
): DoctorResult {
  if (!value || value.startsWith("YOUR_SUPABASE_")) {
    return failure(id, "Supabase", `${variable} is not configured`, missingHint);
  }
  try {
    assertValidPostgresqlUrl(value, variable);
    return success(id, "Supabase", `${variable} configured`);
  } catch {
    return failure(
      id,
      "Supabase",
      `${variable} has an invalid PostgreSQL URL format`,
      `Update ${variable} in .env with a valid Supabase PostgreSQL connection URL.`,
    );
  }
}
