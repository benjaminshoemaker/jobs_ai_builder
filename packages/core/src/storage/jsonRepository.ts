import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type { z } from "zod";

export type AtomicJsonFileSystem = {
  mkdir: typeof mkdir;
  readFile: typeof readFile;
  rename: typeof rename;
  writeFile: typeof writeFile;
};

const defaultFileSystem: AtomicJsonFileSystem = {
  mkdir,
  readFile,
  rename,
  writeFile,
};

export async function atomicWriteJson<T>(
  filePath: string,
  schema: z.ZodType<T>,
  value: unknown,
  fileSystem: AtomicJsonFileSystem = defaultFileSystem,
): Promise<T> {
  const parsed = schema.parse(value);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await fileSystem.mkdir(path.dirname(filePath), { recursive: true });
  await fileSystem.writeFile(tmpPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  await fileSystem.rename(tmpPath, filePath);

  return parsed;
}

export async function readJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
  fileSystem: Pick<AtomicJsonFileSystem, "readFile"> = defaultFileSystem,
): Promise<T> {
  const raw = await fileSystem.readFile(filePath, "utf8");
  return schema.parse(JSON.parse(raw));
}
