import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export async function createTestDataDir(prefix = "jobs-ai-builder-e2e-"): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

export async function removeTestDataDir(dataDir: string | undefined): Promise<void> {
  if (dataDir) {
    await rm(dataDir, { recursive: true, force: true });
  }
}
