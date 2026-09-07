#!/usr/bin/env node

import { createProgram } from "./cli/program.ts";

await createProgram().parseAsync(process.argv);
