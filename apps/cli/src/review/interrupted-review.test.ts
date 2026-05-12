import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  persistReviewLabel,
  readEvents,
  readJsonFile,
  recordSessionInterrupted,
  type ReviewQueueItem,
} from "../../../../packages/core/src/index.js";
import { ReviewInterruptedError, runReviewFlow } from "./reviewPrompts.js";

describe("interrupted review", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("persists completed labels, writes session.interrupted, and leaves unreviewed jobs as candidates", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-interrupted-review-"));
    const paths = createStoragePaths(tempDir);
    const reviewed = createReviewItem("job_reviewed");
    const untouched = createReviewItem("job_untouched");
    await atomicWriteJson(path.join(paths.jobsDir, "job_reviewed.json"), JobRecordSchema, reviewed.job);
    await atomicWriteJson(path.join(paths.jobsDir, "job_untouched.json"), JobRecordSchema, untouched.job);
    let calls = 0;

    await expect(
      runReviewFlow({
        items: [reviewed, untouched],
        write: () => undefined,
        prompt: async () => {
          calls += 1;
          if (calls === 1) return { action: "yes", notes: ["worth applying"] };
          throw new Error("SIGINT");
        },
        onOutcome: async (outcome) => {
          if (outcome.reviewLabel) {
            await persistReviewLabel({
              dataDir: tempDir!,
              jobId: outcome.jobId,
              reviewLabel: outcome.reviewLabel,
              notes: outcome.notes,
              now: "2026-05-12T21:00:00.000Z",
              sessionId: "session_1",
            });
          }
        },
        onInterrupted: async (context) => {
          await recordSessionInterrupted({
            dataDir: tempDir!,
            sessionId: "session_1",
            now: "2026-05-12T21:01:00.000Z",
            reviewedJobIds: context.completedOutcomes.map((outcome) => outcome.jobId),
            reason: context.error instanceof Error ? context.error.message : "unknown",
          });
        },
      }),
    ).rejects.toBeInstanceOf(ReviewInterruptedError);

    await expect(readJsonFile(path.join(paths.jobsDir, "job_reviewed.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "active",
      currentReviewLabel: "yes",
    });
    const unreviewed = await readJsonFile(path.join(paths.jobsDir, "job_untouched.json"), JobRecordSchema);
    expect(unreviewed.lifecycleStatus).toBe("candidate");
    expect(unreviewed).not.toHaveProperty("currentReviewLabel");
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events.map((event) => event.type)).toEqual(["job.reviewed", "session.interrupted"]);
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
        total: 80,
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
