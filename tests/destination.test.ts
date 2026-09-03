import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  assertDestinationAvailable,
  DestinationNotEmptyError,
} from "../src/core/destination.ts";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "stackinit-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("destination validation", () => {
  test("accepts a destination that does not exist", async () => {
    const parent = await temporaryDirectory();

    await expect(
      assertDestinationAvailable(join(parent, "new-project")),
    ).resolves.toBeUndefined();
  });

  test("accepts an empty directory", async () => {
    const parent = await temporaryDirectory();
    const destination = join(parent, "empty-project");
    await mkdir(destination);

    await expect(
      assertDestinationAvailable(destination),
    ).resolves.toBeUndefined();
  });

  test("rejects a non-empty directory with an actionable error", async () => {
    const parent = await temporaryDirectory();
    const destination = join(parent, "existing-project");
    await mkdir(destination);
    await writeFile(join(destination, "keep.txt"), "existing data");

    await expect(assertDestinationAvailable(destination)).rejects.toEqual(
      new DestinationNotEmptyError(destination),
    );
    expect(await Bun.file(join(destination, "keep.txt")).text()).toBe(
      "existing data",
    );
  });
});
