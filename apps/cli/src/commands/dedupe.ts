import type { Command } from "commander";

import {
  createDoNotMergeDecision,
  listDoNotMergeDecisions,
} from "../../../../packages/core/src/index.js";

export function registerDedupeCommand(program: Command): void {
  const dedupe = program.command("dedupe").description("Manage deduplication decisions");

  dedupe
    .command("mark-do-not-merge <jobIdA> <jobIdB>")
    .description("Record that two jobs should never be merged")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--reason <reason>", "why these jobs should remain separate")
    .action(async (jobIdA: string, jobIdB: string, options: { dataDir: string; reason?: string }) => {
      const record = await createDoNotMergeDecision(options.dataDir, {
        jobIdA,
        jobIdB,
        reason: options.reason,
      });
      console.log(`Created ${record.id}.`);
    });

  dedupe
    .command("list <jobId>")
    .description("List do-not-merge decisions involving a job")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (jobId: string, options: { dataDir: string }) => {
      const records = (await listDoNotMergeDecisions(options.dataDir)).filter(
        (record) => record.jobIdA === jobId || record.jobIdB === jobId,
      );
      if (records.length === 0) {
        console.log("No do-not-merge decisions found.");
        return;
      }
      for (const record of records) {
        const otherJobId = record.jobIdA === jobId ? record.jobIdB : record.jobIdA;
        console.log(`${record.id}\t${otherJobId}\t${record.reason ?? ""}`);
      }
    });
}
