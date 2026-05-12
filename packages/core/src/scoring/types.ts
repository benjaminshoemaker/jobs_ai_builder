import type {
  AppConfig,
  ScoringRulesRecord,
  Signal,
  SourceRecord,
  WorkType,
} from "../schemas/index.js";

export type ScoringCandidate = {
  title: string;
  company: string;
  location?: string;
  workType?: WorkType;
  compensationMin?: number;
  compensationMax?: number;
  sourceType?: SourceRecord["type"];
  transientDescription?: string;
};

export type ScoreCandidateOptions = {
  config?: AppConfig;
  scoringRules?: ScoringRulesRecord;
  now?: string;
};

export type PreferenceEvaluation = {
  filtered: boolean;
  points: number;
  signals: Signal[];
};
