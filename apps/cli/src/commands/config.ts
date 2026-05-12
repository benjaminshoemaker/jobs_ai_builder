import type { Command } from "commander";
import {
  AppConfigSchema,
  loadConfig,
  saveConfig,
  type AppConfig,
  type PreferenceMode,
  type WorkType,
} from "../../../../packages/core/src/index.js";

export function registerConfigCommand(program: Command): void {
  const config = program.command("config").description("View or edit local configuration");

  config
    .command("set")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--provider <provider>", "broad API provider")
    .option("--credential-env <name>", "credential environment variable")
    .option("--review-limit <n>", "review limit")
    .option("--fetch-limit <n>", "fetch limit")
    .option("--cooldown <hours>", "source cooldown hours")
    .option("--work-type <value:mode>", "work type preference")
    .option("--exclusion <value:mode>", "exclusion preference")
    .action(async (options: ConfigSetOptions) => {
      const provider = options.provider ? parseProvider(options.provider) : undefined;
      const reviewLimit = options.reviewLimit
        ? parsePositiveInt(options.reviewLimit, "review limit")
        : undefined;
      const fetchLimit = options.fetchLimit
        ? parsePositiveInt(options.fetchLimit, "fetch limit")
        : undefined;
      const workType = options.workType ? parseWorkTypePreference(options.workType) : undefined;
      const exclusion = options.exclusion ? parseStringPreference(options.exclusion) : undefined;
      const current = await loadConfig(options.dataDir).catch(() => AppConfigSchema.parse({
        schemaVersion: 1,
        reviewLimit: 10,
        fetchLimit: 50,
        sourceCooldownHours: 24,
        broadApiProvider: "jooble",
        broadApiCredentialEnvVar: "JOOBLE_API_KEY",
        querySeeds: ["AI Builder"],
        preferences: {},
      }));
      const next: AppConfig = {
        ...current,
        ...(provider ? { broadApiProvider: provider } : {}),
        ...(options.credentialEnv ? { broadApiCredentialEnvVar: options.credentialEnv } : {}),
        ...(reviewLimit ? { reviewLimit } : {}),
        ...(fetchLimit ? { fetchLimit } : {}),
        ...(options.cooldown ? { sourceCooldownHours: Number(options.cooldown) } : {}),
        preferences: {
          ...current.preferences,
          ...(workType ? { workType } : {}),
          ...(exclusion ? { exclusions: exclusion } : {}),
        },
      };

      AppConfigSchema.parse(next);
      await saveConfig(options.dataDir, next);
      console.log("Config updated.");
    });
}

type ConfigSetOptions = {
  dataDir: string;
  provider?: string;
  credentialEnv?: string;
  reviewLimit?: string;
  fetchLimit?: string;
  cooldown?: string;
  workType?: string;
  exclusion?: string;
};

function parseProvider(provider: string): AppConfig["broadApiProvider"] {
  if (provider !== "jooble" && provider !== "adzuna") {
    throw new Error(`Invalid provider: ${provider}`);
  }
  return provider;
}

function parseWorkTypePreference(value: string): { value: WorkType[]; mode: PreferenceMode } {
  const parsed = parsePreference(value);
  if (!["remote", "hybrid", "onsite", "unknown"].includes(parsed.value)) {
    throw new Error(`Invalid work type: ${parsed.value}`);
  }
  return { value: [parsed.value as WorkType], mode: parsed.mode };
}

function parseStringPreference(value: string): { value: string[]; mode: PreferenceMode } {
  const parsed = parsePreference(value);
  return { value: [parsed.value], mode: parsed.mode };
}

function parsePreference(value: string): { value: string; mode: PreferenceMode } {
  const [preferenceValue, mode] = value.split(":");
  if (!preferenceValue || !mode) {
    throw new Error("Preference must use value:mode.");
  }
  if (!["hard_filter", "soft_rank", "note_only"].includes(mode)) {
    throw new Error(`Invalid preference mode: ${mode}`);
  }
  return { value: preferenceValue, mode: mode as PreferenceMode };
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}
