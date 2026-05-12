import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  JobRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  type ReviewQueueItem,
} from "../../../../packages/core/src/index.js";
import { runReviewFlow } from "./reviewPrompts.js";

describe("review prompt flow", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("supports yes, maybe, no, skip, and optional structured notes", async () => {
    const actions = [
      { action: "yes" as const, notes: ["strong match"] },
      { action: "maybe" as const },
      { action: "no" as const, notes: ["too sales-led"] },
      { action: "skip" as const },
    ];
    const outcomes = await runReviewFlow({
      items: actions.map((_, index) => createReviewItem(`job_${index}`)),
      write: () => undefined,
      prompt: async () => actions.shift()!,
    });

    expect(outcomes).toEqual([
      { jobId: "job_0", action: "yes", reviewLabel: "yes", notes: ["strong match"] },
      { jobId: "job_1", action: "maybe", reviewLabel: "maybe", notes: [] },
      { jobId: "job_2", action: "no", reviewLabel: "no", notes: ["too sales-led"] },
      { jobId: "job_3", action: "skip", notes: [] },
    ]);
  });

  it("does not persist full descriptions after rendering", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-review-flow-"));
    const paths = createStoragePaths(tempDir);
    const item = createReviewItem("job_secret");
    await atomicWriteJson(path.join(paths.jobsDir, `${item.job.id}.json`), JobRecordSchema, item.job);

    await runReviewFlow({
      items: [item],
      write: () => undefined,
      prompt: async () => ({ action: "skip" }),
      resolveDescription: async () => "SECRET FULL DESCRIPTION WITH CLAUDE CODE DETAILS",
    });

    const persisted = await readFile(path.join(paths.jobsDir, `${item.job.id}.json`), "utf8");
    expect(persisted).not.toContain("SECRET FULL DESCRIPTION");
  });
});

function createReviewItem(id: string): ReviewQueueItem {
  return {
    job: {
      schemaVersion: 1,
      id,
      title: "AI Builder",
      company: "Example AI",
      discoveredAt: "2026-05-12T20:00:00.000Z",
      updatedAt: "2026-05-12T20:00:00.000Z",
      lifecycleStatus: "candidate",
      workType: "remote",
      sourceListingIds: [],
      score: {
        total: 75,
        buckets: [],
        positiveSignals: [],
        negativeSignals: [],
        surfacedReason: "AI builder title match",
        scoredAt: "2026-05-12T20:00:00.000Z",
        scoringVersion: "rules-v1",
      },
    },
    sourceListings: [],
    sources: [],
  };
}
