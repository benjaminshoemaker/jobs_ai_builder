import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { z } from "zod";

import {
  EventRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  type AppConfig,
  type SourceListingRecord,
  type SourceRecord,
} from "../schemas/index.js";
import {
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../storage/index.js";
import type { SourceAdapter } from "../sources/index.js";

export type RefreshRegistry = {
  get(adapterId: SourceRecord["adapter"]): SourceAdapter | undefined;
};

export type RefreshListingsInput = {
  dataDir: string;
  config: AppConfig;
  registry: RefreshRegistry;
  now: string;
  listingIds?: string[];
};

export type RefreshListingSummary = {
  sourceListingId: string;
  jobId: string;
  status: SourceListingRecord["fetchStatus"];
  errorMessage?: string;
};

export type RefreshListingsResult = {
  refreshed: RefreshListingSummary[];
};

export async function refreshListings(input: RefreshListingsInput): Promise<RefreshListingsResult> {
  const paths = createStoragePaths(input.dataDir);
  const listings = await readRecords(paths.sourceListingsDir, SourceListingRecordSchema);
  const sources = await readRecords(paths.sourcesDir, SourceRecordSchema);
  const requestedIds = input.listingIds ? new Set(input.listingIds) : undefined;
  const refreshed: RefreshListingSummary[] = [];

  for (const listing of listings.filter((item) => !requestedIds || requestedIds.has(item.id))) {
    const source = sources.find((item) => item.id === listing.sourceId);
    const adapter = source ? input.registry.get(source.adapter) : undefined;
    const result = await refreshOneListing({
      listing,
      source,
      adapter,
      config: input.config,
      now: input.now,
    });
    const nextListing = SourceListingRecordSchema.parse({
      ...listing,
      lastSeenAt: input.now,
      fetchStatus: result.status,
      ...(result.errorMessage ? { errorMessage: result.errorMessage } : { errorMessage: undefined }),
      normalizedMetadata: {
        ...listing.normalizedMetadata,
        ...(result.normalizedMetadata ?? {}),
      },
    });
    await atomicWriteJson(
      path.join(paths.sourceListingsDir, `${listing.id}.json`),
      SourceListingRecordSchema,
      nextListing,
    );
    await appendEvent(paths.eventsFile, EventRecordSchema, {
      schemaVersion: 1,
      id: `event_${hash("job.refreshed", listing.id, input.now)}`,
      timestamp: input.now,
      actor: "system",
      type: "job.refreshed",
      jobId: listing.jobId,
      sourceId: listing.sourceId,
      sourceListingId: listing.id,
      payload: {
        fetchStatus: result.status,
        errorMessage: result.errorMessage,
      },
    });
    refreshed.push({
      sourceListingId: listing.id,
      jobId: listing.jobId,
      status: result.status,
      ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
    });
  }

  return { refreshed };
}

async function refreshOneListing(input: {
  listing: SourceListingRecord;
  source?: SourceRecord;
  adapter?: SourceAdapter;
  config: AppConfig;
  now: string;
}): Promise<{
  status: SourceListingRecord["fetchStatus"];
  normalizedMetadata?: Partial<SourceListingRecord["normalizedMetadata"]>;
  errorMessage?: string;
}> {
  if (!input.source || !input.adapter) {
    return { status: "error", errorMessage: "Source or adapter is missing." };
  }

  try {
    if (input.adapter.refreshListing) {
      const result = await input.adapter.refreshListing(input.listing, {
        now: input.now,
        config: input.config,
        source: input.source,
        limit: 1,
      });
      return {
        status: result.status,
        normalizedMetadata: result.normalizedMetadata,
        errorMessage: result.errorMessage,
      };
    }

    if (input.adapter.fetchByUrl) {
      const candidate = await input.adapter.fetchByUrl(input.listing.sourceUrl, {
        now: input.now,
        config: input.config,
        source: input.source,
        limit: 1,
        manualMetadata: input.listing.normalizedMetadata,
      });
      return {
        status: candidate.fetchStatus ?? "ok",
        normalizedMetadata: candidate.metadata,
        errorMessage: candidate.errorMessage,
      };
    }

    return { status: "error", errorMessage: "Adapter cannot refresh listings." };
  } catch (error) {
    return {
      status: errorStatus(error),
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
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

function errorStatus(error: unknown): SourceListingRecord["fetchStatus"] {
  if (typeof error === "object" && error !== null && "status" in error && error.status === 429) {
    return "rate_limited";
  }
  return "error";
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
