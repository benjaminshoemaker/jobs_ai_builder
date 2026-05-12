import type { Command } from "commander";

import {
  createReviewQueue,
  fetchPageDescription,
  persistReviewLabel,
  type ReviewQueueItem,
  type ReviewLabel,
} from "../../../../packages/core/src/index.js";
import { runReviewFlow } from "../review/reviewPrompts.js";
import { loadLocalData } from "./localData.js";

export function registerReviewCommand(program: Command): void {
  const review = program.command("review").description("Review an existing queue, such as maybe jobs");

  review
    .command("candidates")
    .description("Review saved candidate jobs")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--limit <n>", "maximum jobs to review", "10")
    .option("--label <label>", "apply yes, maybe, or no without prompting")
    .option("--note <note>", "optional note to attach to each labeled job")
    .option("--max-description-requests <n>", "maximum full job page fetches for this review", "10")
    .option("--skip-description-fetch", "skip full job page fetching")
    .action(async (options: ReviewCandidatesOptions) => {
      const data = await loadLocalData(options.dataDir);
      const limit = parsePositiveInt(options.limit, "limit");
      const candidateJobs = data.jobs.filter((job) => job.lifecycleStatus === "candidate");
      if (candidateJobs.length === 0) {
        console.log("No candidate jobs found.");
        return;
      }

      const queue = createReviewQueue(candidateJobs, data.sourceListings, data.sources, { limit });
      if (options.label) {
        const label = parseReviewLabel(options.label);
        for (const item of queue) {
          await persistReviewLabel({
            dataDir: options.dataDir,
            jobId: item.job.id,
            reviewLabel: label,
            notes: options.note ? [options.note] : [],
            now: new Date().toISOString(),
          });
          console.log(`Reviewed ${item.job.id} as ${label}.`);
        }
        return;
      }

      const maxDescriptionRequests = parseNonNegativeInt(
        options.maxDescriptionRequests,
        "max description requests",
      );
      const hydrated = options.skipDescriptionFetch || maxDescriptionRequests === 0
        ? { items: queue, attempted: 0, succeeded: 0 }
        : await hydrateReviewDescriptions(queue, maxDescriptionRequests);
      if (hydrated.attempted > 0) {
        console.log(`Full descriptions fetched: ${hydrated.succeeded}/${hydrated.attempted}.`);
      }

      await runReviewFlow({
        items: hydrated.items,
        onOutcome: async (outcome) => {
          if (!outcome.reviewLabel) return;
          await persistReviewLabel({
            dataDir: options.dataDir,
            jobId: outcome.jobId,
            reviewLabel: outcome.reviewLabel,
            notes: outcome.notes,
            now: new Date().toISOString(),
          });
        },
      });
    });

  review
    .command("maybe")
    .description("Review jobs currently labeled maybe")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--label <label>", "apply yes, maybe, or no without prompting")
    .option("--note <note>", "optional note to attach to each relabeled job")
    .action(async (options: ReviewMaybeOptions) => {
      const data = await loadLocalData(options.dataDir);
      const maybeJobs = data.jobs.filter((job) => job.lifecycleStatus === "maybe");
      if (maybeJobs.length === 0) {
        console.log("No maybe jobs found.");
        return;
      }

      if (options.label) {
        const label = parseReviewLabel(options.label);
        for (const job of maybeJobs) {
          await persistReviewLabel({
            dataDir: options.dataDir,
            jobId: job.id,
            reviewLabel: label,
            notes: options.note ? [options.note] : [],
            now: new Date().toISOString(),
          });
          console.log(`Reviewed ${job.id} as ${label}.`);
        }
        return;
      }

      await runReviewFlow({
        items: createReviewQueue(maybeJobs, data.sourceListings, data.sources, { includeMaybe: true }),
        onOutcome: async (outcome) => {
          if (!outcome.reviewLabel) return;
          await persistReviewLabel({
            dataDir: options.dataDir,
            jobId: outcome.jobId,
            reviewLabel: outcome.reviewLabel,
            notes: outcome.notes,
            now: new Date().toISOString(),
          });
        },
      });
    });
}

type ReviewMaybeOptions = {
  dataDir: string;
  label?: string;
  note?: string;
};

type ReviewCandidatesOptions = ReviewMaybeOptions & {
  limit: string;
  maxDescriptionRequests: string;
  skipDescriptionFetch?: boolean;
};

function parseReviewLabel(label: string): ReviewLabel {
  if (!["yes", "maybe", "no"].includes(label)) {
    throw new Error(`Invalid review label: ${label}`);
  }
  return label as ReviewLabel;
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

function parseNonNegativeInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}

async function hydrateReviewDescriptions(
  items: ReviewQueueItem[],
  maxDescriptionRequests: number,
): Promise<{ items: ReviewQueueItem[]; attempted: number; succeeded: number }> {
  let attempted = 0;
  let succeeded = 0;
  const hydrated: ReviewQueueItem[] = [];

  for (const item of items) {
    const listing = item.sourceListings.find((sourceListing) =>
      sourceListing.adapter !== "linkedin" && sourceListing.fetchStatus !== "no_fetch"
    );
    if (!listing || attempted >= maxDescriptionRequests) {
      hydrated.push(item);
      continue;
    }

    attempted += 1;
    const description = await fetchPageDescription(listing.sourceUrl);
    if (description) {
      succeeded += 1;
      hydrated.push({
        ...item,
        transientDescription: description,
        transientDescriptionKind: "full",
      });
      continue;
    }

    hydrated.push(item);
  }

  return { items: hydrated, attempted, succeeded };
}
