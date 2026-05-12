import path from "node:path";
import { createHash } from "node:crypto";

import {
  EventRecordSchema,
  SessionRecordSchema,
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

export type ReviewFeedback = {
  job: JobRecord;
  label: ReviewLabel;
  sourceId?: string;
};

export type SessionAdjustment = SessionRecord["sessionAdjustments"][number];

export type LearnFromSessionFeedbackInput = {
  dataDir: string;
  sessionId: string;
  feedback: ReviewFeedback[];
  remainingJobs: JobRecord[];
  now: string;
};

export type RankedJob = {
  job: JobRecord;
  adjustedScore: number;
};

export async function learnFromSessionFeedback(
  input: LearnFromSessionFeedbackInput,
): Promise<{ adjustments: SessionAdjustment[]; rankedJobs: RankedJob[] }> {
  const paths = createStoragePaths(input.dataDir);
  const sessionFile = path.join(paths.sessionsDir, `${input.sessionId}.json`);
  const session = await readJsonFile(sessionFile, SessionRecordSchema);
  const adjustments = deriveSessionAdjustments(input.feedback, input.now);
  const nextSession = SessionRecordSchema.parse({
    ...session,
    sessionAdjustments: [...session.sessionAdjustments, ...adjustments],
  });

  await atomicWriteJson(sessionFile, SessionRecordSchema, nextSession);
  for (const adjustment of adjustments) {
    await appendEvent(paths.eventsFile, EventRecordSchema, {
      schemaVersion: 1,
      id: `event_${adjustment.id}`,
      timestamp: adjustment.createdAt,
      actor: "system",
      type: "scoring.session_adjusted",
      sessionId: input.sessionId,
      sourceId: adjustment.sourceId,
      payload: {
        signalId: adjustment.signalId,
        sourceId: adjustment.sourceId,
        delta: adjustment.delta,
        reason: adjustment.reason,
        reversible: adjustment.reversible,
      },
    });
  }

  return {
    adjustments,
    rankedJobs: rankJobsWithSessionAdjustments(input.remainingJobs, adjustments),
  };
}

export function deriveSessionAdjustments(feedback: ReviewFeedback[], now: string): SessionAdjustment[] {
  const adjustments: SessionAdjustment[] = [];
  const positiveSignals = new Map<string, { label: string; count: number }>();
  const repeatedNegativeSignals = new Map<string, { label: string; count: number }>();
  const rejectedSources = new Map<string, number>();

  for (const item of feedback) {
    if (item.label === "yes" || item.label === "maybe") {
      for (const signal of item.job.score.positiveSignals.slice(0, 2)) {
        positiveSignals.set(signal.id, {
          label: signal.label,
          count: (positiveSignals.get(signal.id)?.count ?? 0) + 1,
        });
      }
    }

    if (item.label === "no") {
      for (const signal of item.job.score.negativeSignals) {
        repeatedNegativeSignals.set(signal.id, {
          label: signal.label,
          count: (repeatedNegativeSignals.get(signal.id)?.count ?? 0) + 1,
        });
      }
      if (item.sourceId) {
        rejectedSources.set(item.sourceId, (rejectedSources.get(item.sourceId) ?? 0) + 1);
      }
    }
  }

  for (const [signalId, signal] of positiveSignals) {
    adjustments.push(createAdjustment({
      now,
      signalId,
      delta: signal.count >= 2 ? 5 : 3,
      reason: `Boost shared positive signal: ${signal.label}`,
    }));
  }

  for (const [signalId, signal] of repeatedNegativeSignals) {
    if (signal.count < 2) continue;
    adjustments.push(createAdjustment({
      now,
      signalId,
      delta: -6,
      reason: `Penalize repeated negative signal: ${signal.label}`,
    }));
  }

  for (const [sourceId, count] of rejectedSources) {
    if (count < 2) continue;
    adjustments.push(createAdjustment({
      now,
      sourceId,
      delta: -4,
      reason: `Penalize repeatedly rejected source: ${sourceId}`,
    }));
  }

  return adjustments;
}

export function rankJobsWithSessionAdjustments(
  jobs: JobRecord[],
  adjustments: SessionAdjustment[],
): RankedJob[] {
  return jobs
    .map((job) => ({
      job,
      adjustedScore: clampScore(job.score.total + adjustmentDeltaForJob(job, adjustments)),
    }))
    .sort((left, right) => right.adjustedScore - left.adjustedScore);
}

export function restoreOriginalRanking(jobs: JobRecord[]): RankedJob[] {
  return jobs
    .map((job) => ({ job, adjustedScore: job.score.total }))
    .sort((left, right) => right.adjustedScore - left.adjustedScore);
}

function adjustmentDeltaForJob(job: JobRecord, adjustments: SessionAdjustment[]): number {
  const signalIds = new Set([
    ...job.score.positiveSignals.map((signal) => signal.id),
    ...job.score.negativeSignals.map((signal) => signal.id),
  ]);
  return adjustments.reduce((total, adjustment) => {
    if (adjustment.signalId && signalIds.has(adjustment.signalId)) return total + adjustment.delta;
    return total;
  }, 0);
}

function createAdjustment(input: {
  now: string;
  signalId?: string;
  sourceId?: string;
  delta: number;
  reason: string;
}): SessionAdjustment {
  return {
    id: `adjustment_${hash(input.signalId ?? input.sourceId ?? input.reason, input.now, String(input.delta))}`,
    createdAt: input.now,
    ...(input.signalId ? { signalId: input.signalId } : {}),
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    delta: input.delta,
    reason: input.reason,
    reversible: true,
  };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}
