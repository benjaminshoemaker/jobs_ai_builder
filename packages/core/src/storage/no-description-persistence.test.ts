import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { scoreCandidate } from "../scoring/index.js";
import {
  EventRecordSchema,
  JobRecordSchema,
  ProposalRecordSchema,
  SessionRecordSchema,
  SourceListingRecordSchema,
} from "../schemas/index.js";
import { atomicWriteJson } from "./jsonRepository.js";

describe("description persistence policy", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("does not write full description text to persistent records or exports", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-no-description-"));
    const fullDescription =
      "FULL DESCRIPTION: Use Claude Code to build customer-facing agent workflows for healthcare teams.";
    const score = scoreCandidate({
      title: "AI Builder",
      company: "Example Co",
      workType: "remote",
      transientDescription: fullDescription,
    });
    const now = "2026-05-12T20:00:00.000Z";

    const files = {
      job: path.join(tempDir, "job.json"),
      sourceListing: path.join(tempDir, "source-listing.json"),
      event: path.join(tempDir, "event.json"),
      session: path.join(tempDir, "session.json"),
      proposal: path.join(tempDir, "proposal.json"),
      export: path.join(tempDir, "export.json"),
    };

    await atomicWriteJson(files.job, JobRecordSchema, {
      schemaVersion: 1,
      id: "job_1",
      title: "AI Builder",
      company: "Example Co",
      discoveredAt: now,
      updatedAt: now,
      lifecycleStatus: "candidate",
      workType: "remote",
      sourceListingIds: ["listing_1"],
      score,
    });

    await atomicWriteJson(files.sourceListing, SourceListingRecordSchema, {
      schemaVersion: 1,
      id: "listing_1",
      jobId: "job_1",
      sourceId: "source_1",
      sourceType: "manual",
      adapter: "manual",
      sourceUrl: "https://example.com/jobs/1",
      firstSeenAt: now,
      fetchStatus: "ok",
      normalizedMetadata: {
        title: "AI Builder",
        company: "Example Co",
        workType: "remote",
      },
    });

    await atomicWriteJson(files.event, EventRecordSchema, {
      schemaVersion: 1,
      id: "event_1",
      timestamp: now,
      actor: "system",
      type: "job.discovered",
      jobId: "job_1",
      payload: {
        signalIds: score.positiveSignals.map((signal) => signal.id),
      },
    });

    await atomicWriteJson(files.session, SessionRecordSchema, {
      schemaVersion: 1,
      id: "session_1",
      startedAt: now,
      command: "discover",
      reviewedJobIds: [],
      skippedJobIds: [],
      sessionAdjustments: [],
      metrics: {
        fetched: 1,
        uniqueAfterDedupe: 1,
        reviewed: 0,
        yes: 0,
        maybe: 0,
        no: 0,
      },
    });

    await atomicWriteJson(files.proposal, ProposalRecordSchema, {
      schemaVersion: 1,
      id: "proposal_1",
      createdAt: now,
      status: "pending",
      kind: "scoring",
      targets: [{ type: "job", id: "job_1" }],
      summary: "Boost Claude Code signal",
      evidence: score.positiveSignals.map((signal) => signal.label),
      proposedChange: { signalId: "tool.claude_code", delta: 1 },
    });

    await writeFile(
      files.export,
      `${JSON.stringify({
        jobs: [
          {
            id: "job_1",
            title: "AI Builder",
            company: "Example Co",
            sourceUrl: "https://example.com/jobs/1",
            score,
          },
        ],
      })}\n`,
      "utf8",
    );

    for (const file of Object.values(files)) {
      await expect(readFile(file, "utf8")).resolves.not.toContain(fullDescription);
    }
  });
});
