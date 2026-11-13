import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../cli.js";

describe("prototype command", () => {
  let dir: string;
  beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), "jobs-prototype-")); });
  afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });
  const run = (args: string[]) => createProgram().parseAsync(["node", "jobs", "prototype", ...args, "--data-dir", dir]);
  it("requires opt-in, enforces the request cap before network, and dry runs without writes", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(run(["scan", "--board", "ashby:example"])).rejects.toThrow("--live");
    await expect(run(["scan", "--live", "--board", "ashby:one", "--board", "ashby:two", "--max-requests", "1"])).rejects.toThrow("exceeds");
    await run(["scan", "--live", "--board", "ashby:one", "--dry-run"]);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(readFile(path.join(dir, "prototype", "latest.json"))).rejects.toThrow();
  });
  it("saves safe offline cards, preserves corrections across scans and applies them to show", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const file = path.join(dir, "input.json");
    await writeFile(file, JSON.stringify([{ title: "AI PM", company: "Example", url: "https://example.com/role", location: "United States", description: "Own discovery and prioritize customer problems.\nBuild tools using Claude Code.\nQualifications: 5 years in product.\nUNIQUE_FULL_DESCRIPTION_END" }]));
    await run(["scan", "--input", file]);
    await run(["review", "https://example.com/role", "--fit", "engineering_blend", "--focus", "product,software_engineering", "--reason", "Engineering route, genuine product ownership."]);
    await run(["show"]);
    expect(log.mock.calls.flat().join("\n")).toContain("Fit: engineering_blend (user judgment)");
    expect(log.mock.calls.flat().join("\n")).toContain("Focus: product, software_engineering");
    await run(["scan", "--input", file]);
    const report = JSON.parse(await readFile(path.join(dir, "prototype", "latest.json"), "utf8"));
    expect(report.cards[0].review.fit).toBe("engineering_blend");
    expect(report.cards[0].review.focus).toEqual(["product", "software_engineering"]);
    expect(report.cards[0].availability).toBe("unverified");
    expect(report.cards[0]).not.toHaveProperty("description");
    expect(JSON.stringify(report)).not.toContain("UNIQUE_FULL_DESCRIPTION_END");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("caps model requests, persists validated evidence, and leaves remaining candidates unclear", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-secret");
    const description = "Own discovery and prioritize customer problems. Build software and agents using Claude Code. Five years of product management experience required. More information remains on the employer posting.";
    const file = path.join(dir, "input.json");
    await writeFile(file, JSON.stringify([1, 2].map(n => ({ title: "Product Builder", company: "Example", url: `https://example.com/${n}`, location: "United States", description }))));
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({
      fit: "product_builder", focus: ["product"], engineering: "explicit_non_swe_route", qualifications: "Five years PM.", product: "Owns discovery.", operations: "None.", building: "Builds agents.", ai: "Claude Code.", reason: "Owns decisions and implementation.",
      evidence: ["Own discovery and prioritize customer problems.", "Build software and agents using Claude Code."],
    }) }] }] }) } as Response);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await run(["scan", "--input", file, "--ai", "--model", "test-model", "--max-requests", "1"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const raw = await readFile(path.join(dir, "prototype", "latest.json"), "utf8");
    const report = JSON.parse(raw);
    expect(report.cards.map((c: { assessment: { fit: string } }) => c.assessment.fit)).toEqual(["product_builder", "unclear"]);
    expect(report.cards[0].method).toBe("openai:test-model:prompt-v1");
    expect(raw).not.toContain("test-secret");
    expect(raw).not.toContain("More information remains");
  });
  it("records provider failures as unknown rather than closed and reserves failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 503 } as Response);
    vi.spyOn(console, "log").mockImplementation(() => {});
    await run(["scan", "--live", "--board", "ashby:example", "--max-requests", "1"]);
    const report = JSON.parse(await readFile(path.join(dir, "prototype", "latest.json"), "utf8"));
    expect(report.requests).toBe(1);
    expect(report.errors[0]).toContain("unknown");
    const ledger = JSON.parse(await readFile(path.join(dir, "api-usage", "prototype.json"), "utf8"));
    expect(ledger.requestsUsed).toBe(1);
    await expect(run(["scan", "--live", "--board", "ashby:example", "--api-budget", "1"])).rejects.toThrow("API budget exceeded");
  });
});
