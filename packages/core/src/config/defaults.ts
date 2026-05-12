import { AppConfigSchema, type AppConfig } from "../schemas/index.js";

export const DEFAULT_QUERY_SEEDS = [
  "AI Builder",
  "AI Product Engineer",
  "Product Builder",
  "Builder in Residence",
  "AI Solutions Builder",
  "Founding Product Engineer AI",
  "Claude Code Product Engineer",
  "Cursor Product Engineer",
  "agentic workflow product engineer",
] as const;

export function createDefaultConfig(): AppConfig {
  return AppConfigSchema.parse({
    schemaVersion: 1,
    reviewLimit: 10,
    fetchLimit: 50,
    sourceCooldownHours: 24,
    broadApiProvider: "jooble",
    broadApiCredentialEnvVar: "JOOBLE_API_KEY",
    querySeeds: [...DEFAULT_QUERY_SEEDS],
    preferences: {
      workType: { value: ["remote"], mode: "soft_rank" },
      locations: { value: [], mode: "note_only" },
      seniority: { value: [], mode: "note_only" },
      companyTypes: { value: [], mode: "note_only" },
      exclusions: {
        value: ["ML research", "prompt writer", "DevRel", "content role"],
        mode: "hard_filter",
      },
    },
  });
}
