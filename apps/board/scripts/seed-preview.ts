import { Client } from 'pg';
import { readCatalog } from '../src/catalog.js';
import { resolve } from 'node:path';
if (!process.argv.includes('--apply')) throw new Error('Pass --apply to seed sample inventory');
if (process.env.VERCEL_ENV === 'production') throw new Error('Sample seed is preview/development only');
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
const jobs = await readCatalog(resolve(import.meta.dirname, '../catalog/jobs.json'));
if (jobs.some(job => job.status !== 'sample')) throw new Error('Seed only accepts explicitly labeled samples');
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query('begin');
  for (const job of jobs) await client.query('insert into board_jobs(id,record) values ($1,$2) on conflict(id) do nothing', [job.id, job]);
  await client.query('commit');
  console.log(`Seeded up to ${jobs.length} sample records; existing records preserved`);
} catch (error) { await client.query('rollback'); throw error; }
finally { await client.end(); }
