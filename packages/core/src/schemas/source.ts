import { z } from "zod";

import { WorkTypeSchema } from "./types.js";

export const AdapterSchema = z.enum([
  "jooble",
  "adzuna",
  "ashby",
  "greenhouse",
  "lever",
  "manual",
  "linkedin",
]);
export type Adapter = z.infer<typeof AdapterSchema>;

export const CandidateMetadataSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  workType: WorkTypeSchema.optional(),
  compensationRaw: z.string().optional(),
  compensationMin: z.number().optional(),
  compensationMax: z.number().optional(),
  currency: z.string().optional(),
  postedDate: z.string().optional(),
  sourcePostedDateRaw: z.string().optional(),
});
export type CandidateMetadata = z.infer<typeof CandidateMetadataSchema>;

export const SourceListingRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  jobId: z.string().min(1),
  sourceId: z.string().min(1),
  sourceType: z.enum(["broad_api", "ats", "manual", "linkedin"]),
  adapter: AdapterSchema,
  sourceUrl: z.string().url(),
  externalId: z.string().optional(),
  firstSeenAt: z.string().datetime({ offset: true }),
  lastSeenAt: z.string().datetime({ offset: true }).optional(),
  fetchStatus: z.enum(["ok", "unavailable", "rate_limited", "error", "no_fetch"]),
  errorMessage: z.string().optional(),
  normalizedMetadata: CandidateMetadataSchema,
});
export type SourceListingRecord = z.infer<typeof SourceListingRecordSchema>;

export const SourceRecordSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  type: z.enum(["broad_api", "ats", "manual", "linkedin"]),
  adapter: AdapterSchema,
  name: z.string().min(1),
  reusable: z.boolean(),
  baseUrl: z.string().url().optional(),
  companySlug: z.string().optional(),
  credentialEnvVar: z.string().optional(),
  enabled: z.boolean(),
  lastFetchAt: z.string().datetime({ offset: true }).optional(),
  cooldownUntil: z.string().datetime({ offset: true }).optional(),
  defaultQuery: z.string().optional(),
});
export type SourceRecord = z.infer<typeof SourceRecordSchema>;
