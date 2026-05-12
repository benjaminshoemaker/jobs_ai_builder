import { describe, expect, it } from "vitest";

import {
  AppConfigSchema,
  DoNotMergeRecordSchema,
  EventRecordSchema,
  JobRecordSchema,
  ProposalRecordSchema,
  ScoringRulesRecordSchema,
  SessionRecordSchema,
  SourceListingRecordSchema,
  SourceRecordSchema,
} from "./index.js";

const score = {
  total: 82,
  buckets: [
    {
      name: "title",
      points: 20,
      maxPoints: 25,
      signals: [
        {
          id: "title.product_builder",
          label: "Title contains Product Builder",
          polarity: "positive",
          source: "title",
          weight: 20,
        },
      ],
    },
  ],
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
  surfacedReason: "Strong title and AI coding signal",
  scoredAt: "2026-05-12T20:00:00.000Z",
  scoringVersion: "rules-v1",
};

const candidateMetadata = {
  title: "Product Builder",
  company: "Example AI",
  location: "Remote",
  workType: "remote",
  compensationRaw: "$160K-$180K",
  compensationMin: 160000,
  compensationMax: 180000,
  currency: "USD",
  postedDate: "2026-05-01",
  sourcePostedDateRaw: "May 1, 2026",
};

describe("record schemas", () => {
  it("accepts valid fixtures for every persisted record", () => {
    expect(
      JobRecordSchema.parse({
        schemaVersion: 1,
        id: "job_1",
        title: "Product Builder",
        company: "Example AI",
        discoveredAt: "2026-05-12T20:00:00.000Z",
        updatedAt: "2026-05-12T20:00:00.000Z",
        lifecycleStatus: "candidate",
        currentReviewLabel: "maybe",
        location: "Remote",
        workType: "remote",
        compensation: {
          min: 160000,
          max: 180000,
          currency: "USD",
          period: "year",
          raw: "$160K-$180K",
        },
        postedDate: "2026-05-01",
        industry: "SaaS",
        experienceLevel: "senior",
        sourceListingIds: ["listing_1"],
        score,
        notes: ["Looks relevant"],
      }),
    ).toMatchObject({ id: "job_1" });

    expect(
      SourceListingRecordSchema.parse({
        schemaVersion: 1,
        id: "listing_1",
        jobId: "job_1",
        sourceId: "source_1",
        sourceType: "ats",
        adapter: "ashby",
        sourceUrl: "https://jobs.ashbyhq.com/example/role",
        externalId: "external_1",
        firstSeenAt: "2026-05-12T20:00:00.000Z",
        lastSeenAt: "2026-05-12T20:00:00.000Z",
        fetchStatus: "ok",
        normalizedMetadata: candidateMetadata,
      }),
    ).toMatchObject({ id: "listing_1" });

    expect(
      SourceRecordSchema.parse({
        schemaVersion: 1,
        id: "source_1",
        type: "ats",
        adapter: "ashby",
        name: "Example AI Ashby",
        reusable: true,
        baseUrl: "https://jobs.ashbyhq.com/example",
        companySlug: "example",
        enabled: true,
        defaultQuery: "AI Builder",
      }),
    ).toMatchObject({ id: "source_1" });

    expect(
      AppConfigSchema.parse({
        schemaVersion: 1,
        reviewLimit: 10,
        fetchLimit: 50,
        sourceCooldownHours: 24,
        broadApiProvider: "jooble",
        broadApiCredentialEnvVar: "JOOBLE_API_KEY",
        querySeeds: ["AI Builder"],
        preferences: {
          workType: { value: ["remote"], mode: "soft_rank" },
          compensationFloor: { value: 150000, mode: "note_only" },
          exclusions: { value: ["DevRel"], mode: "hard_filter" },
        },
      }),
    ).toMatchObject({ reviewLimit: 10 });

    expect(
      ScoringRulesRecordSchema.parse({
        schemaVersion: 1,
        scoringVersion: "rules-v1",
        updatedAt: "2026-05-12T20:00:00.000Z",
        bucketMaxPoints: {
          title: 25,
          ai_tools: 20,
          product_build: 20,
          agent_llm: 15,
          production_ownership: 10,
          exclusion: 50,
          preferences: 10,
          source_quality: 5,
        },
        signalWeights: {
          "title.product_builder": 20,
        },
        exclusionPatterns: [
          {
            id: "exclude.devrel",
            label: "DevRel role",
            pattern: "developer relations",
            matchField: "description",
          },
        ],
      }),
    ).toMatchObject({ scoringVersion: "rules-v1" });

    expect(
      EventRecordSchema.parse({
        schemaVersion: 1,
        id: "event_1",
        timestamp: "2026-05-12T20:00:00.000Z",
        actor: "user",
        type: "job.reviewed",
        jobId: "job_1",
        sessionId: "session_1",
        payload: { reviewLabel: "yes" },
      }),
    ).toMatchObject({ id: "event_1" });

    expect(
      ProposalRecordSchema.parse({
        schemaVersion: 1,
        id: "proposal_1",
        createdAt: "2026-05-12T20:00:00.000Z",
        status: "pending",
        kind: "scoring",
        targets: [{ type: "scoring_rule", id: "title.product_builder" }],
        summary: "Boost Product Builder titles",
        evidence: ["Two yes labels shared the same title signal"],
        proposedChange: { signalId: "title.product_builder", delta: 2 },
        scoringVersionFrom: "rules-v1",
      }),
    ).toMatchObject({ id: "proposal_1" });

    expect(
      SessionRecordSchema.parse({
        schemaVersion: 1,
        id: "session_1",
        startedAt: "2026-05-12T20:00:00.000Z",
        command: "discover",
        reviewedJobIds: ["job_1"],
        skippedJobIds: [],
        sessionAdjustments: [
          {
            id: "adjustment_1",
            createdAt: "2026-05-12T20:00:00.000Z",
            signalId: "title.product_builder",
            delta: 2,
            reason: "Positive feedback",
            reversible: true,
          },
        ],
        metrics: {
          fetched: 50,
          uniqueAfterDedupe: 25,
          reviewed: 10,
          yes: 2,
          maybe: 3,
          no: 5,
          precisionAt10: 0.5,
        },
      }),
    ).toMatchObject({ id: "session_1" });

    expect(
      DoNotMergeRecordSchema.parse({
        schemaVersion: 1,
        id: "dnm_1",
        createdAt: "2026-05-12T20:00:00.000Z",
        jobIdA: "job_1",
        jobIdB: "job_2",
        reason: "Different locations",
      }),
    ).toMatchObject({ id: "dnm_1" });
  });

  it("rejects invalid enums", () => {
    expect(() =>
      JobRecordSchema.parse({
        schemaVersion: 1,
        id: "job_1",
        title: "Product Builder",
        company: "Example AI",
        discoveredAt: "2026-05-12T20:00:00.000Z",
        updatedAt: "2026-05-12T20:00:00.000Z",
        lifecycleStatus: "saved",
        currentReviewLabel: "later",
        workType: "remote",
        sourceListingIds: [],
        score,
      }),
    ).toThrow();

    expect(() =>
      AppConfigSchema.parse({
        schemaVersion: 1,
        reviewLimit: 10,
        fetchLimit: 50,
        sourceCooldownHours: 24,
        broadApiProvider: "jooble",
        broadApiCredentialEnvVar: "JOOBLE_API_KEY",
        querySeeds: [],
        preferences: {
          workType: { value: ["remote"], mode: "required" },
        },
      }),
    ).toThrow();

    expect(() =>
      SourceListingRecordSchema.parse({
        schemaVersion: 1,
        id: "listing_1",
        jobId: "job_1",
        sourceId: "source_1",
        sourceType: "ats",
        adapter: "ashby",
        sourceUrl: "https://jobs.ashbyhq.com/example/role",
        firstSeenAt: "2026-05-12T20:00:00.000Z",
        fetchStatus: "missing",
        normalizedMetadata: candidateMetadata,
      }),
    ).toThrow();
  });
});
