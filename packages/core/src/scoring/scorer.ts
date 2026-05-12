import {
  createDefaultConfig,
  createDefaultScoringRules,
} from "../config/index.js";
import {
  ScoreResultSchema,
  type ScoreBucket,
  type ScoreResult,
  type Signal,
} from "../schemas/index.js";
import { evaluatePreferences } from "./preferences.js";
import { detectRuleSignals, detectSourceQualitySignal } from "./signals.js";
import type { ScoreCandidateOptions, ScoringCandidate } from "./types.js";

const BUCKET_ORDER: ScoreBucket["name"][] = [
  "title",
  "ai_tools",
  "product_build",
  "agent_llm",
  "production_ownership",
  "exclusion",
  "preferences",
  "source_quality",
];

export function scoreCandidate(
  candidate: ScoringCandidate,
  options: ScoreCandidateOptions = {},
): ScoreResult {
  const config = options.config ?? createDefaultConfig();
  const scoringRules = options.scoringRules ?? createDefaultScoringRules();
  const scoredAt = options.now ?? new Date().toISOString();

  const detectedSignals = [
    ...detectRuleSignals(candidate, scoringRules),
    detectSourceQualitySignal(candidate),
  ].filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const preferenceEvaluation = evaluatePreferences(candidate, config);
  const bucketSignals = new Map<ScoreBucket["name"], Signal[]>(
    BUCKET_ORDER.map((bucket) => [bucket, []]),
  );

  for (const { bucket, signal } of detectedSignals) {
    bucketSignals.get(bucket)?.push(signal);
  }
  bucketSignals.get("preferences")?.push(...preferenceEvaluation.signals);

  const buckets = BUCKET_ORDER.map((bucketName) => {
    const signals = bucketSignals.get(bucketName) ?? [];
    const maxPoints = scoringRules.bucketMaxPoints[bucketName];
    const rawPoints =
      bucketName === "preferences"
        ? preferenceEvaluation.points
        : signals.reduce((sum, signal) => sum + signal.weight, 0);

    return {
      name: bucketName,
      points:
        bucketName === "exclusion" || bucketName === "preferences"
          ? clamp(rawPoints, -maxPoints, maxPoints)
          : clamp(rawPoints, 0, maxPoints),
      maxPoints,
      signals,
    };
  });

  const allSignals = buckets.flatMap((bucket) => bucket.signals);
  const positiveSignals = allSignals.filter((signal) => signal.polarity === "positive");
  const negativeSignals = allSignals.filter((signal) => signal.polarity === "negative");
  const total = clamp(
    buckets.reduce((sum, bucket) => sum + bucket.points, 0),
    0,
    100,
  );

  return ScoreResultSchema.parse({
    total,
    buckets,
    positiveSignals,
    negativeSignals,
    surfacedReason: createSurfacedReason(positiveSignals, negativeSignals),
    scoredAt,
    scoringVersion: scoringRules.scoringVersion,
  });
}

function createSurfacedReason(positiveSignals: Signal[], negativeSignals: Signal[]): string {
  const positiveLabels = positiveSignals.slice(0, 3).map((signal) => signal.label);
  const negativeLabels = negativeSignals.slice(0, 2).map((signal) => signal.label);

  if (positiveLabels.length > 0 && negativeLabels.length > 0) {
    return `${positiveLabels.join("; ")}; concerns: ${negativeLabels.join("; ")}`;
  }

  if (positiveLabels.length > 0) {
    return positiveLabels.join("; ");
  }

  if (negativeLabels.length > 0) {
    return `Concerns: ${negativeLabels.join("; ")}`;
  }

  return "No strong AI Builder signals found";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
