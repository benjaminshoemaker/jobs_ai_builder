import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createProgram } from "../cli.js";

describe("config command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("edits provider, credential env var, limits, cooldown, and preferences", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-config-"));

    await createProgram().parseAsync([
      "node",
      "jobs",
      "config",
      "set",
      "--data-dir",
      tempDir,
      "--provider",
      "adzuna",
      "--credential-env",
      "ADZUNA_API_KEY",
      "--review-limit",
      "5",
      "--fetch-limit",
      "25",
      "--cooldown",
      "12",
      "--work-type",
      "remote:hard_filter",
      "--exclusion",
      "DevRel:note_only",
    ]);

    const config = JSON.parse(await readFile(path.join(tempDir, "config.json"), "utf8"));
    expect(config).toMatchObject({
      broadApiProvider: "adzuna",
      broadApiCredentialEnvVar: "ADZUNA_API_KEY",
      reviewLimit: 5,
      fetchLimit: 25,
      sourceCooldownHours: 12,
      preferences: {
        workType: { value: ["remote"], mode: "hard_filter" },
        exclusions: { value: ["DevRel"], mode: "note_only" },
      },
    });
  });

  it("validates preference modes and rejects invalid config before writing", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-config-"));

    await expect(
      createProgram().parseAsync([
        "node",
        "jobs",
        "config",
        "set",
        "--data-dir",
        tempDir,
        "--work-type",
        "remote:required",
      ]),
    ).rejects.toThrow(/Invalid preference mode/);

    await expect(readFile(path.join(tempDir, "config.json"), "utf8")).rejects.toThrow();
  });
});
