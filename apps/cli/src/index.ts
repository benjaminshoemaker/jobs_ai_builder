#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { runCli } from "./cli.js";

export const cliScaffoldMessage = "AI Builder Jobs CLI scaffold";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { createProgram, runCli } from "./cli.js";
