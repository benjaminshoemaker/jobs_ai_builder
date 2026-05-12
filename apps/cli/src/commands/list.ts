import type { Command } from "commander";

import type { LifecycleStatus } from "../../../../packages/core/src/index.js";
import { formatJobRow, loadLocalData, selectJobsForList } from "./localData.js";

export function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List stored jobs")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--status <status>", "candidate, active, maybe, rejected, or archived")
    .option("--rejected", "show rejected jobs")
    .option("--archived", "show archived jobs")
    .option("--sort <sort>", "score, updated, posted, or discovered", "score")
    .action(async (options: ListOptions) => {
      const data = await loadLocalData(options.dataDir);
      const jobs = selectJobsForList(data.jobs, {
        status: options.status ? parseLifecycleStatus(options.status) : undefined,
        includeRejected: options.rejected,
        includeArchived: options.archived,
        sort: parseSort(options.sort),
      });

      if (jobs.length === 0) {
        console.log("No jobs found.");
        return;
      }

      for (const job of jobs) {
        console.log(formatJobRow(job));
      }
    });
}

type ListOptions = {
  dataDir: string;
  status?: string;
  rejected?: boolean;
  archived?: boolean;
  sort: string;
};

function parseLifecycleStatus(status: string): LifecycleStatus {
  if (!["candidate", "active", "maybe", "rejected", "archived"].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  return status as LifecycleStatus;
}

function parseSort(sort: string): "score" | "updated" | "posted" | "discovered" {
  if (!["score", "updated", "posted", "discovered"].includes(sort)) {
    throw new Error(`Invalid sort: ${sort}`);
  }
  return sort as "score" | "updated" | "posted" | "discovered";
}
