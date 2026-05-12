import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram } from "../cli.js";

describe("discover command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("runs jobs discover --interactive=false with mocked sources and temp data", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-discover-"));
    const mockFile = path.join(tempDir, "mock-source.json");
    await writeFile(
      mockFile,
      JSON.stringify([
        {
          title: "AI Builder",
          company: "Example Co",
          sourceUrl: "https://example.com/jobs/ai-builder",
          location: "Remote",
          workType: "remote",
        },
      ]),
      "utf8",
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--interactive=false",
      "--data-dir",
      tempDir,
      "--mock-source-file",
      mockFile,
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("Selected 1 candidate"));
  });
});
