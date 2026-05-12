import {
  normalizeCompany,
  normalizeLocation,
  normalizeTitle,
  normalizeUrl,
} from "../normalize/index.js";
import type { JobRecord, SourceListingRecord, WorkType } from "../schemas/index.js";
import type { NormalizedCandidate } from "../normalize/index.js";

export type CanonicalJobKey = {
  company: string;
  title: string;
  location?: string;
  workType: WorkType;
};

export function canonicalJobKey(job: Pick<JobRecord, "company" | "title" | "location" | "workType">): CanonicalJobKey {
  return {
    company: normalizeCompany(job.company),
    title: normalizeTitle(job.title),
    location: job.location ? normalizeLocation(job.location) : undefined,
    workType: job.workType,
  };
}

export function canonicalCandidateKey(candidate: NormalizedCandidate): CanonicalJobKey {
  return {
    company: candidate.normalizedCompany,
    title: candidate.normalizedTitle,
    location: candidate.normalizedLocation,
    workType: candidate.normalizedWorkType,
  };
}

export function canonicalListingUrl(listing: Pick<SourceListingRecord, "sourceUrl">): string {
  return normalizeUrl(listing.sourceUrl);
}

export function companyTitleMatches(
  job: Pick<JobRecord, "company" | "title" | "location" | "workType">,
  candidate: NormalizedCandidate,
): boolean {
  const jobKey = canonicalJobKey(job);
  const candidateKey = canonicalCandidateKey(candidate);
  return jobKey.company === candidateKey.company && jobKey.title === candidateKey.title;
}

export function locationOrWorkTypeOverlaps(
  job: Pick<JobRecord, "location" | "workType">,
  candidate: NormalizedCandidate,
): boolean {
  const jobLocation = job.location ? normalizeLocation(job.location) : undefined;
  const candidateLocation = candidate.normalizedLocation;
  const locationsOverlap = Boolean(jobLocation && candidateLocation && jobLocation === candidateLocation);
  const workTypesOverlap =
    job.workType !== "unknown" &&
    candidate.normalizedWorkType !== "unknown" &&
    job.workType === candidate.normalizedWorkType;

  return locationsOverlap || workTypesOverlap;
}
