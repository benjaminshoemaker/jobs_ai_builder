import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  readEvents,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("refresh command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("writes job.refreshed events and reports per-listing status", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-refresh-command-"));
    await seedRefreshCommandData(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync(["node", "jobs", "refresh", "--data-dir", tempDir]);

    expect(output(log)).toContain("listing_1\tok");
    const { events } = await readEvents(createStoragePaths(tempDir).eventsFile, EventRecordSchema);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "job.refreshed",
      jobId: "job_1",
      sourceListingId: "listing_1",
      payload: { fetchStatus: "ok" },
    });
  });
});

async function seedRefreshCommandData(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema, {
    schemaVersion: 1,
    id: "job_1",
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "active",
    workType: "remote",
    sourceListingIds: ["listing_1"],
    score: {
      total: 80,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "AI builder fit",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  });
  await atomicWriteJson(path.join(paths.sourceListingsDir, "listing_1.json"), SourceListingRecordSchema, {
    schemaVersion: 1,
    id: "listing_1",
    jobId: "job_1",
    sourceId: "source_1",
    sourceType: "manual",
    adapter: "manual",
    sourceUrl: "https://example.com/jobs/product-builder",
    firstSeenAt: "2026-05-12T20:00:00.000Z",
    fetchStatus: "ok",
    normalizedMetadata: {
      title: "Product Builder",
      company: "Example AI",
    },
  });
  await atomicWriteJson(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_1",
    type: "manual",
    adapter: "manual",
    name: "Manual Source",
    reusable: true,
    enabled: true,
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
