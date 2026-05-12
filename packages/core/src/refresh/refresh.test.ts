import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createDefaultConfig,
  createStoragePaths,
  readJsonFile,
  type SourceAdapter,
  type SourceListingRecord,
} from "../index.js";
import { refreshListings } from "./refreshService.js";

describe("refresh listings", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("marks source listings as ok, unavailable, rate_limited, or error without deleting local jobs", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-refresh-"));
    await seedRefreshData(tempDir);
    const result = await refreshListings({
      dataDir: tempDir,
      config: createDefaultConfig(),
      registry: { get: () => createRefreshAdapter() },
      now: "2026-05-12T22:00:00.000Z",
    });

    expect(result.refreshed.map((item) => item.status).sort()).toEqual([
      "error",
      "ok",
      "rate_limited",
      "unavailable",
    ]);
    await expect(readdir(createStoragePaths(tempDir).jobsDir)).resolves.toHaveLength(4);
  });

  it("preserves source error state and partial metadata on failed refresh", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-refresh-"));
    await seedRefreshData(tempDir);
    const paths = createStoragePaths(tempDir);

    await refreshListings({
      dataDir: tempDir,
      config: createDefaultConfig(),
      registry: { get: () => createRefreshAdapter() },
      now: "2026-05-12T22:00:00.000Z",
      listingIds: ["listing_error"],
    });

    const listing = await readJsonFile(
      path.join(paths.sourceListingsDir, "listing_error.json"),
      SourceListingRecordSchema,
    );
    expect(listing).toMatchObject({
      fetchStatus: "error",
      errorMessage: "temporary failure",
      normalizedMetadata: {
        title: "Product Builder listing_error",
        company: "Example AI",
      },
    });
  });
});

function createRefreshAdapter(): SourceAdapter {
  return {
    id: "manual",
    async fetchCandidates() {
      return [];
    },
    async refreshListing(listing: SourceListingRecord) {
      if (listing.id === "listing_ok") {
        return {
          sourceListingId: listing.id,
          status: "ok",
          checkedAt: "2026-05-12T22:00:00.000Z",
          stillVisible: true,
          normalizedMetadata: { location: "Remote" },
        };
      }
      if (listing.id === "listing_unavailable") {
        return {
          sourceListingId: listing.id,
          status: "unavailable",
          checkedAt: "2026-05-12T22:00:00.000Z",
          stillVisible: false,
        };
      }
      if (listing.id === "listing_rate_limited") {
        return {
          sourceListingId: listing.id,
          status: "rate_limited",
          checkedAt: "2026-05-12T22:00:00.000Z",
          stillVisible: true,
          errorMessage: "rate limited",
        };
      }
      return {
        sourceListingId: listing.id,
        status: "error",
        checkedAt: "2026-05-12T22:00:00.000Z",
        stillVisible: true,
        errorMessage: "temporary failure",
      };
    },
    async testSource() {
      return { ok: true, message: "ok" };
    },
  };
}

async function seedRefreshData(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_1",
    type: "manual",
    adapter: "manual",
    name: "Manual Source",
    reusable: true,
    enabled: true,
  });
  for (const id of ["listing_ok", "listing_unavailable", "listing_rate_limited", "listing_error"]) {
    const jobId = `job_${id}`;
    await atomicWriteJson(path.join(paths.jobsDir, `${jobId}.json`), JobRecordSchema, {
      schemaVersion: 1,
      id: jobId,
      title: `Product Builder ${id}`,
      company: "Example AI",
      discoveredAt: "2026-05-12T20:00:00.000Z",
      updatedAt: "2026-05-12T20:00:00.000Z",
      lifecycleStatus: "active",
      workType: "remote",
      sourceListingIds: [id],
      score: {
        total: 80,
        buckets: [],
        positiveSignals: [],
        negativeSignals: [],
        surfacedReason: "AI builder fit",
        scoredAt: "2026-05-12T20:00:00.000Z",
        scoringVersion: "rules-v1",
      },
    });
    await atomicWriteJson(path.join(paths.sourceListingsDir, `${id}.json`), SourceListingRecordSchema, {
      schemaVersion: 1,
      id,
      jobId,
      sourceId: "source_1",
      sourceType: "manual",
      adapter: "manual",
      sourceUrl: `https://example.com/jobs/${id}`,
      firstSeenAt: "2026-05-12T20:00:00.000Z",
      fetchStatus: "ok",
      normalizedMetadata: {
        title: `Product Builder ${id}`,
        company: "Example AI",
      },
    });
  }
}
