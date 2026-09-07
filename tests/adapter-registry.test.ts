import { describe, expect, test } from "bun:test";

import {
  AdapterRegistry,
  DuplicateAdapterError,
  UnsupportedAdapterError,
} from "../src/core/adapter-registry.ts";

describe("AdapterRegistry", () => {
  test("returns a registered adapter", () => {
    const adapter = { id: "nextjs", name: "Next.js" };
    const registry = new AdapterRegistry([adapter]);

    expect(registry.get("nextjs")).toBe(adapter);
  });

  test("rejects unsupported adapters", () => {
    const registry = new AdapterRegistry<{ id: string }>();

    expect(() => registry.get("unsupported")).toThrow(
      new UnsupportedAdapterError("unsupported"),
    );
  });

  test("rejects duplicate registrations", () => {
    const registry = new AdapterRegistry([{ id: "prisma" }]);

    expect(() => registry.register({ id: "prisma" })).toThrow(
      new DuplicateAdapterError("prisma"),
    );
  });
});
