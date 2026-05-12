import type { JobRecord, SourceListingRecord, SourceRecord } from "../schemas/index.js";
import type { TransientDescriptionKind } from "../discovery/index.js";

export type ReviewQueueItem = {
  job: JobRecord;
  sourceListings: SourceListingRecord[];
  sources: SourceRecord[];
  transientDescription?: string;
  transientDescriptionKind?: TransientDescriptionKind;
};

export type CreateReviewQueueOptions = {
  limit?: number;
  includeMaybe?: boolean;
};

export function createReviewQueue(
  jobs: JobRecord[],
  sourceListings: SourceListingRecord[] = [],
  sources: SourceRecord[] = [],
  options: CreateReviewQueueOptions = {},
): ReviewQueueItem[] {
  const allowedStatuses = new Set(options.includeMaybe ? ["candidate", "maybe"] : ["candidate"]);

  return jobs
    .filter((job) => allowedStatuses.has(job.lifecycleStatus))
    .sort((left, right) => right.score.total - left.score.total)
    .slice(0, options.limit ?? jobs.length)
    .map((job) => ({
      job,
      sourceListings: sourceListings.filter((listing) => job.sourceListingIds.includes(listing.id)),
      sources: sources.filter((source) =>
        sourceListings.some(
          (listing) => job.sourceListingIds.includes(listing.id) && listing.sourceId === source.id,
        ),
      ),
    }));
}
