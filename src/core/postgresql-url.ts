export type DatabaseUrlVariable = "DATABASE_URL" | "DIRECT_URL";

export class InvalidPostgresqlUrlError extends Error {
  constructor(readonly variable: DatabaseUrlVariable) {
    super(`Invalid ${variable} format.`);
    this.name = "InvalidPostgresqlUrlError";
  }
}

export function assertValidPostgresqlUrl(
  value: string,
  variable: DatabaseUrlVariable,
): void {
  try {
    const url = new URL(value);
    const databaseName = decodeURIComponent(url.pathname.slice(1));
    const hasValidProtocol =
      url.protocol === "postgres:" || url.protocol === "postgresql:";
    const hasReasonableDatabaseName =
      databaseName.length > 0 &&
      databaseName !== "." &&
      databaseName !== ".." &&
      !databaseName.includes("/");

    if (!hasValidProtocol || url.hostname.length === 0 || !hasReasonableDatabaseName) {
      throw new InvalidPostgresqlUrlError(variable);
    }
  } catch {
    throw new InvalidPostgresqlUrlError(variable);
  }
}
