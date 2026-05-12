import { readFile } from "node:fs/promises";
import type { Command } from "commander";
import {
  createDefaultConfig,
  discoverJobs,
  loadConfig,
  type SourceAdapter,
  type SourceCandidate,
  type SourceRecord,
} from "../../../../packages/core/src/index.js";

export function registerDiscoverCommand(program: Command): void {
  program
    .command("discover")
    .description("Fetch, rank, and review candidate jobs")
    .option("--interactive <value>", "run prompt-based review", "true")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--mock-source-file <path>", "read source candidates from a JSON fixture")
    .action(async (options: { interactive: string; dataDir: string; mockSourceFile?: string }) => {
      if (options.interactive !== "false") {
        console.log("discover interactive review is not implemented yet.");
        return;
      }

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
    });
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
