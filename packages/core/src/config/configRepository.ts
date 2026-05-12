import { AppConfigSchema, type AppConfig } from "../schemas/index.js";
import { atomicWriteJson, createStoragePaths, readJsonFile } from "../storage/index.js";
import { createDefaultConfig } from "./defaults.js";

export async function loadConfig(dataDir: string): Promise<AppConfig> {
  const { configFile } = createStoragePaths(dataDir);

  try {
    return await readJsonFile(configFile, AppConfigSchema);
  } catch (error) {
    if (isMissingFileError(error)) {
      return saveConfig(dataDir, createDefaultConfig());
    }

    throw error;
  }
}

export async function saveConfig(dataDir: string, config: AppConfig): Promise<AppConfig> {
  const { configFile } = createStoragePaths(dataDir);
  return atomicWriteJson(configFile, AppConfigSchema, config);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
