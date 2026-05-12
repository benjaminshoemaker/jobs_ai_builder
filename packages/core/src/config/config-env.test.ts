import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createStoragePaths } from "../storage/index.js";
import { createDefaultConfig, loadConfig, readConfiguredCredential } from "./index.js";

describe("config environment loading", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("reads configured credentials from the provided environment", () => {
    const config = createDefaultConfig();

    expect(
      readConfiguredCredential(config, {
        JOOBLE_API_KEY: "secret-api-key",
      }),
    ).toBe("secret-api-key");
  });

  it("does not write secret values into local config", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-config-"));
    const config = await loadConfig(tempDir);
    const credentialValue = readConfiguredCredential(config, {
      JOOBLE_API_KEY: "secret-api-key",
    });

    const configText = await readFile(createStoragePaths(tempDir).configFile, "utf8");

    expect(credentialValue).toBe("secret-api-key");
    expect(configText).toContain("JOOBLE_API_KEY");
    expect(configText).not.toContain("secret-api-key");
  });
});
