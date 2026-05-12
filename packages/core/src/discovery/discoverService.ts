import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { z } from "zod";

import {
  JobRecordSchema,
  SessionRecordSchema,
  SourceListingRecordSchema,
  type AppConfig,
  type JobRecord,
  type SessionRecord,
  type SourceListingRecord,
  type SourceRecord,
} from "../schemas/index.js";
import { normalizeCandidate, type NormalizedCandidate } from "../normalize/index.js";
import { scoreCandidate } from "../scoring/index.js";
import {
  createSourceListingRecord,
  decideDeduplication,
} from "../dedupe/index.js";
import {
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../storage/index.js";
import {
  fetchSourcesWithFailureHandling,
  type SourceAdapter,
  type SourceCandidate,
} from "../sources/index.js";
import { roundRobin } from "./candidateSelection.js";

export type DiscoverRegistry = {
  enabledSources(sources: SourceRecord[]): Array<{ source: SourceRecord; adapter: SourceAdapter }>;
};

export type DiscoverJobsInput = {
  dataDir: string;
  config: AppConfig;
  sources: SourceRecord[];
  registry: DiscoverRegistry;
  now: string;
  interactive: false;
  allowPartialSources?: boolean;
  includeRejected?: boolean;
  includeArchived?: boolean;
  includeReviewed?: boolean;
};

export type DiscoverJobsResult = {
  status: "ok" | "no_new_candidates";
  fetched: number;
  uniqueAfterDedupe: number;
  selected: JobRecord[];
  session: SessionRecord;
};

export async function discoverJobs(input: DiscoverJobsInput): Promise<DiscoverJobsResult> {
  const paths = createStoragePaths(input.dataDir);
  const enabled = input.registry.enabledSources(input.sources).filter(({ source }) =>
    source.cooldownUntil ? source.cooldownUntil <= input.now : true,
  );
  const perSourceResults = await Promise.all(
    enabled.map(async ({ source, adapter }) => {
      const result = await fetchSourcesWithFailureHandling(
        [
          {
            adapter,
            ctx: {
              now: input.now,
              config: input.config,
              source,
              limit: input.config.fetchLimit,
              query: source.defaultQuery,
            },
          },
        ],
        { allowPartialSources: input.allowPartialSources ?? true, eventsFile: paths.eventsFile },
      ).catch(() => ({ candidates: [] as SourceCandidate[], failures: [] }));
      return result.candidates;
    }),
  );
  const fetchedCandidates = roundRobin(perSourceResults, input.config.fetchLimit);
  const existingJobs = await readRecords(paths.jobsDir, JobRecordSchema);
  const existingListings = await readRecords(paths.sourceListingsDir, SourceListingRecordSchema);
  const selected: Array<{ job: JobRecord; listing: SourceListingRecord }> = [];
  let uniqueAfterDedupe = 0;

  for (const sourceCandidate of fetchedCandidates) {
    const normalized = normalizeSourceCandidate(sourceCandidate);
    const decision = decideDeduplication(
      normalized,
      [...existingJobs, ...selected.map((item) => item.job)],
      existingListings,
    );
    if (decision.action === "merge") {
      const matched = [...existingJobs, ...selected.map((item) => item.job)].find(
        (job) => job.id === decision.jobId,
      );
      if (matched && shouldSkipExisting(matched, input)) {
        continue;
      }
      continue;
    }

    uniqueAfterDedupe += 1;
    const listingId = `listing_${hash(normalized.sourceId, normalized.normalizedUrl)}`;
    const job = createJobRecord(normalized, input.now, listingId);
    const listing = createSourceListingRecord(normalized, {
      id: listingId,
      jobId: job.id,
      now: input.now,
    });
    selected.push({ job, listing });
  }

  const ranked = selected
    .sort((left, right) => right.job.score.total - left.job.score.total)
    .slice(0, input.config.reviewLimit);

  for (const { job, listing } of ranked) {
    await atomicWriteJson(path.join(paths.jobsDir, `${job.id}.json`), JobRecordSchema, job);
    await atomicWriteJson(
      path.join(paths.sourceListingsDir, `${listing.id}.json`),
      SourceListingRecordSchema,
      listing,
    );
  }

  const session = createSession(input.now, fetchedCandidates.length, uniqueAfterDedupe, ranked.length);
  await atomicWriteJson(path.join(paths.sessionsDir, `${session.id}.json`), SessionRecordSchema, session);

  return {
    status: ranked.length > 0 ? "ok" : "no_new_candidates",
    fetched: fetchedCandidates.length,
    uniqueAfterDedupe,
    selected: ranked.map((item) => item.job),
    session,
  };
}

function normalizeSourceCandidate(candidate: SourceCandidate): NormalizedCandidate {
  return normalizeCandidate({
    title: candidate.metadata.title,
    company: candidate.metadata.company,
    sourceId: candidate.source.id,
    sourceType: candidate.source.type,
    adapter: candidate.source.adapter,
    sourceUrl: candidate.sourceUrl,
    externalId: candidate.externalId,
    location: candidate.metadata.location,
    workType: candidate.metadata.workType,
    compensationRaw: candidate.metadata.compensationRaw,
    compensationMin: candidate.metadata.compensationMin,
    compensationMax: candidate.metadata.compensationMax,
    currency: candidate.metadata.currency,
    postedDate: candidate.metadata.postedDate,
    sourcePostedDateRaw: candidate.metadata.sourcePostedDateRaw,
    fetchStatus: candidate.fetchStatus,
    errorMessage: candidate.errorMessage,
  });
}

function createJobRecord(candidate: NormalizedCandidate, now: string, listingId: string): JobRecord {
  const id = `job_${hash(candidate.normalizedCompany, candidate.normalizedTitle, candidate.normalizedUrl)}`;
  return JobRecordSchema.parse({
    schemaVersion: 1,
    id,
    title: candidate.title,
    company: candidate.company,
    discoveredAt: now,
    updatedAt: now,
    lifecycleStatus: "candidate",
    ...(candidate.location ? { location: candidate.location } : {}),
    workType: candidate.normalizedWorkType,
    compensation: candidate.compensationRaw
      ? { raw: candidate.compensationRaw, min: candidate.compensationMin, max: candidate.compensationMax }
      : undefined,
    postedDate: candidate.postedDate,
    sourceListingIds: [listingId],
    score: scoreCandidate({
      title: candidate.title,
      company: candidate.company,
      location: candidate.location,
      workType: candidate.normalizedWorkType,
      compensationMin: candidate.compensationMin,
      compensationMax: candidate.compensationMax,
    }),
  });
}

function shouldSkipExisting(job: JobRecord, input: DiscoverJobsInput): boolean {
  if (job.currentReviewLabel && !input.includeReviewed) return true;
  if (job.lifecycleStatus === "rejected" && !input.includeRejected) return true;
  if (job.lifecycleStatus === "archived" && !input.includeArchived) return true;
  return true;
}

function createSession(now: string, fetched: number, uniqueAfterDedupe: number, selected: number): SessionRecord {
  return SessionRecordSchema.parse({
    schemaVersion: 1,
    id: `session_${hash(now, String(fetched), String(uniqueAfterDedupe))}`,
    startedAt: now,
    endedAt: now,
    command: "discover",
    reviewedJobIds: [],
    skippedJobIds: [],
    sessionAdjustments: [],
    metrics: {
      fetched,
      uniqueAfterDedupe,
      reviewed: 0,
      yes: 0,
      maybe: 0,
      no: 0,
      precisionAt10: selected > 0 ? 0 : undefined,
    },
  });
}

async function readRecords<T>(dir: string, schema: z.ZodType<T>): Promise<T[]> {
  let fileNames: string[];
  try {
    fileNames = await readdir(dir);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  return Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => readJsonFile(path.join(dir, fileName), schema)),
  );
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
