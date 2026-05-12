import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ApiBudgetExceededError,
  readApiUsage,
  remainingApiRequests,
  reserveApiRequests,
} from "./apiBudget.js";

describe("API request budget", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("reserves requests against a persisted local provider budget", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-api-budget-"));

    const usage = await reserveApiRequests({
      dataDir: tempDir,
      provider: "jooble",
      requestCount: 2,
      requestLimit: 5,
      now: "2026-05-12T22:00:00.000Z",
      reason: "discover",
    });

    expect(usage.requestsUsed).toBe(2);
    expect(remainingApiRequests(usage)).toBe(3);
    await expect(readApiUsage(tempDir, "jooble", "2026-05-12T23:00:00.000Z", 5)).resolves.toMatchObject({
      requestsUsed: 2,
      requestEvents: [expect.objectContaining({ count: 2, reason: "discover" })],
    });
  });

  it("blocks reservations that exceed the local cap", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-api-budget-"));

    await reserveApiRequests({
      dataDir: tempDir,
      provider: "jooble",
      requestCount: 4,
      requestLimit: 5,
      now: "2026-05-12T22:00:00.000Z",
      reason: "discover",
    });

    await expect(
      reserveApiRequests({
        dataDir: tempDir,
        provider: "jooble",
        requestCount: 2,
        requestLimit: 5,
        now: "2026-05-12T22:05:00.000Z",
        reason: "discover",
      }),
    ).rejects.toBeInstanceOf(ApiBudgetExceededError);
  });
});
