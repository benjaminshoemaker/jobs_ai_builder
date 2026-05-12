import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram } from "../cli.js";

describe("sources command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("adds reusable ATS sources and one-off manual sources for unknown URLs", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-sources-"));

    for (const url of [
      "https://jobs.ashbyhq.com/TigerData",
      "https://job-boards.greenhouse.io/shopmy",
      "https://jobs.lever.co/example",
      "https://example.com/careers",
    ]) {
      await createProgram().parseAsync(["node", "jobs", "sources", "add", url, "--data-dir", tempDir]);
    }

    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await createProgram().parseAsync(["node", "jobs", "sources", "list", "--data-dir", tempDir]);

    expect(log.mock.calls.flat().join("\n")).toContain("ashby");
    expect(log.mock.calls.flat().join("\n")).toContain("greenhouse");
    expect(log.mock.calls.flat().join("\n")).toContain("lever");
    expect(log.mock.calls.flat().join("\n")).toContain("manual");
  });

  it("tests a source and reports adapter status", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-sources-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "sources",
      "add",
      "https://example.com/careers",
      "--data-dir",
      tempDir,
    ]);
    await createProgram().parseAsync([
      "node",
      "jobs",
      "sources",
      "test",
      "source_manual_60411b72df4b",
      "--data-dir",
      tempDir,
    ]);

    expect(log.mock.calls.flat().join("\n")).toContain("Manual source is available");
  });
});
