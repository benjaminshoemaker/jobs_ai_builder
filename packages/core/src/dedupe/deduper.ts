import type { NormalizedCandidate } from "../normalize/index.js";
import type { JobRecord, SourceListingRecord } from "../schemas/index.js";
import {
  canonicalListingUrl,
  companyTitleMatches,
  locationOrWorkTypeOverlaps,
} from "./canonicalize.js";

export type DedupeDecision =
  | { action: "merge"; jobId: string; reason: "same_external_id" | "same_normalized_url" | "same_company_title_overlap" }
  | { action: "create"; reason: "no_match" };

export function decideDeduplication(
  candidate: NormalizedCandidate,
  existingJobs: JobRecord[],
  existingListings: SourceListingRecord[],
): DedupeDecision {
  const externalIdMatch = findExternalIdMatch(candidate, existingListings);
  if (externalIdMatch) {
    return {
      action: "merge",
      jobId: externalIdMatch.jobId,
      reason: "same_external_id",
    };
  }

  const urlMatch = existingListings.find(
    (listing) => canonicalListingUrl(listing) === candidate.normalizedUrl,
  );
  if (urlMatch) {
    return {
      action: "merge",
      jobId: urlMatch.jobId,
      reason: "same_normalized_url",
    };
  }

  const metadataMatch = existingJobs.find(
    (job) => companyTitleMatches(job, candidate) && locationOrWorkTypeOverlaps(job, candidate),
  );
  if (metadataMatch) {
    return {
      action: "merge",
      jobId: metadataMatch.id,
      reason: "same_company_title_overlap",
    };
  }

  return { action: "create", reason: "no_match" };
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
