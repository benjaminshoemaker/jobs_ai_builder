import { z } from "zod";

export const DoNotMergeRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  jobIdA: z.string().min(1),
  jobIdB: z.string().min(1),
  reason: z.string().optional(),
});
export type DoNotMergeRecord = z.infer<typeof DoNotMergeRecordSchema>;
