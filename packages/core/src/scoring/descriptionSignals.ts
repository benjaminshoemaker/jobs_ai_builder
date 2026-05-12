import { createDefaultScoringRules } from "../config/index.js";
import type { ScoreBucket, ScoringRulesRecord, Signal } from "../schemas/index.js";
import { SIGNAL_RULES } from "./signals.js";

export type DescriptionSignalMatch = {
  bucket: ScoreBucket["name"];
  signal: Signal;
  sourceMetadata: {
    source: "description";
    ruleId: string;
    persisted: false;
  };
};

export type DescriptionSignalExtraction = {
  matches: DescriptionSignalMatch[];
  sourceMetadata: {
    source: "description";
    signalCount: number;
    persisted: false;
  };
};

export function extractDescriptionSignals(
  transientDescription: string | undefined,
  scoringRules: ScoringRulesRecord = createDefaultScoringRules(),
): DescriptionSignalExtraction {
  const descriptionText = transientDescription ?? "";
  const matches = SIGNAL_RULES.flatMap((rule): DescriptionSignalMatch[] => {
    if (!rule.fields.includes("transientDescription")) {
      return [];
    }

    const matched = rule.patterns.some((pattern) => pattern.test(descriptionText));
    if (!matched) {
      return [];
    }

    return [
      {
        bucket: rule.bucket,
        signal: {
          id: rule.id,
          label: rule.label,
          polarity: rule.polarity,
          source: "description",
          weight: scoringRules.signalWeights[rule.id] ?? rule.defaultWeight,
        },
        sourceMetadata: {
          source: "description",
          ruleId: rule.id,
          persisted: false,
        },
      },
    ];
  });

  return {
    matches,
    sourceMetadata: {
      source: "description",
      signalCount: matches.length,
      persisted: false,
    },
  };
}
