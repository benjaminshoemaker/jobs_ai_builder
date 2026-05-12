import { describe, expect, it } from "vitest";

import type { ReviewQueueItem } from "../../../../packages/core/src/index.js";
import { renderReviewCard } from "./renderReviewCard.js";

describe("review card renderer", () => {
  it("renders rich job metadata and transient description content", () => {
    const card = renderReviewCard({
      ...createReviewItem(),
      transientDescription: "Build customer-facing workflows with Claude Code and agent orchestration.",
      transientDescriptionKind: "full",
    });

    expect(card).toContain("Product Builder @ Example AI");
    expect(card).toContain("Source: Example Jobs (ashby)");
    expect(card).toContain("Link: https://jobs.ashbyhq.com/example/product-builder");
    expect(card).toContain("Location: Remote | Work type: remote");
    expect(card).toContain("Compensation: $160K-$180K");
    expect(card).toContain("Posted: 2026-05-01");
    expect(card).toContain("Score: 82/100");
    expect(card).toContain("Reason: Strong title and AI coding signal");
    expect(card).toContain("Signals: positive: Mentions Claude Code");
    expect(card).toContain("Description (full, not saved):");
    expect(card).toContain("agent orchestration");
  });

  it("renders candidates without fetched descriptions", () => {
    expect(renderReviewCard(createReviewItem())).toContain("Description: Not fetched");
  });
});

function createReviewItem(): ReviewQueueItem {
  return {
    job: {
      schemaVersion: 1,
      id: "job_1",
      title: "Product Builder",
      company: "Example AI",
      discoveredAt: "2026-05-12T20:00:00.000Z",
      updatedAt: "2026-05-12T20:00:00.000Z",
      lifecycleStatus: "candidate",
      location: "Remote",
      workType: "remote",
      compensation: { raw: "$160K-$180K", min: 160000, max: 180000, currency: "USD" },
      postedDate: "2026-05-01",
      sourceListingIds: ["listing_1"],
      score: {
        total: 82,
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
        surfacedReason: "Strong title and AI coding signal",
        scoredAt: "2026-05-12T20:00:00.000Z",
        scoringVersion: "rules-v1",
      },
    },
    sourceListings: [
      {
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
          location: "Remote",
          workType: "remote",
          postedDate: "2026-05-01",
        },
      },
    ],
    sources: [
      {
        schemaVersion: 1,
        id: "source_1",
        type: "ats",
        adapter: "ashby",
        name: "Example Jobs",
        reusable: true,
        enabled: true,
      },
    ],
  };
}
