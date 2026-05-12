import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
} from "../index.js";
import { exportMetadata } from "./exportService.js";

describe("metadata export", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    delete process.env.PRIVATE_EXPORT_TEST_VALUE;
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("writes curated metadata to data/exports/{timestamp}.json", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-export-"));
    await seedExportData(tempDir);

    const result = await exportMetadata({
      dataDir: tempDir,
      now: "2026-05-12T22:00:00.000Z",
    });

    expect(result.filePath).toBe(path.join(tempDir, "exports", "2026-05-12T22-00-00-000Z.json"));
    await expect(readFile(result.filePath, "utf8")).resolves.toContain("Product Builder");
  });

  it("excludes full descriptions, API keys, and private env values", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-export-"));
    process.env.PRIVATE_EXPORT_TEST_VALUE = "private-env-secret";
    await seedExportData(tempDir);
    await appendEvent(createStoragePaths(tempDir).eventsFile, EventRecordSchema, {
      schemaVersion: 1,
      id: "event_secret",
      timestamp: "2026-05-12T21:00:00.000Z",
      actor: "system",
      type: "job.discovered",
      jobId: "job_active",
      payload: {
        fullDescription: "FULL DESCRIPTION SHOULD NOT EXPORT",
        apiKey: "jooble-secret-api-key",
        privateEnv: process.env.PRIVATE_EXPORT_TEST_VALUE,
      },
    });

    const result = await exportMetadata({ dataDir: tempDir, now: "2026-05-12T22:00:00.000Z" });
    const exported = JSON.stringify(result.exported);

    expect(exported).not.toContain("FULL DESCRIPTION SHOULD NOT EXPORT");
    expect(exported).not.toContain("jooble-secret-api-key");
    expect(exported).not.toContain("private-env-secret");
    expect(exported).not.toContain("credentialEnvVar");
  });

  it("includes active, maybe, archived, source, score, signal, and link metadata", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-export-"));
    await seedExportData(tempDir);

    const result = await exportMetadata({ dataDir: tempDir, now: "2026-05-12T22:00:00.000Z" });

    expect(result.exported.jobs.map((job) => job.lifecycleStatus).sort()).toEqual([
      "active",
      "archived",
      "maybe",
    ]);
    expect(result.exported.sources).toEqual([
      expect.objectContaining({ id: "source_1", name: "Example Source", adapter: "ashby" }),
    ]);
    expect(result.exported.jobs[0]).toEqual(
      expect.objectContaining({
        score: expect.objectContaining({
          surfacedReason: "Strong AI builder match",
          positiveSignals: [expect.objectContaining({ label: "Mentions Claude Code" })],
        }),
        links: [expect.objectContaining({ url: "https://jobs.ashbyhq.com/example/job_active" })],
      }),
    );
  });
});

async function seedExportData(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_1",
    type: "ats",
    adapter: "ashby",
    name: "Example Source",
    reusable: true,
    enabled: true,
    credentialEnvVar: "JOOBLE_API_KEY",
  });
  for (const status of ["active", "maybe", "archived", "rejected"] as const) {
    const id = `job_${status}`;
    await atomicWriteJson(path.join(paths.jobsDir, `${id}.json`), JobRecordSchema, {
      schemaVersion: 1,
      id,
      title: status === "active" ? "Product Builder" : `Product Builder ${status}`,
      company: "Example AI",
      discoveredAt: "2026-05-12T20:00:00.000Z",
      updatedAt: "2026-05-12T20:00:00.000Z",
      lifecycleStatus: status,
      currentReviewLabel: status === "active" ? "yes" : status === "maybe" ? "maybe" : status === "rejected" ? "no" : undefined,
      workType: "remote",
      sourceListingIds: [`listing_${status}`],
      archivedAt: status === "archived" ? "2026-05-12T21:00:00.000Z" : undefined,
      archiveReason: status === "archived" ? "filled" : undefined,
      score: {
        total: status === "active" ? 90 : 70,
        buckets: [],
        positiveSignals: [
          {
            id: "tool.claude_code",
            label: "Mentions Claude Code",
            polarity: "positive",
            source: "description",
            weight: 10,
          },
        ],
        negativeSignals: [],
        surfacedReason: "Strong AI builder match",
        scoredAt: "2026-05-12T20:00:00.000Z",
        scoringVersion: "rules-v1",
      },
    });
    await atomicWriteJson(path.join(paths.sourceListingsDir, `listing_${status}.json`), SourceListingRecordSchema, {
      schemaVersion: 1,
      id: `listing_${status}`,
      jobId: id,
      sourceId: "source_1",
      sourceType: "ats",
      adapter: "ashby",
      sourceUrl: `https://jobs.ashbyhq.com/example/${id}`,
      firstSeenAt: "2026-05-12T20:00:00.000Z",
      fetchStatus: "ok",
      normalizedMetadata: {
        title: "Product Builder",
        company: "Example AI",
      },
    });
  }
}
