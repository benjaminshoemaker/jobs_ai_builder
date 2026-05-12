import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

export type EventLogReadResult<T> = {
  events: T[];
  warnings: string[];
};

export async function appendEvent<T>(
  logPath: string,
  schema: z.ZodType<T>,
  event: unknown,
): Promise<T> {
  const parsed = schema.parse(event);
  await mkdir(path.dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(parsed)}\n`, "utf8");
  return parsed;
}

export async function readEvents<T>(
  logPath: string,
  schema: z.ZodType<T>,
): Promise<EventLogReadResult<T>> {
  let raw: string;
  try {
    raw = await readFile(logPath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { events: [], warnings: [] };
    }
    throw error;
  }

  const warnings: string[] = [];
  const lines = raw.split("\n");
  const hasTrailingPartialLine = !raw.endsWith("\n");

  if (!hasTrailingPartialLine) {
    lines.pop();
  } else {
    lines.pop();
    warnings.push("Ignored trailing partial JSONL line in events log.");
  }

  const events: T[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      continue;
    }

    try {
      events.push(schema.parse(JSON.parse(line)));
    } catch (error) {
      throw new Error(`Invalid JSONL event at line ${index + 1}`, { cause: error });
    }
  }

  return { events, warnings };
}
