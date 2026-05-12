import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram } from "../cli.js";

describe("add command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("detects known ATS URLs, accepts missing metadata via flags, and persists a candidate", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-add-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "add",
      "https://job-boards.greenhouse.io/shopmy/jobs/5153099008",
      "--data-dir",
      tempDir,
      "--title",
      "Senior Product Builder",
      "--company",
      "ShopMy",
    ]);

    await expect(readdir(path.join(tempDir, "jobs"))).resolves.toHaveLength(1);
    await expect(readdir(path.join(tempDir, "source-listings"))).resolves.toHaveLength(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("greenhouse"));
  });

  it("creates source-listing records and can mark a pasted source as reusable", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-add-"));

    await createProgram().parseAsync([
      "node",
      "jobs",
      "add",
      "https://jobs.ashbyhq.com/TigerData/dbfd8ad3-fe92-4e1e-a133-263544ec42f2",
      "--data-dir",
      tempDir,
      "--title",
      "Builder in Residence",
      "--company",
      "Tiger Data",
      "--reusable",
    ]);

    await expect(readdir(path.join(tempDir, "sources"))).resolves.toHaveLength(1);
  });

  it("handles LinkedIn as no-fetch and never calls authenticated scraping", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-add-"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await createProgram().parseAsync([
      "node",
      "jobs",
      "add",
      "https://www.linkedin.com/jobs/view/4412317108/",
      "--data-dir",
      tempDir,
      "--title",
      "Product Builder",
      "--company",
      "Knotch",
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
