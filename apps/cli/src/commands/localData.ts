import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  DoNotMergeRecordSchema,
  EventRecordSchema,
  JobRecordSchema,
  ProposalRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  createStoragePaths,
  readEvents,
  type DoNotMergeRecord,
  type EventRecord,
  type JobRecord,
  type LifecycleStatus,
  type ProposalRecord,
  type SourceListingRecord,
  type SourceRecord,
} from "../../../../packages/core/src/index.js";

type JsonSchema<T> = {
  parse(value: unknown): T;
};

export type LocalData = {
  jobs: JobRecord[];
  sourceListings: SourceListingRecord[];
  sources: SourceRecord[];
  proposals: ProposalRecord[];
  doNotMergeRecords: DoNotMergeRecord[];
  events: EventRecord[];
};

export type ListJobsOptions = {
  status?: LifecycleStatus;
  includeRejected?: boolean;
  includeArchived?: boolean;
  sort?: "score" | "updated" | "posted" | "discovered";
};

export async function loadLocalData(dataDir: string): Promise<LocalData> {
  const paths = createStoragePaths(dataDir);
  const events = await readEvents(paths.eventsFile, EventRecordSchema).then((result) => result.events);

  return {
    jobs: await readRecords(paths.jobsDir, JobRecordSchema),
    sourceListings: await readRecords(paths.sourceListingsDir, SourceListingRecordSchema),
    sources: await readRecords(paths.sourcesDir, SourceRecordSchema),
    proposals: await readRecords(paths.proposalsDir, ProposalRecordSchema),
    doNotMergeRecords: await readRecords(paths.doNotMergeDir, DoNotMergeRecordSchema),
    events,
  };
}

export function selectJobsForList(jobs: JobRecord[], options: ListJobsOptions = {}): JobRecord[] {
  const status = options.status ?? (options.includeRejected ? "rejected" : options.includeArchived ? "archived" : "active");
  return [...jobs]
    .filter((job) => job.lifecycleStatus === status)
    .sort((left, right) => compareJobs(left, right, options.sort ?? "score"));
}

export function formatJobRow(job: JobRecord): string {
  return [
    job.id,
    job.lifecycleStatus,
    String(job.score.total),
    job.title,
    job.company,
    job.location ?? "Unknown",
  ].join("\t");
}

export function findJob(data: LocalData, id: string): JobRecord | undefined {
  return data.jobs.find((job) => job.id === id);
}

export function sourceListingsForJob(data: LocalData, job: JobRecord): SourceListingRecord[] {
  return data.sourceListings.filter((listing) => job.sourceListingIds.includes(listing.id));
}

export function sourceName(data: LocalData, listing: SourceListingRecord): string {
  const source = data.sources.find((item) => item.id === listing.sourceId);
  return source ? `${source.name} (${source.adapter})` : `${listing.sourceId} (${listing.adapter})`;
}

async function readRecords<T>(dir: string, schema: JsonSchema<T>): Promise<T[]> {
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
      .map(async (fileName) => schema.parse(JSON.parse(await readFile(path.join(dir, fileName), "utf8")))),
  );
}

function compareJobs(left: JobRecord, right: JobRecord, sort: NonNullable<ListJobsOptions["sort"]>): number {
  if (sort === "score") return right.score.total - left.score.total;
  if (sort === "updated") return right.updatedAt.localeCompare(left.updatedAt);
  if (sort === "posted") return (right.postedDate ?? "").localeCompare(left.postedDate ?? "");
  return right.discoveredAt.localeCompare(left.discoveredAt);
}
