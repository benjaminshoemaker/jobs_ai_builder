import type { Command } from "commander";

import { exportMetadata } from "../../../../packages/core/src/index.js";

export function registerExportCommand(program: Command): void {
  program
    .command("export")
    .description("Export curated metadata")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (options: { dataDir: string }) => {
      const result = await exportMetadata({
        dataDir: options.dataDir,
        now: new Date().toISOString(),
      });
      console.log(`Exported ${result.exported.jobs.length} job(s) to ${result.filePath}.`);
    });
}
