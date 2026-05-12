import type { Command } from "commander";

import { findJob, loadLocalData, sourceListingsForJob, sourceName } from "./localData.js";

export function registerShowCommand(program: Command): void {
  program
    .command("show <id>")
    .description("Show one saved job")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (id: string, options: { dataDir: string }) => {
      const data = await loadLocalData(options.dataDir);
      const job = findJob(data, id);
      if (!job) {
        console.log(`Job ${id} not found.`);
        return;
      }

      const sourceListings = sourceListingsForJob(data, job);
      const events = data.events.filter((event) => event.jobId === job.id);
      const proposals = data.proposals.filter((proposal) =>
        proposal.targets.some((target) => target.type === "job" && target.id === job.id),
      );
      const doNotMerge = data.doNotMergeRecords.filter(
        (record) => record.jobIdA === job.id || record.jobIdB === job.id,
      );
      const signals = [...job.score.positiveSignals, ...job.score.negativeSignals];

      console.log(`${job.title} @ ${job.company}`);
      console.log(`ID: ${job.id}`);
      console.log(`Status: ${job.lifecycleStatus}`);
      console.log(`Review label: ${job.currentReviewLabel ?? "unreviewed"}`);
      console.log(`Location: ${job.location ?? "Unknown"} | Work type: ${job.workType}`);
      console.log(`Compensation: ${job.compensation?.raw ?? "Unknown"}`);
      console.log(`Score: ${job.score.total}/100`);
      console.log(`Reason: ${job.score.surfacedReason}`);
      console.log(`Signals: ${signals.map((signal) => signal.label).join("; ") || "None"}`);
      console.log(`Notes: ${(job.notes ?? []).join("; ") || "None"}`);
      console.log("Source listings:");
      for (const listing of sourceListings) {
        console.log(`- ${sourceName(data, listing)} ${listing.fetchStatus} ${listing.sourceUrl}`);
      }
      console.log("Review history:");
      for (const event of events.filter((item) => item.type === "job.reviewed")) {
        console.log(`- ${event.timestamp} ${String(event.payload.reviewLabel)} -> ${String(event.payload.lifecycleStatus)}`);
      }
      console.log("Events:");
      for (const event of events) {
        console.log(`- ${event.timestamp} ${event.type}`);
      }
      console.log("Linked proposals:");
      for (const proposal of proposals) {
        console.log(`- ${proposal.id} ${proposal.status}: ${proposal.summary}`);
      }
      console.log("Do-not-merge decisions:");
      for (const record of doNotMerge) {
        const otherJobId = record.jobIdA === job.id ? record.jobIdB : record.jobIdA;
        console.log(`- ${record.id} with ${otherJobId}${record.reason ? `: ${record.reason}` : ""}`);
      }
    });
}
