import { z } from "zod";

import { PreferenceModeSchema, WorkTypeSchema } from "./types.js";

const PreferenceSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    mode: PreferenceModeSchema,
  });

export const AppConfigSchema = z.object({
  schemaVersion: z.literal(1),
  reviewLimit: z.number().int().positive(),
  fetchLimit: z.number().int().positive(),
  sourceCooldownHours: z.number().nonnegative(),
  broadApiProvider: z.enum(["jooble", "adzuna"]),
  broadApiCredentialEnvVar: z.string().min(1),
  querySeeds: z.array(z.string()),
  preferences: z.object({
    workType: PreferenceSchema(z.array(WorkTypeSchema)).optional(),
    locations: PreferenceSchema(z.array(z.string())).optional(),
    seniority: PreferenceSchema(z.array(z.string())).optional(),
    compensationFloor: PreferenceSchema(z.number()).optional(),
    companyTypes: PreferenceSchema(z.array(z.string())).optional(),
    exclusions: PreferenceSchema(z.array(z.string())).optional(),
  }),
});
export type AppConfig = z.infer<typeof AppConfigSchema>;

export const ScoringRulesRecordSchema = z.object({
  schemaVersion: z.literal(1),
  scoringVersion: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  bucketMaxPoints: z.object({
    title: z.number(),
    ai_tools: z.number(),
    product_build: z.number(),
    agent_llm: z.number(),
    production_ownership: z.number(),
    exclusion: z.number(),
    preferences: z.number(),
    source_quality: z.number(),
  }),
  signalWeights: z.record(z.number()),
  exclusionPatterns: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      pattern: z.string().min(1),
      matchField: z.enum(["title", "description", "company", "metadata"]),
    }),
  ),
});
export type ScoringRulesRecord = z.infer<typeof ScoringRulesRecordSchema>;
