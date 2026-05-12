import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { EventRecordSchema } from "../schemas/index.js";
import { createStoragePaths, readEvents } from "../storage/index.js";
import {
  createDoNotMergeDecision,
  createDoNotMergeRecord,
  hasDoNotMergeDecision,
  listDoNotMergeDecisions,
} from "./index.js";

describe("do-not-merge decisions", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("normalizes jobA/jobB and jobB/jobA to the same decision", () => {
    const record = createDoNotMergeRecord({
      jobIdA: "job_b",
      jobIdB: "job_a",
      createdAt: "2026-05-12T20:00:00.000Z",
    });

    expect(record).toMatchObject({
      id: "do_not_merge_job_a_job_b",
      jobIdA: "job_a",
      jobIdB: "job_b",
    });
    expect(hasDoNotMergeDecision([record], "job_a", "job_b")).toBe(true);
    expect(hasDoNotMergeDecision([record], "job_b", "job_a")).toBe(true);
  });

  it("creates, lists, and records an event", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-do-not-merge-"));

    const record = await createDoNotMergeDecision(tempDir, {
      jobIdA: "job_1",
      jobIdB: "job_2",
      reason: "Different locations",
      createdAt: "2026-05-12T20:00:00.000Z",
    });

    await expect(listDoNotMergeDecisions(tempDir)).resolves.toEqual([record]);

    const events = await readEvents(createStoragePaths(tempDir).eventsFile, EventRecordSchema);
    expect(events.events).toContainEqual(
      expect.objectContaining({
        type: "job.do_not_merge_created",
        jobId: "job_1",
        payload: expect.objectContaining({
          otherJobId: "job_2",
          doNotMergeId: "do_not_merge_job_1_job_2",
        }),
      }),
    );
  });
});
