import type {
  Adapter,
  CandidateMetadata,
  SourceListingRecord,
  SourceRecord,
  WorkType,
} from "../schemas/index.js";

export type RawCandidateInput = {
  title: string;
  company: string;
  sourceId: string;
  sourceType: SourceRecord["type"];
  adapter: Adapter;
  sourceUrl: string;
  externalId?: string;
  location?: string;
  workType?: WorkType;
  compensationRaw?: string;
  compensationMin?: number;
  compensationMax?: number;
  currency?: string;
  postedDate?: string;
  sourcePostedDateRaw?: string;
  fetchStatus?: SourceListingRecord["fetchStatus"];
  errorMessage?: string;
};

export type NormalizedCandidate = RawCandidateInput & {
  normalizedCompany: string;
  normalizedTitle: string;
  normalizedUrl: string;
  normalizedLocation?: string;
  normalizedWorkType: WorkType;
  normalizedMetadata: CandidateMetadata;
};

export function normalizeCandidate(input: RawCandidateInput): NormalizedCandidate {
  const normalizedWorkType = normalizeWorkType(input.workType, input.location);
  const normalizedLocation = input.location ? normalizeLocation(input.location) : undefined;
  const normalizedMetadata: CandidateMetadata = {
    title: input.title,
    company: input.company,
    ...(input.location ? { location: input.location } : {}),
    ...(normalizedWorkType !== "unknown" ? { workType: normalizedWorkType } : {}),
    ...(input.compensationRaw ? { compensationRaw: input.compensationRaw } : {}),
    ...(typeof input.compensationMin === "number" ? { compensationMin: input.compensationMin } : {}),
    ...(typeof input.compensationMax === "number" ? { compensationMax: input.compensationMax } : {}),
    ...(input.currency ? { currency: input.currency } : {}),
    ...(input.postedDate ? { postedDate: input.postedDate } : {}),
    ...(input.sourcePostedDateRaw ? { sourcePostedDateRaw: input.sourcePostedDateRaw } : {}),
  };

  return {
    ...input,
    normalizedCompany: normalizeCompany(input.company),
    normalizedTitle: normalizeTitle(input.title),
    normalizedUrl: normalizeUrl(input.sourceUrl),
    normalizedLocation,
    normalizedWorkType,
    normalizedMetadata,
  };
}

export function normalizeCompany(company: string): string {
  return collapseWhitespace(
    company
      .toLowerCase()
      .replace(/[.,]+$/g, "")
      .replace(/\s*,?\s+(inc|incorporated|llc|ltd|corp|corporation|co)\.?$/i, "")
      .trim(),
  );
}

export function normalizeTitle(title: string): string {
  return collapseWhitespace(
    title
      .toLowerCase()
      .replace(/[-_/|]+/g, " ")
      .replace(/[^\p{L}\p{N}\s.+#]/gu, "")
      .trim(),
  );
}

export function normalizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      if (isTrackingParam(key)) {
        url.searchParams.delete(key);
      }
    }

    url.searchParams.sort();
    url.pathname = url.pathname.replace(/\/+$/g, "");
    return url.toString();
  } catch {
    return rawUrl.trim().replace(/\/+$/g, "").toLowerCase();
  }
}

export function normalizeLocation(location: string): string {
  const lower = location.toLowerCase();
  if (/\bremote\b/.test(lower)) {
    return "remote";
  }

  return collapseWhitespace(lower.replace(/[^\p{L}\p{N}\s]/gu, " ").trim());
}

export function normalizeWorkType(workType?: WorkType, location?: string): WorkType {
  if (workType && workType !== "unknown") {
    return workType;
  }

  const locationText = location?.toLowerCase() ?? "";
  if (/\bremote\b/.test(locationText)) {
    return "remote";
  }
  if (/\bhybrid\b/.test(locationText)) {
    return "hybrid";
  }
  if (/\bonsite\b|\bon-site\b|\bin office\b/.test(locationText)) {
    return "onsite";
  }

  return "unknown";
}

function isTrackingParam(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return (
    normalizedKey.startsWith("utm_") ||
    ["gh_src", "source", "ref", "referrer", "trk", "tracking"].includes(normalizedKey)
  );
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
