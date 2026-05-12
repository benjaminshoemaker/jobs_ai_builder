#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { CommanderError } from "commander";

import { runCli } from "./cli.js";

export const cliScaffoldMessage = "AI Builder Jobs CLI scaffold";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error: unknown) => {
    if (error instanceof CommanderError && error.code === "commander.helpDisplayed") {
      return;
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { createProgram, runCli } from "./cli.js";
