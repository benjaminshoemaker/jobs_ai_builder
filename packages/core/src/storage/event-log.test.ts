import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { EventRecordSchema } from "../schemas/index.js";
import { appendEvent, readEvents } from "./index.js";

const event = {
  schemaVersion: 1,
  id: "event_1",
  timestamp: "2026-05-12T20:00:00.000Z",
  actor: "system",
  type: "job.discovered",
  jobId: "job_1",
  payload: { source: "fixture" },
} as const;

describe("event log", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("appends one complete JSON object per line", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-events-"));
    const logPath = path.join(tempDir, "events.jsonl");

    await appendEvent(logPath, EventRecordSchema, event);
    await appendEvent(logPath, EventRecordSchema, { ...event, id: "event_2" });

    const text = await readFile(logPath, "utf8");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("reads complete lines and ignores only a trailing partial line with a warning", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-events-"));
    const logPath = path.join(tempDir, "events.jsonl");
    await writeFile(
      logPath,
      `${JSON.stringify(event)}\n{"schemaVersion":1,"id":`,
      "utf8",
    );

    const result = await readEvents(logPath, EventRecordSchema);

    expect(result.events).toHaveLength(1);
    expect(result.warnings).toEqual([
      "Ignored trailing partial JSONL line in events log.",
    ]);
  });

  it("throws on invalid non-final lines", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-events-"));
    const logPath = path.join(tempDir, "events.jsonl");
    await writeFile(logPath, `{bad json}\n${JSON.stringify(event)}\n`, "utf8");

    await expect(readEvents(logPath, EventRecordSchema)).rejects.toThrow(
      "Invalid JSONL event at line 1",
    );
  });
});
