import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import type { SourceAdapter, SourceCandidate } from "../sources/index.js";
import { discoverJobs } from "./index.js";

describe("discovery service", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("retrieves up to 50 candidates by default and selects the top 10 after scoring", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-discovery-"));
    const result = await discoverJobs({
      dataDir: tempDir,
      config: createDefaultConfig(),
      sources: [source("a"), source("b")],
      registry: registry([
        adapter("manual", Array.from({ length: 30 }, (_, index) => candidate(`A ${index}`, "AI Builder"))),
        adapter("linkedin", Array.from({ length: 30 }, (_, index) => candidate(`B ${index}`, "Prompt Writer"))),
      ]),
      now: "2026-05-12T20:00:00.000Z",
      interactive: false,
    });

    expect(result.fetched).toBe(50);
    expect(result.selected).toHaveLength(10);
    expect(result.selected.every((job) => job.title.includes("AI Builder"))).toBe(true);
  });

  it("avoids reviewed, rejected, and archived matches unless include flags are set", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-discovery-"));
    const config = createDefaultConfig();
    await discoverJobs({
      dataDir: tempDir,
      config,
      sources: [source("a")],
      registry: registry([adapter("manual", [candidate("1", "AI Builder")])]),
      now: "2026-05-12T20:00:00.000Z",
      interactive: false,
    });

    const second = await discoverJobs({
      dataDir: tempDir,
      config,
      sources: [source("a")],
      registry: registry([adapter("manual", [candidate("1", "AI Builder")])]),
      now: "2026-05-12T21:00:00.000Z",
      interactive: false,
    });

    expect(second.status).toBe("no_new_candidates");
    expect(second.selected).toHaveLength(0);
  });

  it("records no-new-candidate session metrics and exits successfully", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-discovery-"));
    const result = await discoverJobs({
      dataDir: tempDir,
      config: createDefaultConfig(),
      sources: [source("a")],
      registry: registry([adapter("manual", [])]),
      now: "2026-05-12T20:00:00.000Z",
      interactive: false,
    });

    expect(result.status).toBe("no_new_candidates");
    expect(result.session.metrics).toMatchObject({
      fetched: 0,
      uniqueAfterDedupe: 0,
      reviewed: 0,
    });
  });
});

function source(id: string) {
  return {
    schemaVersion: 1 as const,
    id,
    type: id === "b" ? ("linkedin" as const) : ("manual" as const),
    adapter: id === "b" ? ("linkedin" as const) : ("manual" as const),
    name: id,
    reusable: true,
    enabled: true,
  };
}

function adapter(id: "manual" | "linkedin", candidates: SourceCandidate[]): SourceAdapter {
  return {
    id,
    async fetchCandidates(ctx) {
      return candidates.map((item) => ({ ...item, source: ctx.source }));
    },
    async testSource() {
      return { ok: true, message: "ok" };
    },
  };
}

function registry(adapters: SourceAdapter[]) {
  return {
    enabledSources(sources: ReturnType<typeof source>[]) {
      return sources.map((sourceRecord) => ({
        source: sourceRecord,
        adapter: adapters.find((item) => item.id === sourceRecord.adapter) ?? adapters[0]!,
      }));
    },
  };
}

function candidate(id: string, title: string): SourceCandidate {
  return {
    source: source("a"),
    sourceUrl: `https://example.com/jobs/${id}`,
    externalId: id,
    metadata: {
      title: `${title} ${id}`,
      company: "Example Co",
      location: "Remote",
      workType: "remote",
    },
    transientDescription: title === "AI Builder" ? "Use Claude Code to ship products." : "Write content.",
  };
}
