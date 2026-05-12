import type { NormalizedCandidate } from "../normalize/index.js";
import type { DoNotMergeRecord, JobRecord, SourceListingRecord } from "../schemas/index.js";
import {
  canonicalListingUrl,
  companyTitleMatches,
  locationOrWorkTypeOverlaps,
} from "./canonicalize.js";
import { hasDoNotMergeDecision } from "./doNotMerge.js";

export type DedupeDecision =
  | { action: "merge"; jobId: string; reason: "same_external_id" | "same_normalized_url" | "same_company_title_overlap" }
  | { action: "create"; reason: "no_match" | "do_not_merge" };

export type DedupeOptions = {
  candidateJobId?: string;
  doNotMergeRecords?: DoNotMergeRecord[];
};

export function decideDeduplication(
  candidate: NormalizedCandidate,
  existingJobs: JobRecord[],
  existingListings: SourceListingRecord[],
  options: DedupeOptions = {},
): DedupeDecision {
  const externalIdMatch = findExternalIdMatch(candidate, existingListings);
  if (externalIdMatch) {
    return mergeUnlessBlocked(externalIdMatch.jobId, "same_external_id", options);
  }

  const urlMatch = existingListings.find(
    (listing) => canonicalListingUrl(listing) === candidate.normalizedUrl,
  );
  if (urlMatch) {
    return mergeUnlessBlocked(urlMatch.jobId, "same_normalized_url", options);
  }

  const metadataMatch = existingJobs.find(
    (job) => companyTitleMatches(job, candidate) && locationOrWorkTypeOverlaps(job, candidate),
  );
  if (metadataMatch) {
    return mergeUnlessBlocked(metadataMatch.id, "same_company_title_overlap", options);
  }

  return { action: "create", reason: "no_match" };
}

function mergeUnlessBlocked(
  jobId: string,
  reason: Extract<DedupeDecision, { action: "merge" }>["reason"],
  options: DedupeOptions,
): DedupeDecision {
  if (
    options.candidateJobId &&
    hasDoNotMergeDecision(options.doNotMergeRecords ?? [], options.candidateJobId, jobId)
  ) {
    return { action: "create", reason: "do_not_merge" };
  }

  return { action: "merge", jobId, reason };
}

export function createSourceListingRecord(
  candidate: NormalizedCandidate,
  options: {
    id: string;
    jobId: string;
    now: string;
  },
): SourceListingRecord {
  return {
    schemaVersion: 1,
    id: options.id,
    jobId: options.jobId,
    sourceId: candidate.sourceId,
    sourceType: candidate.sourceType,
    adapter: candidate.adapter,
    sourceUrl: candidate.sourceUrl,
    ...(candidate.externalId ? { externalId: candidate.externalId } : {}),
    firstSeenAt: options.now,
    fetchStatus: candidate.fetchStatus ?? "ok",
    ...(candidate.errorMessage ? { errorMessage: candidate.errorMessage } : {}),
    normalizedMetadata: candidate.normalizedMetadata,
  };
}

function findExternalIdMatch(
  candidate: NormalizedCandidate,
  existingListings: SourceListingRecord[],
): SourceListingRecord | undefined {
  if (!candidate.externalId) {
    return undefined;
  }

  return existingListings.find(
    (listing) =>
      listing.externalId === candidate.externalId &&
      (listing.sourceId === candidate.sourceId || listing.adapter === candidate.adapter),
  );
}
