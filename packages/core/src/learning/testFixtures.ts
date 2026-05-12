import type { JobRecord, SessionRecord, SourceListingRecord } from "../schemas/index.js";

export function createLearningJob(
  id: string,
  scoreTotal: number,
  signals: { positiveSignalId?: string; negativeSignalId?: string } = {},
  sourceListingIds: string[] = [],
): JobRecord {
  return {
    schemaVersion: 1,
    id,
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "candidate",
    workType: "remote",
    sourceListingIds,
    score: {
      total: scoreTotal,
      buckets: [],
      positiveSignals: signals.positiveSignalId
        ? [
            {
              id: signals.positiveSignalId,
              label: signalLabel(signals.positiveSignalId),
              polarity: "positive",
              source: "description",
              weight: 10,
            },
          ]
        : [],
      negativeSignals: signals.negativeSignalId
        ? [
            {
              id: signals.negativeSignalId,
              label: signalLabel(signals.negativeSignalId),
              polarity: "negative",
              source: "title",
              weight: -10,
            },
          ]
        : [],
      surfacedReason: "AI builder fit",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  };
}

export function createSession(id: string): SessionRecord {
  return {
    schemaVersion: 1,
    id,
    startedAt: "2026-05-12T20:00:00.000Z",
    command: "discover",
    reviewedJobIds: [],
    skippedJobIds: [],
    sessionAdjustments: [],
    metrics: {
      fetched: 0,
      uniqueAfterDedupe: 0,
      reviewed: 0,
      yes: 0,
      maybe: 0,
      no: 0,
    },
  };
}

export function createSourceListing(id: string, jobId: string, sourceId: string): SourceListingRecord {
  return {
    schemaVersion: 1,
    id,
    jobId,
    sourceId,
    sourceType: "ats",
    adapter: "ashby",
    sourceUrl: `https://example.com/${id}`,
    firstSeenAt: "2026-05-12T20:00:00.000Z",
    fetchStatus: "ok",
    normalizedMetadata: {
      title: "Product Builder",
      company: "Example AI",
    },
  };
}

function signalLabel(signalId: string): string {
  return signalId.replace(/[._]/g, " ");
}
