import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DoNotMergeRecordSchema,
  EventRecordSchema,
  JobRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  hasDoNotMergeDecision,
  listDoNotMergeDecisions,
  readEvents,
  readJsonFile,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(async () => ""),
  select: vi.fn(async () => "skip"),
}));

describe("review maybe and dedupe commands", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("relabels maybe jobs as yes, no, or keeps maybe while preserving label history", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-review-maybe-"));
    const paths = createStoragePaths(tempDir);
    await seedMaybeJob(tempDir, "job_maybe_yes");
    await seedMaybeJob(tempDir, "job_maybe_no");
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "review",
      "maybe",
      "--data-dir",
      tempDir,
      "--label",
      "yes",
      "--note",
      "ready to apply",
    ]);

    await expect(readJsonFile(path.join(paths.jobsDir, "job_maybe_yes.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "active",
      currentReviewLabel: "yes",
      notes: ["ready to apply"],
    });
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events[0]).toMatchObject({
      type: "job.reviewed",
      payload: {
        previousReviewLabel: "maybe",
        previousLifecycleStatus: "maybe",
      },
    });

    await seedMaybeJob(tempDir, "job_maybe_keep");
    await createProgram().parseAsync([
      "node",
      "jobs",
      "review",
      "maybe",
      "--data-dir",
      tempDir,
      "--label",
      "maybe",
    ]);
    await expect(readJsonFile(path.join(paths.jobsDir, "job_maybe_keep.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "maybe",
      currentReviewLabel: "maybe",
    });

    await seedMaybeJob(tempDir, "job_maybe_final_no");
    await createProgram().parseAsync([
      "node",
      "jobs",
      "review",
      "maybe",
      "--data-dir",
      tempDir,
      "--label",
      "no",
    ]);
    await expect(readJsonFile(path.join(paths.jobsDir, "job_maybe_final_no.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "rejected",
      currentReviewLabel: "no",
    });
  });

  it("reviews candidate jobs with full descriptions fetched from saved links", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-review-candidates-"));
    const paths = createStoragePaths(tempDir);
    const fullDescription = "Example AI is hiring an AI Builder to build customer-facing AI workflows with Claude Code and orchestrate agents.";
    await seedCandidateJobWithListing(tempDir, "job_candidate");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const requestUrl = String(url);
      if (requestUrl === "https://jooble.org/jdp/123") {
        return {
          ok: false,
          status: 403,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () => "blocked",
        } as Response;
      }
      if (requestUrl.startsWith("https://duckduckgo.com/html/")) {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () => `
            <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F123">LinkedIn</a>
            <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fjobs%2Fai-builder">Example</a>
          `,
        } as Response;
      }
      if (requestUrl === "https://example.com/jobs/ai-builder") {
        return {
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: async () => `<html><body><main><p>${fullDescription}</p></main></body></html>`,
        } as Response;
      }
      throw new Error(`Unexpected URL: ${requestUrl}`);
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "review",
      "candidates",
      "--data-dir",
      tempDir,
      "--limit",
      "1",
    ]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://jooble.org/jdp/123",
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://duckduckgo.com/html/"),
      expect.any(Object),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://example.com/jobs/ai-builder",
      expect.objectContaining({ redirect: "follow" }),
    );
    expect(output(log)).toContain("Full descriptions fetched: 1/1");
    expect(output(log)).toContain("Description (full, not saved):");
    expect(output(log)).toContain("Claude Code");
    await expect(readFile(path.join(paths.jobsDir, "job_candidate.json"), "utf8")).resolves.not.toContain(
      fullDescription,
    );
  });

  it("creates an order-independent do-not-merge record", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-dedupe-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "dedupe",
      "mark-do-not-merge",
      "job_b",
      "job_a",
      "--data-dir",
      tempDir,
      "--reason",
      "different teams",
    ]);

    const records = await listDoNotMergeDecisions(tempDir);
    expect(records).toHaveLength(1);
    expect(hasDoNotMergeDecision(records, "job_a", "job_b")).toBe(true);
    expect(DoNotMergeRecordSchema.parse(records[0])).toMatchObject({
      jobIdA: "job_a",
      jobIdB: "job_b",
      reason: "different teams",
    });
  });

  it("lists do-not-merge decisions involving a job", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-dedupe-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await createProgram().parseAsync([
      "node",
      "jobs",
      "dedupe",
      "mark-do-not-merge",
      "job_a",
      "job_b",
      "--data-dir",
      tempDir,
      "--reason",
      "duplicate-looking title",
    ]);

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "dedupe", "list", "job_a", "--data-dir", tempDir]);
    expect(output(log)).toContain("job_b");
    expect(output(log)).toContain("duplicate-looking title");
  });
});

async function seedMaybeJob(dataDir: string, id: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.jobsDir, `${id}.json`), JobRecordSchema, {
    schemaVersion: 1,
    id,
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "maybe",
    currentReviewLabel: "maybe",
    workType: "remote",
    sourceListingIds: [],
    score: {
      total: 80,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "Maybe AI builder fit",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  });
}

async function seedCandidateJobWithListing(dataDir: string, id: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.sourcesDir, "source_jooble_1.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_jooble_1",
    type: "broad_api",
    adapter: "jooble",
    name: "Jooble: AI Builder",
    reusable: true,
    enabled: true,
  });
  await atomicWriteJson(path.join(paths.sourceListingsDir, "listing_candidate.json"), SourceListingRecordSchema, {
    schemaVersion: 1,
    id: "listing_candidate",
    jobId: id,
    sourceId: "source_jooble_1",
    sourceType: "broad_api",
    adapter: "jooble",
    sourceUrl: "https://jooble.org/jdp/123",
    firstSeenAt: "2026-05-12T20:00:00.000Z",
    fetchStatus: "ok",
    normalizedMetadata: {
      title: "AI Builder",
      company: "Example AI",
      location: "Remote",
      workType: "remote",
    },
  });
  await atomicWriteJson(path.join(paths.jobsDir, `${id}.json`), JobRecordSchema, {
    schemaVersion: 1,
    id,
    title: "AI Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "candidate",
    location: "Remote",
    workType: "remote",
    sourceListingIds: ["listing_candidate"],
    score: {
      total: 80,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "Candidate AI builder fit",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
