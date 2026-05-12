import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { AppConfigSchema } from "../schemas/index.js";
import { createStoragePaths } from "../storage/index.js";
import {
  createDefaultConfig,
  createDefaultScoringRules,
  loadConfig,
  saveConfig,
} from "./index.js";

describe("config defaults and persistence", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates defaults when data/config.json is absent", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-config-"));
    const config = await loadConfig(tempDir);
    const configFile = createStoragePaths(tempDir).configFile;

    expect(config).toMatchObject({
      reviewLimit: 10,
      fetchLimit: 50,
      sourceCooldownHours: 24,
      broadApiProvider: "jooble",
      broadApiCredentialEnvVar: "JOOBLE_API_KEY",
    });
    expect(config.querySeeds).toContain("AI Builder");
    expect(config.preferences.workType?.mode).toBe("soft_rank");
    expect(config.preferences.exclusions?.mode).toBe("hard_filter");
    expect(await readFile(configFile, "utf8")).toContain('"reviewLimit": 10');
  });

  it("preserves valid user-edited config", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-config-"));
    const config = createDefaultConfig();

    await saveConfig(tempDir, {
      ...config,
      reviewLimit: 5,
      preferences: {
        ...config.preferences,
        compensationFloor: { value: 175000, mode: "note_only" },
      },
    });

    await expect(loadConfig(tempDir)).resolves.toMatchObject({
      reviewLimit: 5,
      preferences: {
        compensationFloor: { value: 175000, mode: "note_only" },
      },
    });
  });

  it("validates preference modes", () => {
    const config = createDefaultConfig();

    expect(
      AppConfigSchema.safeParse({
        ...config,
        preferences: {
          workType: { value: ["remote"], mode: "hard_filter" },
          locations: { value: ["Denver"], mode: "soft_rank" },
          compensationFloor: { value: 150000, mode: "note_only" },
        },
      }).success,
    ).toBe(true);

    expect(
      AppConfigSchema.safeParse({
        ...config,
        preferences: {
          workType: { value: ["remote"], mode: "required" },
        },
      }).success,
    ).toBe(false);
  });

  it("creates default scoring rules with the expected buckets", () => {
    const rules = createDefaultScoringRules("2026-05-12T20:00:00.000Z");

    expect(rules.bucketMaxPoints).toMatchObject({
      title: 25,
      ai_tools: 20,
      product_build: 20,
      agent_llm: 15,
      production_ownership: 10,
      exclusion: 50,
      preferences: 10,
      source_quality: 5,
    });
    expect(rules.signalWeights["title.ai_builder"]).toBeGreaterThan(0);
  });
});
