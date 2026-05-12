import type { JobRecord, LifecycleStatus } from "../schemas/index.js";

export function createJob(overrides: Partial<JobRecord> = {}): JobRecord {
  return {
    schemaVersion: 1,
    id: "job_1",
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "candidate" as LifecycleStatus,
    workType: "remote",
    sourceListingIds: [],
    score: {
      total: 82,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "Strong title and AI coding signal",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
    ...overrides,
  };
}
