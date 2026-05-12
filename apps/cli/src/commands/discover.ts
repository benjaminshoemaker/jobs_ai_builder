import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import {
  createDefaultConfig,
  createReviewQueue,
  createStoragePaths,
  discoverJobs,
  loadConfig,
  readJsonFile,
  SourceListingRecordSchema,
  type SourceAdapter,
  type SourceCandidate,
  type SourceListingRecord,
  type SourceRecord,
} from "../../../../packages/core/src/index.js";
import { runReviewFlow } from "../review/reviewPrompts.js";

export function registerDiscoverCommand(program: Command): void {
  program
    .command("discover")
    .description("Fetch, rank, and review candidate jobs")
    .option("--interactive <value>", "run prompt-based review", "true")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--mock-source-file <path>", "read source candidates from a JSON fixture")
    .action(async (options: { interactive: string; dataDir: string; mockSourceFile?: string }) => {
      const config = await loadConfig(options.dataDir).catch(() => createDefaultConfig());
      const { sources, registry } = await createMockRegistry(options.mockSourceFile);
      const result = await discoverJobs({
        dataDir: options.dataDir,
        config,
        sources,
        registry,
        now: new Date().toISOString(),
        interactive: false,
        allowPartialSources: true,
      });

      console.log(`Selected ${result.selected.length} candidate(s). Status: ${result.status}.`);
      if (options.interactive !== "false" && result.selected.length > 0) {
        const sourceListings = await readSourceListings(options.dataDir, result.selected.flatMap((job) => job.sourceListingIds));
        await runReviewFlow({
          items: createReviewQueue(result.selected, sourceListings, sources, { limit: result.selected.length }),
        });
      }
    });
}

async function readSourceListings(dataDir: string, ids: string[]): Promise<SourceListingRecord[]> {
  const paths = createStoragePaths(dataDir);
  return Promise.all(
    ids.map((id) =>
      readJsonFile(path.join(paths.sourceListingsDir, `${id}.json`), SourceListingRecordSchema),
    ),
  );
}

async function createMockRegistry(mockSourceFile?: string) {
  const source: SourceRecord = {
    schemaVersion: 1,
    id: "source_mock",
    type: "manual",
    adapter: "manual",
    name: "Mock Source",
    reusable: true,
    enabled: true,
  };
  const candidates = mockSourceFile
    ? (JSON.parse(await readFile(mockSourceFile, "utf8")) as Array<{
        title: string;
        company: string;
        sourceUrl: string;
        location?: string;
        workType?: "remote" | "hybrid" | "onsite" | "unknown";
      }>)
    : [];
  const adapter: SourceAdapter = {
    id: "manual",
    async fetchCandidates(ctx) {
      return candidates.map(
        (candidate): SourceCandidate => ({
          source: ctx.source,
          sourceUrl: candidate.sourceUrl,
          metadata: {
            title: candidate.title,
            company: candidate.company,
            location: candidate.location,
            workType: candidate.workType,
          },
        }),
      );
    },
    async testSource() {
      return { ok: true, message: "ok" };
    },
  };

  return {
    sources: [source],
    registry: {
      enabledSources() {
        return [{ source, adapter }];
      },
    },
  };
}
