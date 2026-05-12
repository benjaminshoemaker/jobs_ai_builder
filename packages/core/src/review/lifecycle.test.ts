import { describe, expect, it } from "vitest";

import {
  applyReviewTransition,
  filterJobsForVisibility,
  lifecycleStatusForReviewLabel,
} from "./lifecycle.js";
import { createJob } from "./testFixtures.js";

describe("review lifecycle transitions", () => {
  it("maps review labels to lifecycle statuses while preserving both fields", () => {
    expect(lifecycleStatusForReviewLabel("yes")).toBe("active");
    expect(lifecycleStatusForReviewLabel("maybe")).toBe("maybe");
    expect(lifecycleStatusForReviewLabel("no")).toBe("rejected");

    const reviewed = applyReviewTransition({
      job: createJob({ lifecycleStatus: "candidate" }),
      reviewLabel: "yes",
      now: "2026-05-12T21:00:00.000Z",
    });

    expect(reviewed.currentReviewLabel).toBe("yes");
    expect(reviewed.lifecycleStatus).toBe("active");
  });

  it("hides rejected jobs from normal list inputs but includes them with explicit filters", () => {
    const active = createJob({ id: "job_active", lifecycleStatus: "active" });
    const rejected = createJob({ id: "job_rejected", lifecycleStatus: "rejected" });
    const archived = createJob({ id: "job_archived", lifecycleStatus: "archived" });
    const jobs = [active, rejected, archived];

    expect(filterJobsForVisibility(jobs).map((job) => job.id)).toEqual(["job_active"]);
    expect(filterJobsForVisibility(jobs, { includeRejected: true }).map((job) => job.id)).toEqual([
      "job_active",
      "job_rejected",
    ]);
    expect(filterJobsForVisibility(jobs, { status: "rejected" }).map((job) => job.id)).toEqual([
      "job_rejected",
    ]);
  });
});
