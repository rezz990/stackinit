import type { PackageManager } from "./package-manager.ts";
import type { StackInitConfig } from "./stackinit-config.ts";

export type DoctorSeverity = "success" | "warning" | "error";
export type DoctorCategory = "Project" | "Environment" | "Supabase" | "Prisma";

export interface DoctorResult {
  readonly id: string;
  readonly category: DoctorCategory;
  readonly severity: DoctorSeverity;
  readonly message: string;
  readonly hint?: string;
}

export interface DoctorContext {
  readonly rootDirectory: string;
  readonly config: StackInitConfig;
  readonly packageJson: Readonly<Record<string, unknown>> | undefined;
  readonly packageManager: PackageManager;
  readonly environment: Readonly<Record<string, string | undefined>>;
}

export interface DoctorCheck {
  readonly id: string;
  run(context: DoctorContext): Promise<readonly DoctorResult[]>;
}

export interface DoctorReport {
  readonly results: readonly DoctorResult[];
  readonly exitCode: 0 | 1;
}

export function createDoctorReport(results: readonly DoctorResult[]): DoctorReport {
  return {
    results,
    exitCode: results.some((result) => result.severity === "error") ? 1 : 0,
  };
}

export function success(
  id: string,
  category: DoctorCategory,
  message: string,
): DoctorResult {
  return { id, category, severity: "success", message };
}

export function warning(
  id: string,
  category: DoctorCategory,
  message: string,
  hint?: string,
): DoctorResult {
  return { id, category, severity: "warning", message, ...(hint ? { hint } : {}) };
}

export function failure(
  id: string,
  category: DoctorCategory,
  message: string,
  hint?: string,
): DoctorResult {
  return { id, category, severity: "error", message, ...(hint ? { hint } : {}) };
}

export function getDeclaredDependencyVersion(
  packageJson: Readonly<Record<string, unknown>> | undefined,
  packageName: string,
): string | undefined {
  return (
    getStringProperty(getRecordProperty(packageJson, "dependencies"), packageName) ??
    getStringProperty(getRecordProperty(packageJson, "devDependencies"), packageName)
  );
}

function getRecordProperty(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): Readonly<Record<string, unknown>> | undefined {
  const value = record?.[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function getStringProperty(
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}
