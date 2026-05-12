import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  readEvents,
  readJsonFile,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("archive command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("records archive reason, lifecycle status, archive event, and keeps archived jobs searchable", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-archive-"));
    const paths = createStoragePaths(tempDir);
    await seedJob(tempDir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "archive",
      "job_1",
      "--data-dir",
      tempDir,
      "--reason",
      "filled",
    ]);

    await expect(readJsonFile(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "archived",
      archiveReason: "filled",
    });
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "job.archived", payload: { reason: "filled" } });

    const log = vi.mocked(console.log);
    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "search", "Example AI", "--data-dir", tempDir]);
    expect(output(log)).toContain("job_1");
  });

  it("excludes archived jobs from normal list output and includes them with explicit archive filters", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-archive-"));
    await seedJob(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await createProgram().parseAsync(["node", "jobs", "archive", "job_1", "--data-dir", tempDir]);

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir]);
    expect(output(log)).not.toContain("job_1");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--archived"]);
    expect(output(log)).toContain("job_1");
  });
});

async function seedJob(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema, {
    schemaVersion: 1,
    id: "job_1",
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "active",
    currentReviewLabel: "yes",
    workType: "remote",
    sourceListingIds: [],
    score: {
      total: 88,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "Strong AI builder match",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
