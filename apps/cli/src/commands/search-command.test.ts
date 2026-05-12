import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createStoragePaths,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("search command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("searches metadata, company, title, source names, notes, and signal labels without full description storage", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-search-"));
    await seedSearchData(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    for (const query of ["Product Builder", "Example AI", "Ashby", "agentic workflow", "Claude Code"]) {
      log.mockClear();
      await createProgram().parseAsync(["node", "jobs", "search", query, "--data-dir", tempDir]);
      expect(output(log)).toContain("job_1");
    }

    expect(output(log)).not.toContain("FULL DESCRIPTION");
  });
});

async function seedSearchData(dataDir: string): Promise<void> {
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
    sourceListingIds: ["listing_1"],
    notes: ["agentic workflow fit"],
    score: {
      total: 88,
      buckets: [],
      positiveSignals: [
        {
          id: "tool.claude_code",
          label: "Mentions Claude Code",
          polarity: "positive",
          source: "description",
          weight: 10,
        },
      ],
      negativeSignals: [],
      surfacedReason: "Strong AI builder match",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  });
  await atomicWriteJson(path.join(paths.sourceListingsDir, "listing_1.json"), SourceListingRecordSchema, {
    schemaVersion: 1,
    id: "listing_1",
    jobId: "job_1",
    sourceId: "source_1",
    sourceType: "ats",
    adapter: "ashby",
    sourceUrl: "https://jobs.ashbyhq.com/example/product-builder",
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
    type: "ats",
    adapter: "ashby",
    name: "Example Ashby Source",
    reusable: true,
    enabled: true,
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
