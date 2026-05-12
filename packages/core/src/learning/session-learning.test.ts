import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EventRecordSchema,
  SessionRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  readEvents,
  readJsonFile,
} from "../index.js";
import {
  deriveSessionAdjustments,
  learnFromSessionFeedback,
  rankJobsWithSessionAdjustments,
  restoreOriginalRanking,
} from "./sessionLearning.js";
import { createLearningJob, createSession } from "./testFixtures.js";

describe("session learning", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("applies penalties for repeated negative signals and boosts for repeated positive signals within a session", () => {
    const adjustments = deriveSessionAdjustments(
      [
        { job: createLearningJob("job_yes", 70, { positiveSignalId: "tool.claude_code" }), label: "yes" },
        { job: createLearningJob("job_maybe", 68, { positiveSignalId: "tool.claude_code" }), label: "maybe" },
        { job: createLearningJob("job_no_1", 65, { negativeSignalId: "exclude.devrel" }), label: "no" },
        { job: createLearningJob("job_no_2", 64, { negativeSignalId: "exclude.devrel" }), label: "no" },
      ],
      "2026-05-12T22:00:00.000Z",
    );

    expect(adjustments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ signalId: "tool.claude_code", delta: 5 }),
        expect.objectContaining({ signalId: "exclude.devrel", delta: -6 }),
      ]),
    );
    expect(rankJobsWithSessionAdjustments([
      createLearningJob("job_shared_positive", 70, { positiveSignalId: "tool.claude_code" }),
      createLearningJob("job_shared_negative", 74, { negativeSignalId: "exclude.devrel" }),
    ], adjustments).map((item) => item.job.id)).toEqual(["job_shared_positive", "job_shared_negative"]);
  });

  it("writes scoring.session_adjusted events and stores adjustments in the active session record", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-session-learning-"));
    const paths = createStoragePaths(tempDir);
    await atomicWriteJson(path.join(paths.sessionsDir, "session_1.json"), SessionRecordSchema, createSession("session_1"));

    const result = await learnFromSessionFeedback({
      dataDir: tempDir,
      sessionId: "session_1",
      now: "2026-05-12T22:00:00.000Z",
      feedback: [
        { job: createLearningJob("job_yes", 70, { positiveSignalId: "tool.claude_code" }), label: "yes" },
      ],
      remainingJobs: [createLearningJob("job_next", 70, { positiveSignalId: "tool.claude_code" })],
    });

    expect(result.adjustments).toHaveLength(1);
    await expect(readJsonFile(path.join(paths.sessionsDir, "session_1.json"), SessionRecordSchema)).resolves.toMatchObject({
      sessionAdjustments: [expect.objectContaining({ signalId: "tool.claude_code" })],
    });
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events).toEqual([expect.objectContaining({ type: "scoring.session_adjusted", sessionId: "session_1" })]);
  });

  it("restores pre-adjustment ranking state within the current session", () => {
    const jobs = [
      createLearningJob("job_lower_boosted", 70, { positiveSignalId: "tool.claude_code" }),
      createLearningJob("job_higher_original", 72),
    ];
    const adjustments = deriveSessionAdjustments(
      [{ job: createLearningJob("job_yes", 80, { positiveSignalId: "tool.claude_code" }), label: "yes" }],
      "2026-05-12T22:00:00.000Z",
    );

    expect(rankJobsWithSessionAdjustments(jobs, adjustments)[0]?.job.id).toBe("job_lower_boosted");
    expect(restoreOriginalRanking(jobs)[0]?.job.id).toBe("job_higher_original");
  });
});
