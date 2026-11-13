import { put, get } from '@vercel/blob';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { backupConnection, backupPath } from './backup-config.mjs';

const run = promisify(execFile);
const target = process.argv[2];
if (target !== 'preview' && target !== 'production') throw new Error('Usage: backup.mjs preview|production');
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is required');
if (process.env.BOARD_BACKUP_ENV !== target) throw new Error('BOARD_BACKUP_ENV must match the backup target');

const connection = backupConnection(process.env.DATABASE_URL_UNPOOLED);
const environment = { ...process.env, ...connection };
const folder = await mkdtemp(join(tmpdir(), 'board-backup-'));
const dump = join(folder, 'board.dump');
const downloaded = join(folder, 'downloaded.dump');
async function pgTool(tool, args) {
  if (process.env.PG_TOOLS_IMAGE) {
    const variables = Object.keys(connection).flatMap(key => ['--env', key]);
    const containerArgs = args.map(arg => arg.replaceAll(folder, '/backup'));
    return run('docker', ['run', '--rm', ...variables, '--mount', `type=bind,src=${folder},dst=/backup`, process.env.PG_TOOLS_IMAGE, tool, ...containerArgs], { env: environment, maxBuffer: 4 * 1024 * 1024 });
  }
  const binary = process.env[tool === 'pg_dump' ? 'PG_DUMP_BIN' : tool === 'pg_restore' ? 'PG_RESTORE_BIN' : 'PG_PSQL_BIN'] || tool;
  return run(binary, args, { env: environment, maxBuffer: 4 * 1024 * 1024 });
}
async function restoreDrill(archive) {
  const database = `board_restore_check_${Date.now()}`;
  await pgTool('psql', ['--set', 'ON_ERROR_STOP=1', '--command', `CREATE DATABASE "${database}"`]);
  try {
    await pgTool('pg_restore', ['--clean', '--if-exists', '--no-owner', '--no-acl', '--exit-on-error', '--dbname', database, archive]);
    const { stdout } = await pgTool('psql', ['--set', 'ON_ERROR_STOP=1', '--tuples-only', '--no-align', '--dbname', database, '--command', 'select (select count(*) from board_jobs), (select count(*) from board_discovery_candidates), (select count(*) from board_candidate_reviews), (select count(*) from board_migrations)']);
    const counts = stdout.trim().split('|').map(Number);
    if (counts.length !== 4 || counts.some(count => !Number.isSafeInteger(count)) || counts[3] < 21) throw new Error('Restored database counts are invalid');
    return { jobs: counts[0], candidates: counts[1], reviews: counts[2], migrations: counts[3] };
  } finally {
    await pgTool('psql', ['--set', 'ON_ERROR_STOP=1', '--command', `DROP DATABASE "${database}" WITH (FORCE)`]);
  }
}
try {
  await pgTool('pg_dump', ['--format=custom', '--schema=public', '--no-owner', '--no-acl', `--file=${dump}`]);
  await pgTool('pg_restore', ['--list', dump]);
  const bytes = await readFile(dump);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const pathname = backupPath(target, new Date());
  const uploaded = await put(pathname, new Blob([bytes]), { access: 'private', contentType: 'application/octet-stream', ttlDays: 30 });
  const result = await get(uploaded.url, { access: 'private' });
  if (!result || result.statusCode !== 200) throw new Error('Uploaded backup could not be downloaded');
  const copy = Buffer.from(await new Response(result.stream).arrayBuffer());
  await writeFile(downloaded, copy, { mode: 0o600 });
  await pgTool('pg_restore', ['--list', downloaded]);
  if (createHash('sha256').update(copy).digest('hex') !== checksum) throw new Error('Uploaded backup checksum mismatch');
  const drill = process.env.BOARD_FORCE_RESTORE_CHECK === 'true' || new Date().getUTCDate() === 1 ? await restoreDrill(downloaded) : null;
  console.log(JSON.stringify({ status: 'verified', environment: target, pathname, bytes: bytes.length, sha256: checksum, retentionDays: 30, restoreDrill: drill }));
} finally {
  await rm(folder, { recursive: true, force: true });
}
