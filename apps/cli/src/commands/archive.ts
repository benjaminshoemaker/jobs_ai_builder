import path from "node:path";
import { createHash } from "node:crypto";
import type { Command } from "commander";

import {
  EventRecordSchema,
  JobRecordSchema,
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../../../../packages/core/src/index.js";

export function registerArchiveCommand(program: Command): void {
  program
    .command("archive <id>")
    .description("Archive a saved job")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--reason <reason>", "archive reason")
    .action(async (id: string, options: { dataDir: string; reason?: string }) => {
      const now = new Date().toISOString();
      const paths = createStoragePaths(options.dataDir);
      const jobFile = path.join(paths.jobsDir, `${id}.json`);
      const previous = await readJsonFile(jobFile, JobRecordSchema);
      const archived = JobRecordSchema.parse({
        ...previous,
        lifecycleStatus: "archived",
        updatedAt: now,
        archivedAt: now,
        ...(options.reason ? { archiveReason: options.reason } : {}),
      });

      await atomicWriteJson(jobFile, JobRecordSchema, archived);
      await appendEvent(paths.eventsFile, EventRecordSchema, {
        schemaVersion: 1,
        id: `event_${hash("job.archived", id, now)}`,
        timestamp: now,
        actor: "user",
        type: "job.archived",
        jobId: id,
        payload: {
          previousLifecycleStatus: previous.lifecycleStatus,
          reason: options.reason,
        },
      });

      console.log(`Archived ${archived.title} at ${archived.company}.`);
    });
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}
