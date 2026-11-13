import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';
import { resolve } from 'node:path';
import { CatalogSchema, readCatalog, visibleJobs, type Job } from './catalog.js';

let pool: Pool | undefined;
export function database() {
  if (!process.env.DATABASE_URL) throw new Error('Board database is not configured');
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
    if (process.env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}

export async function flaggedJobs(visitor: string): Promise<string[]> {
  const { rows } = await database().query('select job_id from board_feedback where visitor_id = $1 and active = true and reason = $2', [visitor, 'not_builder']);
  return rows.map(row => row.job_id as string);
}

export async function saveFeedback(visitor: string, job: string, active: boolean, reason: string) {
  await database().query('select save_board_feedback($1, $2, $3, $4)', [visitor, job, active, reason]);
}

export async function loadJobs(): Promise<Job[]> {
  if (!process.env.VERCEL && !process.env.DATABASE_URL) {
    return visibleJobs(await readCatalog(resolve(process.cwd(), 'catalog/jobs.json')));
  }
  const { rows } = await database().query('select record from board_jobs');
  return visibleJobs(CatalogSchema.parse(rows.map(row => row.record)));
}
