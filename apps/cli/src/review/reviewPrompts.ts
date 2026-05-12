import { input, select } from "@inquirer/prompts";

import type { ReviewQueueItem } from "../../../../packages/core/src/index.js";
import { renderReviewCard } from "./renderReviewCard.js";

export type ReviewPromptAction = "yes" | "maybe" | "no" | "skip";

export type ReviewPromptResult = {
  action: ReviewPromptAction;
  notes?: string[];
};

export type ReviewOutcome = {
  jobId: string;
  action: ReviewPromptAction;
  reviewLabel?: Exclude<ReviewPromptAction, "skip">;
  notes: string[];
};

export type ReviewPrompt = (item: ReviewQueueItem) => Promise<ReviewPromptResult>;

export type RunReviewFlowOptions = {
  items: ReviewQueueItem[];
  prompt?: ReviewPrompt;
  write?: (message: string) => void;
  resolveDescription?: (item: ReviewQueueItem) => Promise<string | undefined>;
};

export async function runReviewFlow(options: RunReviewFlowOptions): Promise<ReviewOutcome[]> {
  const prompt = options.prompt ?? promptForReview;
  const write = options.write ?? console.log;
  const outcomes: ReviewOutcome[] = [];

  for (const item of options.items) {
    const transientDescription = await options.resolveDescription?.(item);
    const renderedItem = transientDescription ? { ...item, transientDescription } : item;
    write(renderReviewCard(renderedItem));
    const result = await prompt(renderedItem);
    outcomes.push({
      jobId: item.job.id,
      action: result.action,
      ...(result.action === "skip" ? {} : { reviewLabel: result.action }),
      notes: result.notes ?? [],
    });
  }

  return outcomes;
}

export async function promptForReview(): Promise<ReviewPromptResult> {
  const action = await select<ReviewPromptAction>({
    message: "Review this job",
    choices: [
      { name: "Yes", value: "yes" },
      { name: "Maybe", value: "maybe" },
      { name: "No", value: "no" },
      { name: "Skip", value: "skip" },
    ],
  });
  const note = await input({
    message: "Optional note",
    required: false,
  });

  return {
    action,
    notes: note.trim() ? [note.trim()] : [],
  };
}
