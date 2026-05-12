import type { Command } from "commander";

import {
  createReviewQueue,
  persistReviewLabel,
  type ReviewLabel,
} from "../../../../packages/core/src/index.js";
import { runReviewFlow } from "../review/reviewPrompts.js";
import { loadLocalData } from "./localData.js";

export function registerReviewCommand(program: Command): void {
  const review = program.command("review").description("Review an existing queue, such as maybe jobs");

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

function parseReviewLabel(label: string): ReviewLabel {
  if (!["yes", "maybe", "no"].includes(label)) {
    throw new Error(`Invalid review label: ${label}`);
  }
  return label as ReviewLabel;
}
