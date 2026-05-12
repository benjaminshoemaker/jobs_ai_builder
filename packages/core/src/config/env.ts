import type { AppConfig } from "../schemas/index.js";

export type CredentialEnvironment = Record<string, string | undefined>;

export function readConfiguredCredential(
  config: Pick<AppConfig, "broadApiCredentialEnvVar">,
  environment: CredentialEnvironment = process.env,
): string | undefined {
  return environment[config.broadApiCredentialEnvVar];
}
