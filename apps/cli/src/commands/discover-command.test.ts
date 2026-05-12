import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createProgram } from "../cli.js";
import { createStoragePaths, readApiUsage } from "../../../../packages/core/src/index.js";

describe("discover command", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.JOOBLE_API_KEY;
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
      "--skip-description-fetch",
    ]);

    expect(log).toHaveBeenCalledWith(expect.stringContaining("Selected 1 candidate"));
  });

  it("does not call live APIs unless --live or --mock-source-file is provided", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-discover-"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--interactive=false",
      "--data-dir",
      tempDir,
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("Use --live");
  });

  it("plans live Jooble discovery without spending budget during dry run", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-discover-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--live",
      "--dry-run",
      "--interactive=false",
      "--data-dir",
      tempDir,
      "--max-api-requests",
      "2",
      "--api-budget",
      "500",
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join("\n")).toContain("would make 2 API request");
    await expect(readApiUsage(tempDir, "jooble", "2026-05-12T22:00:00.000Z", 500)).resolves.toMatchObject({
      requestsUsed: 0,
    });
  });

  it("loads .env.local-compatible files, uses one live Jooble request by default, and reserves budget", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-cli-discover-"));
    const envFile = path.join(tempDir, ".env.local");
    await writeFile(envFile, "JOOBLE_API_KEY=test-key\n", "utf8");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (String(url).includes("https://jooble.org/api/test-key")) {
        return {
          ok: true,
          json: async () => ({
            jobs: [
              {
                title: "AI Builder",
                company: "Example AI",
                link: "https://example.com/jobs/ai-builder",
                location: "Remote",
                salary: "$160K-$180K",
                updated: "2026-05-12",
                id: "jooble_1",
                snippet: "Snippet fallback.",
              },
            ],
          }),
        } as Response;
      }

      return {
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => `
          <html><body><main>
            <p>Build customer-facing workflows with Claude Code and orchestrate agents.</p>
          </main></body></html>
        `,
      } as Response;
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await createProgram().parseAsync([
      "node",
      "jobs",
      "discover",
      "--live",
      "--interactive=false",
      "--data-dir",
      tempDir,
      "--env-file",
      envFile,
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("https://jooble.org/api/test-key");
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain("https://example.com/jobs/ai-builder");
    expect(log.mock.calls.flat().join("\n")).toContain("Selected 1 candidate");
    expect(log.mock.calls.flat().join("\n")).toContain("Full descriptions fetched: 1/1");
    await expect(readApiUsage(tempDir, "jooble", "2026-05-12T22:00:00.000Z", 500)).resolves.toMatchObject({
      requestsUsed: 1,
    });
    await expect(readJsonFileSafe(path.join(createStoragePaths(tempDir).jobsDir))).resolves.toBeGreaterThan(0);
  });
});

async function readJsonFileSafe(dir: string): Promise<number> {
  const { readdir } = await import("node:fs/promises");
  return (await readdir(dir)).length;
}
