import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { z } from "zod";

import {
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  type JobRecord,
  type SourceListingRecord,
  type SourceRecord,
} from "../schemas/index.js";
import { createStoragePaths, readJsonFile } from "../storage/index.js";

export type PublicBoardExport = {
  schemaVersion: 1;
  exportedAt: string;
  jobs: ExportedJob[];
  sources: ExportedSource[];
};

export type ExportedJob = {
  id: string;
  title: string;
  company: string;
  lifecycleStatus: "active" | "maybe" | "archived";
  reviewLabel?: "yes" | "maybe" | "no";
  location?: string;
  workType: JobRecord["workType"];
  compensation?: JobRecord["compensation"];
  postedDate?: string;
  industry?: string;
  experienceLevel?: JobRecord["experienceLevel"];
  score: {
    total: number;
    surfacedReason: string;
    scoringVersion: string;
    positiveSignals: Array<{ id: string; label: string; source: string; weight: number }>;
    negativeSignals: Array<{ id: string; label: string; source: string; weight: number }>;
  };
  links: Array<{
    sourceListingId: string;
    sourceId: string;
    sourceName?: string;
    adapter: SourceListingRecord["adapter"];
    sourceType: SourceListingRecord["sourceType"];
    url: string;
    fetchStatus: SourceListingRecord["fetchStatus"];
    firstSeenAt: string;
    lastSeenAt?: string;
  }>;
  archivedAt?: string;
  archiveReason?: string;
};

export type ExportedSource = {
  id: string;
  type: SourceRecord["type"];
  adapter: SourceRecord["adapter"];
  name: string;
  reusable: boolean;
  enabled: boolean;
};

export type ExportMetadataInput = {
  dataDir: string;
  now: string;
};

export type ExportMetadataResult = {
  filePath: string;
  exported: PublicBoardExport;
};

export async function exportMetadata(input: ExportMetadataInput): Promise<ExportMetadataResult> {
  const paths = createStoragePaths(input.dataDir);
  const jobs = await readRecords(paths.jobsDir, JobRecordSchema);
  const sourceListings = await readRecords(paths.sourceListingsDir, SourceListingRecordSchema);
  const sources = await readRecords(paths.sourcesDir, SourceRecordSchema);
  const exported: PublicBoardExport = {
    schemaVersion: 1,
    exportedAt: input.now,
    jobs: jobs
      .filter((job) => ["active", "maybe", "archived"].includes(job.lifecycleStatus))
      .sort((left, right) => right.score.total - left.score.total)
      .map((job) => exportJob(job, sourceListings, sources)),
    sources: sources.map((source) => ({
      id: source.id,
      type: source.type,
      adapter: source.adapter,
      name: source.name,
      reusable: source.reusable,
      enabled: source.enabled,
    })),
  };
  const filePath = path.join(paths.exportsDir, `${safeTimestamp(input.now)}.json`);
  await mkdir(paths.exportsDir, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(exported, null, 2)}\n`, "utf8");
  return { filePath, exported };
}

function exportJob(
  job: JobRecord,
  sourceListings: SourceListingRecord[],
  sources: SourceRecord[],
): ExportedJob {
  const links = sourceListings
    .filter((listing) => job.sourceListingIds.includes(listing.id))
    .map((listing) => {
      const source = sources.find((item) => item.id === listing.sourceId);
      return {
        sourceListingId: listing.id,
        sourceId: listing.sourceId,
        ...(source ? { sourceName: source.name } : {}),
        adapter: listing.adapter,
        sourceType: listing.sourceType,
        url: listing.sourceUrl,
        fetchStatus: listing.fetchStatus,
        firstSeenAt: listing.firstSeenAt,
        ...(listing.lastSeenAt ? { lastSeenAt: listing.lastSeenAt } : {}),
      };
    });

  return {
    id: job.id,
    title: job.title,
    company: job.company,
    lifecycleStatus: job.lifecycleStatus as ExportedJob["lifecycleStatus"],
    ...(job.currentReviewLabel ? { reviewLabel: job.currentReviewLabel } : {}),
    ...(job.location ? { location: job.location } : {}),
    workType: job.workType,
    ...(job.compensation ? { compensation: job.compensation } : {}),
    ...(job.postedDate ? { postedDate: job.postedDate } : {}),
    ...(job.industry ? { industry: job.industry } : {}),
    ...(job.experienceLevel ? { experienceLevel: job.experienceLevel } : {}),
    score: {
      total: job.score.total,
      surfacedReason: job.score.surfacedReason,
      scoringVersion: job.score.scoringVersion,
      positiveSignals: job.score.positiveSignals.map(exportSignal),
      negativeSignals: job.score.negativeSignals.map(exportSignal),
    },
    links,
    ...(job.archivedAt ? { archivedAt: job.archivedAt } : {}),
    ...(job.archiveReason ? { archiveReason: job.archiveReason } : {}),
  };
}

function exportSignal(signal: JobRecord["score"]["positiveSignals"][number]) {
  return {
    id: signal.id,
    label: signal.label,
    source: signal.source,
    weight: signal.weight,
  };
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

function safeTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}
