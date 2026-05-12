import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EventRecordSchema,
  JobRecordSchema,
  atomicWriteJson,
  createProposal,
  createStoragePaths,
  persistReviewLabel,
  readEvents,
  readJsonFile,
  recordSessionInterrupted,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";
import { ReviewInterruptedError, runReviewFlow } from "../review/reviewPrompts.js";
import { createTestDataDir, removeTestDataDir } from "./testDataDir.js";
import { readJobs, writeMockSourceFile, writeMockSourceRecord } from "./fixtures.js";

describe("e2e CLI workflows", () => {
  let dataDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await removeTestDataDir(dataDir);
    dataDir = undefined;
  });

  it("covers discover, review labels, list, show, maybe review, archive, proposals, refresh, and export", async () => {
    dataDir = await createTestDataDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const mockFile = await writeMockSourceFile(dataDir);
    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--interactive=false",
      "--data-dir",
      dataDir,
      "--mock-source-file",
      mockFile,
    ]);
    await writeMockSourceRecord(dataDir);
    const jobs = await readJobs(dataDir);
    const [firstJob, secondJob] = jobs;
    expect(jobs).toHaveLength(2);

    await persistReviewLabel({
      dataDir,
      jobId: firstJob.id,
      reviewLabel: "maybe",
      now: "2026-05-12T22:00:00.000Z",
    });
    await createProgram().parseAsync(["node", "jobs", "review", "maybe", "--data-dir", dataDir, "--label", "yes"]);
    await createProgram().parseAsync(["node", "jobs", "archive", secondJob.id, "--data-dir", dataDir, "--reason", "filled"]);

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", dataDir]);
    expect(output(log)).toContain(firstJob.id);

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "show", firstJob.id, "--data-dir", dataDir]);
    expect(output(log)).toContain("Review history:");

    const proposal = await createProposal(dataDir, {
      kind: "query",
      targets: [{ type: "query", id: "AI Operator" }],
      summary: "Add AI Operator query",
      evidence: ["accepted examples"],
      proposedChange: { type: "query.add", query: "AI Operator" },
      createdAt: "2026-05-12T22:10:00.000Z",
    });
    await createProgram().parseAsync(["node", "jobs", "proposals", "approve", proposal.id, "--data-dir", dataDir]);
    await createProgram().parseAsync(["node", "jobs", "refresh", "--data-dir", dataDir]);
    await createProgram().parseAsync(["node", "jobs", "export", "--data-dir", dataDir]);

    const exportFiles = await readdir(createStoragePaths(dataDir).exportsDir);
    const exported = await readFile(path.join(createStoragePaths(dataDir).exportsDir, exportFiles[0]!), "utf8");
    expect(exported).toContain(firstJob.id);
    expect(exported).toContain(secondJob.id);
    expect(exported).not.toContain("FULL DESCRIPTION");
    expect(exported).not.toContain("secret");
  });

  it("proves interrupted review preserves completed labels and exits cleanly", async () => {
    dataDir = await createTestDataDir();
    const paths = createStoragePaths(dataDir);
    const jobs = [
      createCandidateJob("job_reviewed"),
      createCandidateJob("job_unreviewed"),
    ];
    for (const job of jobs) {
      await atomicWriteJson(path.join(paths.jobsDir, `${job.id}.json`), JobRecordSchema, job);
    }
    let calls = 0;

    await expect(
      runReviewFlow({
        items: jobs.map((job) => ({ job, sourceListings: [], sources: [] })),
        write: () => undefined,
        prompt: async () => {
          calls += 1;
          if (calls === 1) return { action: "yes" };
          throw new Error("SIGINT");
        },
        onOutcome: async (outcome) => {
          if (outcome.reviewLabel) {
            await persistReviewLabel({
              dataDir: dataDir!,
              jobId: outcome.jobId,
              reviewLabel: outcome.reviewLabel,
              now: "2026-05-12T22:00:00.000Z",
            });
          }
        },
        onInterrupted: async (context) => {
          await recordSessionInterrupted({
            dataDir: dataDir!,
            now: "2026-05-12T22:01:00.000Z",
            reviewedJobIds: context.completedOutcomes.map((outcome) => outcome.jobId),
            reason: "SIGINT",
          });
        },
      }),
    ).rejects.toBeInstanceOf(ReviewInterruptedError);

    await expect(readJsonFile(path.join(paths.jobsDir, "job_reviewed.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "active",
    });
    await expect(readJsonFile(path.join(paths.jobsDir, "job_unreviewed.json"), JobRecordSchema)).resolves.toMatchObject({
      lifecycleStatus: "candidate",
    });
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events.map((event) => event.type)).toEqual(["job.reviewed", "session.interrupted"]);
  });

  it("proves no-new-candidate sessions exit successfully", async () => {
    dataDir = await createTestDataDir();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const mockFile = await writeMockSourceFile(dataDir, []);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--interactive=false",
      "--data-dir",
      dataDir,
      "--mock-source-file",
      mockFile,
    ]);

    expect(output(log)).toContain("Status: no_new_candidates");
  });

  it("proves exported JSON contains active and archived metadata but no full descriptions or secrets", async () => {
    dataDir = await createTestDataDir();
    const mockFile = await writeMockSourceFile(dataDir);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await createProgram().parseAsync(["node", "jobs", "discover", "--interactive=false", "--data-dir", dataDir, "--mock-source-file", mockFile]);
    const [active, archived] = await readJobs(dataDir);
    await persistReviewLabel({ dataDir, jobId: active.id, reviewLabel: "yes", now: "2026-05-12T22:00:00.000Z" });
    await createProgram().parseAsync(["node", "jobs", "archive", archived.id, "--data-dir", dataDir, "--reason", "filled"]);
    await createProgram().parseAsync(["node", "jobs", "export", "--data-dir", dataDir]);

    const exportFiles = await readdir(createStoragePaths(dataDir).exportsDir);
    const exported = await readFile(path.join(createStoragePaths(dataDir).exportsDir, exportFiles[0]!), "utf8");
    expect(exported).toContain("\"lifecycleStatus\": \"active\"");
    expect(exported).toContain("\"lifecycleStatus\": \"archived\"");
    expect(exported).not.toContain("FULL DESCRIPTION");
    expect(exported).not.toContain("JOOBLE_API_KEY=");
  });
});

function createCandidateJob(id: string) {
  return {
    schemaVersion: 1,
    id,
    title: "AI Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "candidate",
    workType: "remote",
    sourceListingIds: [],
    score: {
      total: 80,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "AI builder fit",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
  } as const;
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
