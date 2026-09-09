import { describe, expect, test } from "bun:test";

import {
  assertValidPostgresqlUrl,
  InvalidPostgresqlUrlError,
} from "../src/core/postgresql-url.ts";

describe("PostgreSQL URL validation", () => {
  test.each([
    "postgres://user:password@db.example.com/app",
    "postgresql://user@pooler.example.com:6543/app?pgbouncer=true",
    "postgresql://localhost/development",
  ])("accepts structurally valid URLs", (url) => {
    expect(() => assertValidPostgresqlUrl(url, "DATABASE_URL")).not.toThrow();
  });

  test.each([
    "not-a-url",
    "mysql://db.example.com/app",
    "postgresql:///app",
    "postgresql://db.example.com",
    "postgresql://db.example.com/a/b",
  ])("rejects malformed or incomplete URLs", (url) => {
    expect(() => assertValidPostgresqlUrl(url, "DIRECT_URL")).toThrow(
      InvalidPostgresqlUrlError,
    );
  });

  test("never includes credentials in validation errors", () => {
    const secret = "super-secret-password";

    expect(() =>
      assertValidPostgresqlUrl(
        `http://user:${secret}@db.example.com/app`,
        "DATABASE_URL",
      ),
    ).toThrow("Invalid DATABASE_URL format.");

    try {
      assertValidPostgresqlUrl(
        `http://user:${secret}@db.example.com/app`,
        "DATABASE_URL",
      );
    } catch (error) {
      expect(String(error)).not.toContain(secret);
    }
  });
});
