import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  JobRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  type JobRecord,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("list command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("defaults to active jobs and supports status, rejected, archived, and sort filters", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-list-"));
    await seedJobs(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir]);
    expect(output(log)).toContain("job_active");
    expect(output(log)).not.toContain("job_maybe");
    expect(output(log)).not.toContain("job_rejected");
    expect(output(log)).not.toContain("job_archived");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--status", "maybe"]);
    expect(output(log)).toContain("job_maybe");
    expect(output(log)).not.toContain("job_active");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--rejected"]);
    expect(output(log)).toContain("job_rejected");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--archived"]);
    expect(output(log)).toContain("job_archived");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--sort", "updated"]);
    expect(output(log).split("\n")[0]).toContain("job_active");
  });

  it("hides rejected and archived jobs by default but includes them with explicit filters", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-list-"));
    await seedJobs(tempDir);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir]);
    expect(output(log)).not.toContain("job_rejected");
    expect(output(log)).not.toContain("job_archived");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--status", "rejected"]);
    expect(output(log)).toContain("job_rejected");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "list", "--data-dir", tempDir, "--status", "archived"]);
    expect(output(log)).toContain("job_archived");
  });
});

async function seedJobs(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  for (const job of [
    createJob({ id: "job_active", lifecycleStatus: "active", currentReviewLabel: "yes", scoreTotal: 90, updatedAt: "2026-05-12T22:00:00.000Z" }),
    createJob({ id: "job_maybe", lifecycleStatus: "maybe", currentReviewLabel: "maybe", scoreTotal: 80 }),
    createJob({ id: "job_rejected", lifecycleStatus: "rejected", currentReviewLabel: "no", scoreTotal: 70 }),
    createJob({ id: "job_archived", lifecycleStatus: "archived", scoreTotal: 60 }),
  ]) {
    await atomicWriteJson(path.join(paths.jobsDir, `${job.id}.json`), JobRecordSchema, job);
  }
}

function createJob(
  overrides: Partial<JobRecord> & { scoreTotal?: number } = {},
): JobRecord {
  const { scoreTotal, ...jobOverrides } = overrides;
  return {
    schemaVersion: 1,
    id: "job_1",
    title: "Product Builder",
    company: "Example AI",
    discoveredAt: "2026-05-12T20:00:00.000Z",
    updatedAt: "2026-05-12T20:00:00.000Z",
    lifecycleStatus: "active",
    workType: "remote",
    sourceListingIds: [],
    score: {
      total: scoreTotal ?? 80,
      buckets: [],
      positiveSignals: [],
      negativeSignals: [],
      surfacedReason: "Strong AI builder match",
      scoredAt: "2026-05-12T20:00:00.000Z",
      scoringVersion: "rules-v1",
    },
    ...jobOverrides,
  };
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
