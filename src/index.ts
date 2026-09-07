#!/usr/bin/env bun

import { createProgram } from "./cli/program.ts";

await createProgram().parseAsync(process.argv);
