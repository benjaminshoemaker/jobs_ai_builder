import type { ReviewQueueItem, Signal } from "../../../../packages/core/src/index.js";

export function renderReviewCard(item: ReviewQueueItem): string {
  const { job, transientDescription } = item;
  const primaryListing = item.sourceListings[0];
  const primarySource = primaryListing
    ? item.sources.find((source) => source.id === primaryListing.sourceId)
    : undefined;
  const sourceLabel = primarySource
    ? `${primarySource.name} (${primarySource.adapter})`
    : primaryListing
      ? `${primaryListing.sourceId} (${primaryListing.adapter})`
      : "Unknown source";
  const signals = [...job.score.positiveSignals, ...job.score.negativeSignals];

  return [
    "----------------------------------------",
    `${job.title} @ ${job.company}`,
    `Source: ${sourceLabel}`,
    `Link: ${primaryListing?.sourceUrl ?? "No source link"}`,
    `Location: ${job.location ?? "Unknown"} | Work type: ${job.workType}`,
    `Compensation: ${formatCompensation(job.compensation)}`,
    `Posted: ${job.postedDate ?? "Unknown"}`,
    `Score: ${job.score.total}/100`,
    `Reason: ${job.score.surfacedReason}`,
    `Signals: ${formatSignals(signals)}`,
    transientDescription
      ? `Description (${formatDescriptionKind(item.transientDescriptionKind)}):\n${transientDescription}`
      : "Description: Not fetched",
    "----------------------------------------",
  ].join("\n");
}

function formatDescriptionKind(kind: ReviewQueueItem["transientDescriptionKind"]): string {
  if (kind === "full") return "full, not saved";
  if (kind === "snippet") return "snippet fallback, not saved";
  return "not saved";
}

function formatCompensation(compensation: ReviewQueueItem["job"]["compensation"]): string {
  if (!compensation) return "Unknown";
  if (compensation.raw) return compensation.raw;
  const min = compensation.min ? formatCurrency(compensation.min, compensation.currency) : undefined;
  const max = compensation.max ? formatCurrency(compensation.max, compensation.currency) : undefined;
  if (min && max) return `${min}-${max}`;
  return min ?? max ?? "Unknown";
}

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSignals(signals: Signal[]): string {
  if (signals.length === 0) return "None";
  return signals
    .map((signal) => `${signal.polarity}: ${signal.label} (${signal.source}, ${signal.weight})`)
    .join("; ");
}
