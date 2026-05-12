import path from "node:path";
import { createHash } from "node:crypto";
import type { Command } from "commander";
import {
  JobRecordSchema,
  SourceRecordSchema,
  SourceListingRecordSchema,
  atomicWriteJson,
  createSourceListingRecord,
  createStoragePaths,
  normalizeCandidate,
  scoreCandidate,
  type Adapter,
  type SourceRecord,
} from "../../../../packages/core/src/index.js";

export function registerAddCommand(program: Command): void {
  program
    .command("add <url>")
    .description("Add a manually found job URL")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--title <title>", "job title")
    .option("--company <company>", "company name")
    .option("--reusable", "save the pasted source for future discovery")
    .action(
      async (
        url: string,
        options: { dataDir: string; title?: string; company?: string; reusable?: boolean },
      ) => {
        const classified = classifyJobUrl(url);
        const now = new Date().toISOString();
        const paths = createStoragePaths(options.dataDir);
        const source = createSourceRecord(classified, options.reusable ?? false);
        const normalized = normalizeCandidate({
          title: options.title ?? `Unknown ${classified.adapter} role`,
          company: options.company ?? "Unknown company",
          sourceId: source.id,
          sourceType: source.type,
          adapter: source.adapter,
          sourceUrl: url,
          workType: "unknown",
          fetchStatus: classified.adapter === "linkedin" ? "no_fetch" : "ok",
        });
        const listingId = `listing_${hash(source.id, normalized.normalizedUrl)}`;
        const job = JobRecordSchema.parse({
          schemaVersion: 1,
          id: `job_${hash(normalized.normalizedCompany, normalized.normalizedTitle, normalized.normalizedUrl)}`,
          title: normalized.title,
          company: normalized.company,
          discoveredAt: now,
          updatedAt: now,
          lifecycleStatus: "candidate",
          workType: normalized.normalizedWorkType,
          sourceListingIds: [listingId],
          score: scoreCandidate({
            title: normalized.title,
            company: normalized.company,
            workType: normalized.normalizedWorkType,
          }),
        });
        const listing = createSourceListingRecord(normalized, { id: listingId, jobId: job.id, now });

        await atomicWriteJson(path.join(paths.jobsDir, `${job.id}.json`), JobRecordSchema, job);
        await atomicWriteJson(
          path.join(paths.sourceListingsDir, `${listing.id}.json`),
          SourceListingRecordSchema,
          listing,
        );

        if (options.reusable) {
          await atomicWriteJson(
            path.join(paths.sourcesDir, `${source.id}.json`),
            SourceRecordSchema,
            source,
          );
        }

        console.log(`Added ${job.title} at ${job.company} from ${classified.adapter}.`);
      },
    );
}

function classifyJobUrl(url: string): { adapter: Adapter; type: SourceRecord["type"]; companySlug?: string } {
  const parsed = new URL(url);
  if (parsed.hostname.includes("linkedin.com")) return { adapter: "linkedin", type: "linkedin" };
  if (parsed.hostname.includes("ashbyhq.com")) return { adapter: "ashby", type: "ats", companySlug: parsed.pathname.split("/").filter(Boolean)[0] };
  if (parsed.hostname.includes("greenhouse.io")) return { adapter: "greenhouse", type: "ats", companySlug: parsed.pathname.split("/").filter(Boolean)[0] };
  if (parsed.hostname.includes("lever.co")) return { adapter: "lever", type: "ats", companySlug: parsed.pathname.split("/").filter(Boolean)[0] };
  return { adapter: "manual", type: "manual" };
}

function createSourceRecord(
  classified: { adapter: Adapter; type: SourceRecord["type"]; companySlug?: string },
  reusable: boolean,
): SourceRecord {
  return SourceRecordSchema.parse({
    schemaVersion: 1,
    id: `source_${classified.adapter}_${hash(classified.companySlug ?? "manual")}`,
    type: classified.type,
    adapter: classified.adapter,
    name: classified.companySlug ?? classified.adapter,
    reusable,
    enabled: true,
    ...(classified.companySlug ? { companySlug: classified.companySlug } : {}),
  });
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}
