import { describe, expect, it } from "vitest";

import { createProgram } from "./cli.js";

describe("CLI help", () => {
  it("includes the MVP command surface", () => {
    const help = createProgram().helpInformation();

    for (const commandName of [
      "discover",
      "add",
      "list",
      "review",
      "show",
      "archive",
      "search",
      "proposals",
      "sources",
      "config",
      "dedupe",
      "refresh",
      "export",
    ]) {
      expect(help).toContain(commandName);
    }
  });
});
