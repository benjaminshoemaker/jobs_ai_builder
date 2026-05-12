import type { JobRecord, ReviewLabel, SessionRecord, SourceListingRecord } from "../schemas/index.js";

export type ReviewedOutcome = {
  jobId: string;
  label: ReviewLabel;
};

export type EvaluationMetrics = SessionRecord["metrics"] & {
  sourceAcceptanceRates: NonNullable<SessionRecord["metrics"]["sourceAcceptanceRates"]>;
};

export function calculateEvaluationMetrics(input: {
  fetched: number;
  uniqueAfterDedupe: number;
  outcomes: ReviewedOutcome[];
  jobs: JobRecord[];
  sourceListings: SourceListingRecord[];
}): EvaluationMetrics {
  const yes = input.outcomes.filter((outcome) => outcome.label === "yes").length;
  const maybe = input.outcomes.filter((outcome) => outcome.label === "maybe").length;
  const no = input.outcomes.filter((outcome) => outcome.label === "no").length;
  const reviewed = input.outcomes.length;

  return {
    fetched: input.fetched,
    uniqueAfterDedupe: input.uniqueAfterDedupe,
    reviewed,
    yes,
    maybe,
    no,
    ...(reviewed > 0 ? { precisionAt10: (yes + maybe) / reviewed } : {}),
    sourceAcceptanceRates: calculateSourceAcceptanceRates(input),
  };
}

function calculateSourceAcceptanceRates(input: {
  outcomes: ReviewedOutcome[];
  jobs: JobRecord[];
  sourceListings: SourceListingRecord[];
}): NonNullable<SessionRecord["metrics"]["sourceAcceptanceRates"]> {
  const bySource = new Map<string, { reviewed: number; accepted: number }>();
  for (const outcome of input.outcomes) {
    const job = input.jobs.find((item) => item.id === outcome.jobId);
    if (!job) continue;
    const sourceIds = input.sourceListings
      .filter((listing) => job.sourceListingIds.includes(listing.id))
      .map((listing) => listing.sourceId);
    for (const sourceId of sourceIds) {
      const current = bySource.get(sourceId) ?? { reviewed: 0, accepted: 0 };
      current.reviewed += 1;
      if (outcome.label === "yes" || outcome.label === "maybe") {
        current.accepted += 1;
      }
      bySource.set(sourceId, current);
    }
  }

  return [...bySource.entries()]
    .map(([sourceId, counts]) => ({
      sourceId,
      reviewed: counts.reviewed,
      accepted: counts.accepted,
      acceptanceRate: counts.reviewed > 0 ? counts.accepted / counts.reviewed : 0,
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}
