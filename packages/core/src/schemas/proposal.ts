import { z } from "zod";

export const ProposalTargetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("job"), id: z.string().min(1) }),
  z.object({ type: z.literal("source"), id: z.string().min(1) }),
  z.object({ type: z.literal("query"), id: z.string().min(1) }),
  z.object({ type: z.literal("scoring_rule"), id: z.string().min(1) }),
  z.object({ type: z.literal("preference"), id: z.string().min(1) }),
  z.object({ type: z.literal("classifier"), id: z.string().min(1) }),
]);
export type ProposalTarget = z.infer<typeof ProposalTargetSchema>;

export const ProposalRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  status: z.enum(["pending", "approved", "rejected", "deferred"]),
  kind: z.enum(["source", "query", "scoring", "prompt", "classifier"]),
  targets: z.array(ProposalTargetSchema),
  summary: z.string().min(1),
  evidence: z.array(z.string()),
  proposedChange: z.record(z.unknown()),
  scoringVersionFrom: z.string().optional(),
  scoringVersionTo: z.string().optional(),
  decidedAt: z.string().datetime({ offset: true }).optional(),
  appliedAt: z.string().datetime({ offset: true }).optional(),
});
export type ProposalRecord = z.infer<typeof ProposalRecordSchema>;
