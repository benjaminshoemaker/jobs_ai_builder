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
  onOutcome?: (outcome: ReviewOutcome) => Promise<void>;
  onInterrupted?: (context: ReviewInterruptionContext) => Promise<void>;
};

export type ReviewInterruptionContext = {
  error: unknown;
  completedOutcomes: ReviewOutcome[];
};

export class ReviewInterruptedError extends Error {
  readonly completedOutcomes: ReviewOutcome[];
  readonly cause: unknown;

  constructor(context: ReviewInterruptionContext) {
    super("Review interrupted before all jobs were labeled.");
    this.name = "ReviewInterruptedError";
    this.completedOutcomes = context.completedOutcomes;
    this.cause = context.error;
  }
}

export async function runReviewFlow(options: RunReviewFlowOptions): Promise<ReviewOutcome[]> {
  const prompt = options.prompt ?? promptForReview;
  const write = options.write ?? console.log;
  const outcomes: ReviewOutcome[] = [];

  try {
    for (const item of options.items) {
      const transientDescription = await options.resolveDescription?.(item);
      const renderedItem = transientDescription ? { ...item, transientDescription } : item;
      write(renderReviewCard(renderedItem));
      const result = await prompt(renderedItem);
      const outcome = {
        jobId: item.job.id,
        action: result.action,
        ...(result.action === "skip" ? {} : { reviewLabel: result.action }),
        notes: result.notes ?? [],
      } satisfies ReviewOutcome;
      await options.onOutcome?.(outcome);
      outcomes.push(outcome);
    }
  } catch (error) {
    const context = { error, completedOutcomes: outcomes };
    await options.onInterrupted?.(context);
    throw new ReviewInterruptedError(context);
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
