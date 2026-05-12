import { describe, expect, it } from "vitest";

import { cliScaffoldMessage } from "./index.js";

describe("cli scaffold", () => {
  it("exports the scaffold message", () => {
    expect(cliScaffoldMessage).toBe("AI Builder Jobs CLI scaffold");
  });
});
