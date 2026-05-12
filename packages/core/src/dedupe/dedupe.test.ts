import { describe, expect, it } from "vitest";

import { scoreCandidate } from "../scoring/index.js";
import type { JobRecord, SourceListingRecord } from "../schemas/index.js";
import { createDoNotMergeRecord, decideDeduplication } from "./index.js";
import { normalizeCandidate } from "../normalize/index.js";

const now = "2026-05-12T20:00:00.000Z";

describe("candidate deduplication", () => {
  it("merges candidates with the same source external ID", () => {
    const existing = fixtures();
    const candidate = normalizeCandidate({
      title: "AI Builder",
      company: "Example Co",
      sourceId: "source_1",
      sourceType: "ats",
      adapter: "greenhouse",
      sourceUrl: "https://example.com/new-url",
      externalId: "job_123",
      workType: "remote",
    });

    expect(decideDeduplication(candidate, [existing.job], [existing.listing])).toMatchObject({
      action: "merge",
      jobId: "job_1",
      reason: "same_external_id",
    });
  });

  it("merges candidates with the same normalized URL", () => {
    const existing = fixtures({
      sourceUrl: "https://jobs.example.com/roles/1?utm_source=linkedin",
    });
    const candidate = normalizeCandidate({
      title: "AI Builder",
      company: "Example Co",
      sourceId: "source_2",
      sourceType: "ats",
      adapter: "ashby",
      sourceUrl: "https://jobs.example.com/roles/1",
      workType: "remote",
    });

    expect(decideDeduplication(candidate, [existing.job], [existing.listing])).toMatchObject({
      action: "merge",
      jobId: "job_1",
      reason: "same_normalized_url",
    });
  });

  it("merges same company/title when location or work type overlaps", () => {
    const existing = fixtures({
      title: "Product Builder",
      company: "Owner.com, Inc.",
      location: "Remote - US",
      workType: "remote",
    });
    const candidate = normalizeCandidate({
      title: "Product Builder",
      company: "Owner.com",
      sourceId: "source_2",
      sourceType: "broad_api",
      adapter: "jooble",
      sourceUrl: "https://jooble.example.com/jobs/abc",
      location: "Remote",
      workType: "remote",
    });

    expect(decideDeduplication(candidate, [existing.job], [existing.listing])).toMatchObject({
      action: "merge",
      jobId: "job_1",
      reason: "same_company_title_overlap",
    });
  });

  it("keeps same company/title separate when location and work type differ without source proof", () => {
    const existing = fixtures({
      title: "Product Builder",
      company: "Example Co",
      location: "New York, NY",
      workType: "onsite",
    });
    const candidate = normalizeCandidate({
      title: "Product Builder",
      company: "Example Co",
      sourceId: "source_2",
      sourceType: "broad_api",
      adapter: "jooble",
      sourceUrl: "https://jooble.example.com/jobs/different",
      location: "San Francisco, CA",
      workType: "remote",
    });

    expect(decideDeduplication(candidate, [existing.job], [existing.listing])).toMatchObject({
      action: "create",
      reason: "no_match",
    });
  });

  it("never auto-merges a recorded do-not-merge pair", () => {
    const existing = fixtures();
    const candidate = normalizeCandidate({
      title: "AI Builder",
      company: "Example Co",
      sourceId: "source_1",
      sourceType: "ats",
      adapter: "greenhouse",
      sourceUrl: "https://example.com/jobs/1",
      externalId: "job_123",
      workType: "remote",
    });

    expect(
      decideDeduplication(candidate, [existing.job], [existing.listing], {
        candidateJobId: "job_2",
        doNotMergeRecords: [
          createDoNotMergeRecord({
            jobIdA: "job_1",
            jobIdB: "job_2",
            createdAt: now,
          }),
        ],
      }),
    ).toMatchObject({
      action: "create",
      reason: "do_not_merge",
    });
  });
});

function fixtures(
  overrides: Partial<JobRecord & Pick<SourceListingRecord, "sourceUrl" | "externalId">> = {},
) {
  const job: JobRecord = {
    schemaVersion: 1,
    id: "job_1",
    title: overrides.title ?? "AI Builder",
    company: overrides.company ?? "Example Co",
    discoveredAt: now,
    updatedAt: now,
    lifecycleStatus: "candidate",
    location: overrides.location ?? "Remote",
    workType: overrides.workType ?? "remote",
    sourceListingIds: ["listing_1"],
    score: scoreCandidate({
      title: overrides.title ?? "AI Builder",
      company: overrides.company ?? "Example Co",
      workType: overrides.workType ?? "remote",
    }),
  };

  const listing: SourceListingRecord = {
    schemaVersion: 1,
    id: "listing_1",
    jobId: "job_1",
    sourceId: "source_1",
    sourceType: "ats",
    adapter: "greenhouse",
    sourceUrl: overrides.sourceUrl ?? "https://jobs.example.com/roles/1",
    externalId: overrides.externalId ?? "job_123",
    firstSeenAt: now,
    fetchStatus: "ok",
    normalizedMetadata: {
      title: job.title,
      company: job.company,
      location: job.location,
      workType: job.workType,
    },
  };

  return { job, listing };
}
