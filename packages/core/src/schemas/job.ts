import { z } from "zod";

import { LifecycleStatusSchema, ReviewLabelSchema, WorkTypeSchema } from "./types.js";

export const SignalSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  polarity: z.enum(["positive", "negative", "neutral"]),
  source: z.enum(["title", "metadata", "description", "preference", "source"]),
  weight: z.number(),
});
export type Signal = z.infer<typeof SignalSchema>;

export const ScoreBucketSchema = z.object({
  name: z.enum([
    "title",
    "ai_tools",
    "product_build",
    "agent_llm",
    "production_ownership",
    "exclusion",
    "preferences",
    "source_quality",
  ]),
  points: z.number(),
  maxPoints: z.number(),
  signals: z.array(SignalSchema),
});
export type ScoreBucket = z.infer<typeof ScoreBucketSchema>;

export const ScoreResultSchema = z.object({
  total: z.number().min(0).max(100),
  buckets: z.array(ScoreBucketSchema),
  positiveSignals: z.array(SignalSchema),
  negativeSignals: z.array(SignalSchema),
  surfacedReason: z.string().min(1),
  scoredAt: z.string().datetime({ offset: true }),
  scoringVersion: z.string().min(1),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const JobRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  discoveredAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  lifecycleStatus: LifecycleStatusSchema,
  currentReviewLabel: ReviewLabelSchema.optional(),
  location: z.string().optional(),
  workType: WorkTypeSchema,
  compensation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
      period: z.enum(["year", "month", "hour", "unknown"]).optional(),
      raw: z.string().optional(),
    })
    .optional(),
  postedDate: z.string().optional(),
  industry: z.string().optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead", "unknown"]).optional(),
  sourceListingIds: z.array(z.string()),
  score: ScoreResultSchema,
  notes: z.array(z.string()).optional(),
  archivedAt: z.string().datetime({ offset: true }).optional(),
  archiveReason: z.string().optional(),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;
