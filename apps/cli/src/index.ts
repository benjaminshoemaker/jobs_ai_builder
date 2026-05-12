#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const cliScaffoldMessage = "AI Builder Jobs CLI scaffold";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(cliScaffoldMessage);
}
