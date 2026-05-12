import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { atomicWriteJson, createStoragePaths, readJsonFile } from "./index.js";

const TestRecordSchema = z.object({
  id: z.string(),
  value: z.number(),
});

describe("storage paths", () => {
  it("creates spec-aligned data paths under a configurable data directory", () => {
    const paths = createStoragePaths("/tmp/ai-builder-jobs-data");

    expect(paths.jobsDir).toBe("/tmp/ai-builder-jobs-data/jobs");
    expect(paths.sourceListingsDir).toBe("/tmp/ai-builder-jobs-data/source-listings");
    expect(paths.sourcesDir).toBe("/tmp/ai-builder-jobs-data/sources");
    expect(paths.proposalsDir).toBe("/tmp/ai-builder-jobs-data/proposals");
    expect(paths.sessionsDir).toBe("/tmp/ai-builder-jobs-data/sessions");
    expect(paths.doNotMergeDir).toBe("/tmp/ai-builder-jobs-data/do-not-merge");
    expect(paths.exportsDir).toBe("/tmp/ai-builder-jobs-data/exports");
    expect(paths.eventsFile).toBe("/tmp/ai-builder-jobs-data/events.jsonl");
    expect(paths.configFile).toBe("/tmp/ai-builder-jobs-data/config.json");
    expect(paths.scoringRulesFile).toBe("/tmp/ai-builder-jobs-data/scoring-rules.json");
  });
});

describe("atomic JSON repository", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("writes to a temporary file before renaming to the target path", async () => {
    const operations: string[] = [];

    await atomicWriteJson(
      "/data/jobs/job_1.json",
      TestRecordSchema,
      { id: "job_1", value: 1 },
      {
        mkdir: async () => {
          operations.push("mkdir");
        },
        writeFile: async (filePath) => {
          operations.push(`write:${filePath}`);
        },
        rename: async (from, to) => {
          operations.push(`rename:${from}->${to}`);
        },
        readFile: async () => {
          throw new Error("not used");
        },
      },
    );

    expect(operations[0]).toBe("mkdir");
    expect(operations[1]).toMatch(/^write:\/data\/jobs\/job_1\.json\..+\.tmp$/);
    expect(operations[2]).toMatch(/^rename:\/data\/jobs\/job_1\.json\..+\.tmp->\/data\/jobs\/job_1\.json$/);
  });

  it("does not overwrite an invalid existing file when validation fails before write", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-storage-"));
    const filePath = path.join(tempDir, "record.json");
    await writeFile(filePath, "{bad json", "utf8");

    await expect(
      atomicWriteJson(filePath, TestRecordSchema, { id: "job_1" }),
    ).rejects.toThrow();

    await expect(readFile(filePath, "utf8")).resolves.toBe("{bad json");
  });

  it("reads and validates JSON records", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-storage-"));
    const filePath = path.join(tempDir, "record.json");

    await atomicWriteJson(filePath, TestRecordSchema, { id: "job_1", value: 2 });

    await expect(readJsonFile(filePath, TestRecordSchema)).resolves.toEqual({
      id: "job_1",
      value: 2,
    });
  });
});
