import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  EventRecordSchema,
  ScoringRulesRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createDefaultConfig,
  createDefaultScoringRules,
  createStoragePaths,
  loadConfig,
  readEvents,
  readJsonFile,
  saveConfig,
} from "../index.js";
import { createProposal, decideProposal, getProposal } from "./proposalService.js";

describe("proposal service", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("creates pending proposals with targets, evidence, proposed changes, and scoring version metadata", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-proposals-"));
    const proposal = await createProposal(tempDir, {
      kind: "scoring",
      targets: [{ type: "scoring_rule", id: "tool.claude_code" }],
      summary: "Boost Claude Code",
      evidence: ["Two accepted jobs matched this signal"],
      proposedChange: { type: "scoring.weight", signalId: "tool.claude_code", delta: 2 },
      scoringVersionFrom: "rules-v1",
      createdAt: "2026-05-12T22:00:00.000Z",
    });

    expect(proposal).toMatchObject({
      status: "pending",
      targets: [{ type: "scoring_rule", id: "tool.claude_code" }],
      evidence: ["Two accepted jobs matched this signal"],
      scoringVersionFrom: "rules-v1",
    });
  });

  it("approval updates config, source, query, preference, or scoring-rules files and writes events", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-proposals-"));
    const paths = createStoragePaths(tempDir);
    await saveConfig(tempDir, createDefaultConfig());
    await atomicWriteJson(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema, {
      schemaVersion: 1,
      id: "source_1",
      type: "ats",
      adapter: "ashby",
      name: "Example Source",
      reusable: true,
      enabled: true,
    });
    await atomicWriteJson(paths.scoringRulesFile, ScoringRulesRecordSchema, createDefaultScoringRules("2026-05-12T21:00:00.000Z"));

    const query = await createProposal(tempDir, {
      kind: "query",
      targets: [{ type: "query", id: "AI Operator" }],
      summary: "Add AI Operator query",
      evidence: ["Accepted roles mention operator"],
      proposedChange: { type: "query.add", query: "AI Operator" },
      createdAt: "2026-05-12T22:00:00.000Z",
    });
    const preference = await createProposal(tempDir, {
      kind: "query",
      targets: [{ type: "preference", id: "workType" }],
      summary: "Prefer hybrid",
      evidence: ["Hybrid accepted"],
      proposedChange: { type: "preference.set", key: "workType", value: { value: ["hybrid"], mode: "soft_rank" } },
      createdAt: "2026-05-12T22:01:00.000Z",
    });
    const source = await createProposal(tempDir, {
      kind: "source",
      targets: [{ type: "source", id: "source_1" }],
      summary: "Disable weak source",
      evidence: ["Repeated no labels"],
      proposedChange: { type: "source.disable", sourceId: "source_1" },
      createdAt: "2026-05-12T22:02:00.000Z",
    });
    const scoring = await createProposal(tempDir, {
      kind: "scoring",
      targets: [{ type: "scoring_rule", id: "tool.claude_code" }],
      summary: "Boost Claude Code",
      evidence: ["Accepted roles mention Claude Code"],
      proposedChange: { type: "scoring.weight", signalId: "tool.claude_code", delta: 2 },
      createdAt: "2026-05-12T22:03:00.000Z",
      scoringVersionFrom: "rules-v1",
    });

    for (const proposal of [query, preference, source, scoring]) {
      await decideProposal(tempDir, proposal.id, "approved", "2026-05-12T22:10:00.000Z");
    }

    const config = await loadConfig(tempDir);
    expect(config.querySeeds).toContain("AI Operator");
    expect(config.preferences.workType).toEqual({ value: ["hybrid"], mode: "soft_rank" });
    await expect(readJsonFile(path.join(paths.sourcesDir, "source_1.json"), SourceRecordSchema)).resolves.toMatchObject({ enabled: false });
    await expect(readJsonFile(paths.scoringRulesFile, ScoringRulesRecordSchema)).resolves.toMatchObject({
      signalWeights: expect.objectContaining({ "tool.claude_code": 10 }),
    });
    const { events } = await readEvents(paths.eventsFile, EventRecordSchema);
    expect(events.filter((event) => event.type === "proposal.approved")).toHaveLength(4);
    expect(events.filter((event) => event.type === "proposal.applied")).toHaveLength(4);
  });

  it("keeps rejected and deferred proposals inspectable without applying proposed changes", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-proposals-"));
    await saveConfig(tempDir, createDefaultConfig());
    const rejected = await createProposal(tempDir, {
      kind: "query",
      targets: [{ type: "query", id: "Rejected Query" }],
      summary: "Rejected query",
      evidence: ["weak evidence"],
      proposedChange: { type: "query.add", query: "Rejected Query" },
      createdAt: "2026-05-12T22:00:00.000Z",
    });
    const deferred = await createProposal(tempDir, {
      kind: "query",
      targets: [{ type: "query", id: "Deferred Query" }],
      summary: "Deferred query",
      evidence: ["needs more review"],
      proposedChange: { type: "query.add", query: "Deferred Query" },
      createdAt: "2026-05-12T22:01:00.000Z",
    });

    await decideProposal(tempDir, rejected.id, "rejected", "2026-05-12T22:10:00.000Z");
    await decideProposal(tempDir, deferred.id, "deferred", "2026-05-12T22:11:00.000Z");

    await expect(getProposal(tempDir, rejected.id)).resolves.toMatchObject({ status: "rejected" });
    await expect(getProposal(tempDir, deferred.id)).resolves.toMatchObject({ status: "deferred" });
    const config = await loadConfig(tempDir);
    expect(config.querySeeds).not.toContain("Rejected Query");
    expect(config.querySeeds).not.toContain("Deferred Query");
  });
});
