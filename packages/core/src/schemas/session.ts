import { z } from "zod";

export const SessionRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }).optional(),
  command: z.enum(["discover", "review-maybe", "refresh"]),
  reviewedJobIds: z.array(z.string()),
  skippedJobIds: z.array(z.string()),
  sessionAdjustments: z.array(
    z.object({
      id: z.string().min(1),
      createdAt: z.string().datetime({ offset: true }),
      signalId: z.string().optional(),
      sourceId: z.string().optional(),
      delta: z.number(),
      reason: z.string().min(1),
      reversible: z.literal(true),
    }),
  ),
  metrics: z.object({
    fetched: z.number().int().nonnegative(),
    uniqueAfterDedupe: z.number().int().nonnegative(),
    reviewed: z.number().int().nonnegative(),
    yes: z.number().int().nonnegative(),
    maybe: z.number().int().nonnegative(),
    no: z.number().int().nonnegative(),
    precisionAt10: z.number().min(0).max(1).optional(),
  }),
});
export type SessionRecord = z.infer<typeof SessionRecordSchema>;
