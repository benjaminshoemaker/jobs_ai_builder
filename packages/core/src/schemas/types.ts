import { z } from "zod";

export const ReviewLabelSchema = z.enum(["yes", "maybe", "no"]);
export type ReviewLabel = z.infer<typeof ReviewLabelSchema>;

export const LifecycleStatusSchema = z.enum([
  "candidate",
  "active",
  "maybe",
  "rejected",
  "archived",
]);
export type LifecycleStatus = z.infer<typeof LifecycleStatusSchema>;

export const WorkTypeSchema = z.enum(["remote", "hybrid", "onsite", "unknown"]);
export type WorkType = z.infer<typeof WorkTypeSchema>;

export const PreferenceModeSchema = z.enum(["hard_filter", "soft_rank", "note_only"]);
export type PreferenceMode = z.infer<typeof PreferenceModeSchema>;

export const IsoTimestampSchema = z.string().datetime({ offset: true });
