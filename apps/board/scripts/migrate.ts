import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.argv.includes('--apply')) throw new Error('Pass --apply to apply migrations to the configured database');
const productionPrepare=process.argv.includes('--production-prepare');
if (process.env.VERCEL_ENV === 'production') {
  const expectedProject=process.argv.find(value=>value.startsWith('--expected-project-id='))?.slice('--expected-project-id='.length);
  if (!productionPrepare||!expectedProject||expectedProject!==process.env.NEON_PROJECT_ID) throw new Error('Production schema preparation requires an explicit matching Neon project ID');
  if (process.env.BOARD_PUBLIC_LAUNCH_ENABLED==='true'||process.env.BOARD_DAILY_RUNS_ENABLED==='true') throw new Error('Prepare the Production schema before public launch or daily schedules');
} else if (productionPrepare) throw new Error('--production-prepare requires VERCEL_ENV=production');
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtext('jobs-board-migrations'))");
  await client.query('create table if not exists board_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())');
  const folder = resolve(import.meta.dirname, '../migrations');
  for (const name of (await readdir(folder)).filter(name => name.endsWith('.sql')).sort()) {
    const sql = await readFile(resolve(folder, name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const prior = await client.query('select checksum from board_migrations where name=$1', [name]);
    if (prior.rows.length) {
      if (prior.rows[0].checksum !== checksum) throw new Error(`Previously applied migration changed: ${name}`);
      console.log(`Already applied: ${name}`); continue;
    }
    await client.query(sql);
    await client.query('insert into board_migrations(name,checksum) values ($1,$2)', [name, checksum]);
    console.log(`Applied: ${name}`);
  }
  await client.query('commit');
} catch (error) { await client.query('rollback'); throw error; }
finally { await client.end(); }
