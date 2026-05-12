import { z } from "zod";

export const EventRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  timestamp: z.string().datetime({ offset: true }),
  actor: z.enum(["user", "system"]),
  type: z.enum([
    "source.fetch.started",
    "source.fetch.completed",
    "source.fetch.failed",
    "job.discovered",
    "job.deduped",
    "job.reviewed",
    "job.archived",
    "job.refreshed",
    "job.do_not_merge_created",
    "scoring.session_adjusted",
    "proposal.created",
    "proposal.approved",
    "proposal.rejected",
    "proposal.deferred",
    "proposal.applied",
    "session.interrupted",
  ]),
  jobId: z.string().optional(),
  sourceId: z.string().optional(),
  sourceListingId: z.string().optional(),
  sessionId: z.string().optional(),
  payload: z.record(z.unknown()),
});
export type EventRecord = z.infer<typeof EventRecordSchema>;
