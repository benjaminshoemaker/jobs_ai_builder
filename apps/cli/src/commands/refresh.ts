import type { Command } from "commander";

import {
  createDefaultConfig,
  createDefaultSourceRegistry,
  loadConfig,
  refreshListings,
} from "../../../../packages/core/src/index.js";

export function registerRefreshCommand(program: Command): void {
  program
    .command("refresh")
    .description("Refresh saved source listing status")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (options: { dataDir: string }) => {
      const config = await loadConfig(options.dataDir).catch(() => createDefaultConfig());
      const result = await refreshListings({
        dataDir: options.dataDir,
        config,
        registry: createDefaultSourceRegistry(),
        now: new Date().toISOString(),
      });

      if (result.refreshed.length === 0) {
        console.log("No source listings found.");
        return;
      }

      for (const item of result.refreshed) {
        console.log(`${item.sourceListingId}\t${item.status}${item.errorMessage ? `\t${item.errorMessage}` : ""}`);
      }
    });
}
