import type { JobRecord, LifecycleStatus, ReviewLabel } from "../schemas/index.js";

export type ReviewTransitionInput = {
  job: JobRecord;
  reviewLabel: ReviewLabel;
  now: string;
  notes?: string[];
};

export type JobVisibilityFilter = {
  status?: LifecycleStatus;
  includeRejected?: boolean;
  includeArchived?: boolean;
};

export function lifecycleStatusForReviewLabel(reviewLabel: ReviewLabel): LifecycleStatus {
  if (reviewLabel === "yes") return "active";
  if (reviewLabel === "maybe") return "maybe";
  return "rejected";
}

export function applyReviewTransition(input: ReviewTransitionInput): JobRecord {
  const notes = [...(input.job.notes ?? []), ...(input.notes ?? [])];

  return {
    ...input.job,
    updatedAt: input.now,
    currentReviewLabel: input.reviewLabel,
    lifecycleStatus: lifecycleStatusForReviewLabel(input.reviewLabel),
    ...(notes.length > 0 ? { notes } : {}),
  };
}

export function filterJobsForVisibility(
  jobs: JobRecord[],
  filter: JobVisibilityFilter = {},
): JobRecord[] {
  if (filter.status) {
    return jobs.filter((job) => job.lifecycleStatus === filter.status);
  }

  return jobs.filter((job) => {
    if (job.lifecycleStatus === "rejected" && !filter.includeRejected) return false;
    if (job.lifecycleStatus === "archived" && !filter.includeArchived) return false;
    return true;
  });
}
