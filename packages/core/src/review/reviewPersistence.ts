import path from "node:path";
import { createHash } from "node:crypto";

import {
  EventRecordSchema,
  JobRecordSchema,
  SessionRecordSchema,
  type EventRecord,
  type JobRecord,
  type ReviewLabel,
  type SessionRecord,
} from "../schemas/index.js";
import {
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../storage/index.js";
import { applyReviewTransition } from "./lifecycle.js";

export type PersistReviewInput = {
  dataDir: string;
  jobId: string;
  reviewLabel: ReviewLabel;
  now: string;
  notes?: string[];
  sessionId?: string;
};

export type PersistReviewResult = {
  job: JobRecord;
  event: EventRecord;
};

export type RecordSessionInterruptedInput = {
  dataDir: string;
  sessionId?: string;
  now: string;
  reviewedJobIds: string[];
  skippedJobIds?: string[];
  reason: string;
};

export async function persistReviewLabel(input: PersistReviewInput): Promise<PersistReviewResult> {
  const paths = createStoragePaths(input.dataDir);
  const jobFile = path.join(paths.jobsDir, `${input.jobId}.json`);
  const previous = await readJsonFile(jobFile, JobRecordSchema);
  const job = applyReviewTransition({
    job: previous,
    reviewLabel: input.reviewLabel,
    notes: input.notes,
    now: input.now,
  });
  await atomicWriteJson(jobFile, JobRecordSchema, job);

  const payload = {
    reviewLabel: input.reviewLabel,
    lifecycleStatus: job.lifecycleStatus,
    previousLifecycleStatus: previous.lifecycleStatus,
    ...(previous.currentReviewLabel ? { previousReviewLabel: previous.currentReviewLabel } : {}),
    ...(input.notes?.length ? { notes: input.notes } : {}),
  };
  const event = await appendEvent(paths.eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: `event_${hash("job.reviewed", input.jobId, input.now, input.sessionId ?? "")}`,
    timestamp: input.now,
    actor: "user",
    type: "job.reviewed",
    jobId: input.jobId,
    sessionId: input.sessionId,
    payload,
  });

  return { job, event };
}

export async function recordSessionInterrupted(
  input: RecordSessionInterruptedInput,
): Promise<EventRecord> {
  const paths = createStoragePaths(input.dataDir);
  if (input.sessionId) {
    await updateInterruptedSession(input).catch(() => undefined);
  }

  return appendEvent(paths.eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: `event_${hash("session.interrupted", input.sessionId ?? "none", input.now)}`,
    timestamp: input.now,
    actor: "system",
    type: "session.interrupted",
    sessionId: input.sessionId,
    payload: {
      reviewedJobIds: input.reviewedJobIds,
      skippedJobIds: input.skippedJobIds ?? [],
      reason: input.reason,
    },
  });
}

async function updateInterruptedSession(input: RecordSessionInterruptedInput): Promise<SessionRecord> {
  const paths = createStoragePaths(input.dataDir);
  const sessionFile = path.join(paths.sessionsDir, `${input.sessionId}.json`);
  const previous = await readJsonFile(sessionFile, SessionRecordSchema);
  const reviewedJobIds = unique([...previous.reviewedJobIds, ...input.reviewedJobIds]);
  const skippedJobIds = unique([...previous.skippedJobIds, ...(input.skippedJobIds ?? [])]);
  const session = SessionRecordSchema.parse({
    ...previous,
    endedAt: input.now,
    reviewedJobIds,
    skippedJobIds,
    metrics: {
      ...previous.metrics,
      reviewed: reviewedJobIds.length,
    },
  });
  return atomicWriteJson(sessionFile, SessionRecordSchema, session);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
