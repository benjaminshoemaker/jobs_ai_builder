import type { Command } from "commander";

import { formatJobRow, loadLocalData, sourceListingsForJob, sourceName, type LocalData } from "./localData.js";
import type { JobRecord } from "../../../../packages/core/src/index.js";

export function registerSearchCommand(program: Command): void {
  program
    .command("search <query>")
    .description("Search local job metadata")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (query: string, options: { dataDir: string }) => {
      const data = await loadLocalData(options.dataDir);
      const matches = data.jobs.filter((job) => matchesQuery(data, job, query));

      if (matches.length === 0) {
        console.log("No jobs found.");
        return;
      }

      for (const job of matches.sort((left, right) => right.score.total - left.score.total)) {
        console.log(formatJobRow(job));
      }
    });
}

function matchesQuery(data: LocalData, job: JobRecord, query: string): boolean {
  const normalizedQuery = normalize(query);
  const sourceListings = sourceListingsForJob(data, job);
  const haystack = [
    job.id,
    job.title,
    job.company,
    job.location,
    job.workType,
    job.compensation?.raw,
    job.postedDate,
    job.industry,
    job.experienceLevel,
    ...(job.notes ?? []),
    ...job.score.positiveSignals.map((signal) => signal.label),
    ...job.score.negativeSignals.map((signal) => signal.label),
    ...sourceListings.map((listing) => listing.sourceUrl),
    ...sourceListings.map((listing) => sourceName(data, listing)),
  ]
    .filter(Boolean)
    .join(" ");

  return normalize(haystack).includes(normalizedQuery);
}

function normalize(value: string): string {
  return value.toLowerCase();
}
