import { describe, expect, it } from "vitest";

import { calculateEvaluationMetrics } from "./evaluationMetrics.js";
import { createLearningJob, createSourceListing } from "./testFixtures.js";

describe("evaluation metrics", () => {
  it("tracks session counts, precision@10, and source-level acceptance rates", () => {
    const jobs = [
      createLearningJob("job_yes", 90, {}, ["listing_a"]),
      createLearningJob("job_maybe", 80, {}, ["listing_a2"]),
      createLearningJob("job_no", 70, {}, ["listing_b"]),
    ];
    const metrics = calculateEvaluationMetrics({
      fetched: 50,
      uniqueAfterDedupe: 12,
      jobs,
      sourceListings: [
        createSourceListing("listing_a", "job_yes", "source_a"),
        createSourceListing("listing_a2", "job_maybe", "source_a"),
        createSourceListing("listing_b", "job_no", "source_b"),
      ],
      outcomes: [
        { jobId: "job_yes", label: "yes" },
        { jobId: "job_maybe", label: "maybe" },
        { jobId: "job_no", label: "no" },
      ],
    });

    expect(metrics).toMatchObject({
      fetched: 50,
      uniqueAfterDedupe: 12,
      reviewed: 3,
      yes: 1,
      maybe: 1,
      no: 1,
      precisionAt10: 2 / 3,
      sourceAcceptanceRates: [
        { sourceId: "source_a", reviewed: 2, accepted: 2, acceptanceRate: 1 },
        { sourceId: "source_b", reviewed: 1, accepted: 0, acceptanceRate: 0 },
      ],
    });
  });
});
