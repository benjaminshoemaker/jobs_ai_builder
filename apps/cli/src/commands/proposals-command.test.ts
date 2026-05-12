import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createDefaultConfig,
  createProposal,
  getProposal,
  loadConfig,
  saveConfig,
} from "../../../../packages/core/src/index.js";
import { createProgram } from "../cli.js";

describe("proposals command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("covers list, show, approve, reject, and defer", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-proposals-command-"));
    await saveConfig(tempDir, createDefaultConfig());
    const approved = await seedProposal(tempDir, "Add AI Operator", "AI Operator", "2026-05-12T22:00:00.000Z");
    const rejected = await seedProposal(tempDir, "Reject AI Wrangler", "AI Wrangler", "2026-05-12T22:01:00.000Z");
    const deferred = await seedProposal(tempDir, "Defer AI PM", "AI PM", "2026-05-12T22:02:00.000Z");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync(["node", "jobs", "proposals", "list", "--data-dir", tempDir]);
    expect(output(log)).toContain(approved.id);
    expect(output(log)).toContain("pending");

    log.mockClear();
    await createProgram().parseAsync(["node", "jobs", "proposals", "show", approved.id, "--data-dir", tempDir]);
    expect(output(log)).toContain("Evidence: accepted examples");
    expect(output(log)).toContain("Proposed change:");

    await createProgram().parseAsync(["node", "jobs", "proposals", "approve", approved.id, "--data-dir", tempDir]);
    await createProgram().parseAsync(["node", "jobs", "proposals", "reject", rejected.id, "--data-dir", tempDir]);
    await createProgram().parseAsync(["node", "jobs", "proposals", "defer", deferred.id, "--data-dir", tempDir]);

    await expect(getProposal(tempDir, approved.id)).resolves.toMatchObject({ status: "approved" });
    await expect(getProposal(tempDir, rejected.id)).resolves.toMatchObject({ status: "rejected" });
    await expect(getProposal(tempDir, deferred.id)).resolves.toMatchObject({ status: "deferred" });
    await expect(loadConfig(tempDir)).resolves.toMatchObject({
      querySeeds: expect.arrayContaining(["AI Operator"]),
    });
  });
});

async function seedProposal(dataDir: string, summary: string, query: string, createdAt: string) {
  return createProposal(dataDir, {
    kind: "query",
    targets: [{ type: "query", id: query }],
    summary,
    evidence: ["accepted examples"],
    proposedChange: { type: "query.add", query },
    createdAt,
  });
}

function output(log: ReturnType<typeof vi.spyOn>): string {
  return log.mock.calls.flat().join("\n");
}
