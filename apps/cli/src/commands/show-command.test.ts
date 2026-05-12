import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DoNotMergeRecordSchema,
  EventRecordSchema,
  JobRecordSchema,
  ProposalRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("show command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("displays metadata, source listings, score/signals, review history, events, linked proposals, and do-not-merge decisions", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-show-"));
    await seedShowData(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync(["node", "jobs", "show", "job_1", "--data-dir", tempDir]);

    const printed = output(log);
    expect(printed).toContain("Product Builder @ Example AI");
    expect(printed).toContain("Status: active");
    expect(printed).toContain("Example Ashby (ashby)");
    expect(printed).toContain("https://jobs.ashbyhq.com/example/product-builder");
    expect(printed).toContain("Score: 88/100");
    expect(printed).toContain("Mentions Claude Code");
    expect(printed).toContain("job.reviewed");
    expect(printed).toContain("proposal_1 pending: Boost Claude Code signal");
    expect(printed).toContain("do_not_merge_job_1_job_2 with job_2: Different company");
  });
});

async function seedShowData(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.jobsDir, "job_1.json"), JobRecordSchema, {
    schemaVersion: 1,
    id: "job_1",
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T21:00:00.000Z",
    lifecycleStatus: "active",
    currentReviewLabel: "yes",
    location: "Remote",
    workType: "remote",
    compensation: { raw: "$160K-$180K" },
    sourceListingIds: ["listing_1"],
    notes: ["great fit"],
    score: {
      total: 88,
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
  await atomicWriteJson(path.join(paths.sourceListingsDir, "listing_1.json"), SourceListingRecordSchema, {
    schemaVersion: 1,
    id: "listing_1",
    jobId: "job_1",
    sourceId: "source_1",
    sourceType: "ats",
    adapter: "ashby",
    sourceUrl: "https://jobs.ashbyhq.com/example/product-builder",
    firstSeenAt: "2026-05-12T20:00:00.000Z",
    fetchStatus: "ok",
    normalizedMetadata: {
      title: "Product Builder",
      company: "Example AI",
    },
  });
  await atomicWriteJson(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_1",
    type: "ats",
    adapter: "ashby",
    name: "Example Ashby",
    reusable: true,
    enabled: true,
  });
  await appendEvent(paths.eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: "event_reviewed",
    timestamp: "2026-05-12T21:00:00.000Z",
    actor: "user",
    type: "job.reviewed",
    jobId: "job_1",
    payload: { reviewLabel: "yes", lifecycleStatus: "active" },
  });
  await atomicWriteJson(path.join(paths.proposalsDir, "proposal_1.json"), ProposalRecordSchema, {
    schemaVersion: 1,
    id: "proposal_1",
    createdAt: "2026-05-12T21:05:00.000Z",
    status: "pending",
    kind: "scoring",
    targets: [{ type: "job", id: "job_1" }],
    summary: "Boost Claude Code signal",
    evidence: ["job_1 was accepted"],
    proposedChange: { signalId: "tool.claude_code", delta: 2 },
  });
  await atomicWriteJson(path.join(paths.doNotMergeDir, "do_not_merge_job_1_job_2.json"), DoNotMergeRecordSchema, {
    schemaVersion: 1,
    id: "do_not_merge_job_1_job_2",
    createdAt: "2026-05-12T21:10:00.000Z",
    jobIdA: "job_1",
    jobIdB: "job_2",
    reason: "Different company",
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
