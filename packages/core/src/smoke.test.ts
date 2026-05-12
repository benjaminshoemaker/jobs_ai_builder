import { describe, expect, it } from "vitest";

import { corePackageName } from "./index.js";

describe("core scaffold", () => {
  it("exports the core package name", () => {
    expect(corePackageName).toBe("@ai-builder-jobs/core");
  });
});
