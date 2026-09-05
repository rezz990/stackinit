import { readdir, stat } from "node:fs/promises";

export class DestinationNotEmptyError extends Error {
  constructor(readonly destination: string) {
    super(
      `Cannot create project.\n\nDirectory "${destination}" already exists and is not empty.\nChoose another project name or remove the existing directory.`,
    );
    this.name = "DestinationNotEmptyError";
  }
}

export async function assertDestinationAvailable(
  destination: string,
): Promise<void> {
  try {
    const destinationStat = await stat(destination);
    if (
      !destinationStat.isDirectory() ||
      (await readdir(destination)).length > 0
    ) {
      throw new DestinationNotEmptyError(destination);
    }
  } catch (error) {
    if (isMissingPathError(error)) return;
    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { readonly code?: unknown }).code === "ENOENT"
  );
}
