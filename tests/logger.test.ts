import { describe, expect, test } from "bun:test";

import { Logger } from "../src/utils/logger.ts";

describe("Logger", () => {
  test("routes informational and error messages", () => {
    const standardMessages: string[] = [];
    const errorMessages: string[] = [];
    const logger = new Logger({
      output: (message) => standardMessages.push(message),
      errorOutput: (message) => errorMessages.push(message),
    });

    logger.info("starting");
    logger.success("done");
    logger.warn("careful");
    logger.error("failed");

    expect(standardMessages).toEqual(["starting", "done"]);
    expect(errorMessages).toEqual(["careful", "failed"]);
  });
});
