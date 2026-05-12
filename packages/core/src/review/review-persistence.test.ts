import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readEvents,
} from "../index.js";
import { persistReviewLabel } from "./reviewPersistence.js";
import { createJob } from "./testFixtures.js";

describe("review persistence", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("writes job.reviewed events and preserves prior label/status history", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-review-persistence-"));
    const paths = createStoragePaths(tempDir);
    const original = createJob({ id: "job_1", lifecycleStatus: "candidate" });
    await atomicWriteJson(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema, original);

    await persistReviewLabel({
      dataDir: tempDir,
      jobId: "job_1",
      reviewLabel: "yes",
      now: "2026-05-12T21:00:00.000Z",
      notes: ["excellent AI builder fit"],
      sessionId: "session_1",
    });
    await persistReviewLabel({
      dataDir: tempDir,
      jobId: "job_1",
      reviewLabel: "maybe",
      now: "2026-05-12T21:05:00.000Z",
      sessionId: "session_1",
    });

    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      type: "job.reviewed",
      jobId: "job_1",
      payload: {
        reviewLabel: "yes",
        lifecycleStatus: "active",
        previousLifecycleStatus: "candidate",
        notes: ["excellent AI builder fit"],
      },
    });
    expect(events[1]).toMatchObject({
      payload: {
        reviewLabel: "maybe",
        lifecycleStatus: "maybe",
        previousReviewLabel: "yes",
        previousLifecycleStatus: "active",
      },
    });
  });

  it("does not require existing unrelated events to persist a review", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-review-persistence-"));
    const paths = createStoragePaths(tempDir);
    await atomicWriteJson(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema, createJob({ id: "job_1" }));
    await appendEvent(paths.eventsFile, EventRecordSchema, {
      schemaVersion: 1,
      id: "event_prior",
      timestamp: "2026-05-12T20:55:00.000Z",
      actor: "system",
      type: "job.discovered",
      jobId: "job_1",
      payload: {},
    });

    await expect(
      persistReviewLabel({
        dataDir: tempDir,
        jobId: "job_1",
        reviewLabel: "no",
        now: "2026-05-12T21:00:00.000Z",
      }),
    ).resolves.toMatchObject({ job: { lifecycleStatus: "rejected", currentReviewLabel: "no" } });
  });
});
