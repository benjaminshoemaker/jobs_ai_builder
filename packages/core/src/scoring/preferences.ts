import type { AppConfig, Signal, WorkType } from "../schemas/index.js";
import type { PreferenceEvaluation, ScoringCandidate } from "./types.js";

const KNOWN_WORK_TYPES: WorkType[] = ["remote", "hybrid", "onsite"];

export function evaluatePreferences(
  candidate: ScoringCandidate,
  config: AppConfig,
): PreferenceEvaluation {
  const signals: Signal[] = [];
  let points = 0;
  let filtered = false;

  const workTypePreference = config.preferences.workType;
  if (workTypePreference && workTypePreference.value.length > 0) {
    const candidateWorkType = candidate.workType ?? "unknown";
    const isKnownWorkType = KNOWN_WORK_TYPES.includes(candidateWorkType);
    const matches = isKnownWorkType && workTypePreference.value.includes(candidateWorkType);

    if (workTypePreference.mode === "hard_filter" && isKnownWorkType && !matches) {
      filtered = true;
      points -= 10;
      signals.push(preferenceSignal("preference.work_type_mismatch", "Work type is excluded", "negative", -10));
    } else if (workTypePreference.mode === "soft_rank") {
      if (matches) {
        points += 5;
        signals.push(preferenceSignal("preference.work_type_match", "Work type preference match", "positive", 5));
      } else if (isKnownWorkType) {
        points -= 5;
        signals.push(preferenceSignal("preference.work_type_mismatch", "Work type preference mismatch", "negative", -5));
      } else {
        signals.push(preferenceSignal("preference.work_type_unknown", "Work type needs review", "neutral", 0));
      }
    } else if (workTypePreference.mode === "note_only") {
      signals.push(
        preferenceSignal(
          matches ? "preference.work_type_match" : "preference.work_type_mismatch",
          matches ? "Work type preference match" : "Work type preference mismatch",
          "neutral",
          0,
        ),
      );
    }
  }

  const compensationPreference = config.preferences.compensationFloor;
  if (compensationPreference) {
    const maxCompensation = candidate.compensationMax;
    const belowFloor =
      typeof maxCompensation === "number" && maxCompensation < compensationPreference.value;
    const label = belowFloor ? "Compensation below floor" : "Compensation preference needs review";

    if (compensationPreference.mode === "hard_filter" && belowFloor) {
      filtered = true;
      points -= 10;
      signals.push(preferenceSignal("preference.compensation_below_floor", label, "negative", -10));
    } else if (compensationPreference.mode === "soft_rank" && belowFloor) {
      points -= 5;
      signals.push(preferenceSignal("preference.compensation_below_floor", label, "negative", -5));
    } else if (compensationPreference.mode === "soft_rank" && typeof maxCompensation === "number") {
      points += 5;
      signals.push(
        preferenceSignal("preference.compensation_meets_floor", "Compensation meets floor", "positive", 5),
      );
    } else if (compensationPreference.mode === "note_only") {
      signals.push(
        preferenceSignal(
          belowFloor ? "preference.compensation_below_floor" : "preference.compensation_unknown",
          label,
          "neutral",
          0,
        ),
      );
    }
  }

  const exclusionPreference = config.preferences.exclusions;
  if (exclusionPreference && exclusionPreference.value.length > 0) {
    const haystack = [candidate.title, candidate.company, candidate.location, candidate.transientDescription]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matched = exclusionPreference.value.find((term) => haystack.includes(term.toLowerCase()));

    if (matched && exclusionPreference.mode === "hard_filter") {
      filtered = true;
      points -= 10;
      signals.push(preferenceSignal("preference.exclusion_match", `Matches exclusion: ${matched}`, "negative", -10));
    } else if (matched && exclusionPreference.mode === "soft_rank") {
      points -= 5;
      signals.push(preferenceSignal("preference.exclusion_match", `Matches exclusion: ${matched}`, "negative", -5));
    } else if (matched && exclusionPreference.mode === "note_only") {
      signals.push(preferenceSignal("preference.exclusion_match", `Matches exclusion: ${matched}`, "neutral", 0));
    }
  }

  return {
    filtered,
    points: clamp(points, -10, 10),
    signals,
  };
}

function preferenceSignal(
  id: string,
  label: string,
  polarity: Signal["polarity"],
  weight: number,
): Signal {
  return {
    id,
    label,
    polarity,
    source: "preference",
    weight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
