import { describe, expect, test } from "bun:test";

import { PACKAGE_MANAGER_OPTIONS } from "../src/core/package-manager-options.ts";

describe("package manager options", () => {
  test("exposes generated-project package managers from one source", () => {
    expect(PACKAGE_MANAGER_OPTIONS).toEqual([
      { value: "bun", label: "Bun" },
      { value: "npm", label: "npm" },
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
    ]);
  });
});
