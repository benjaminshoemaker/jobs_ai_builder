import { collectBoard } from '@ai-builder-jobs/core';
import { Client } from 'pg';
import { createHash, randomUUID } from 'node:crypto';

if (!process.argv.includes('--live')) throw new Error('Explicit --live is required (one employer request; daily database budget applies)');
if (process.env.VERCEL_ENV === 'production') throw new Error('This collector is restricted to preview/development');
// A maintained, single-source trial. Broad discovery and closure inference are separate work.
const source = 'ashby:trm-labs';
const run = randomUUID();
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
await client.connect();
try {
  await client.query('begin');
  await client.query("select pg_advisory_xact_lock(hashtext('jobs-board-request-budget'))");
  const { rows } = await client.query("select count(*)::int as n from board_collection_runs where started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'");
  if (rows[0].n >= 5) throw new Error('Daily trial budget of five employer requests exhausted');
  await client.query('insert into board_sources(id,canonical_url) values ($1,$2) on conflict(id) do nothing', [source, 'https://jobs.ashbyhq.com/trm-labs']);
  await client.query("insert into board_collection_runs(id,source_id,outcome) values ($1,$2,'running')", [run, source]);
  await client.query('commit');
  const checkedAt = new Date().toISOString();
  const jobs = await collectBoard(source, checkedAt);
  await client.query('begin');
  for (const job of jobs) {
    const id = new URL(job.url).pathname.split('/').filter(Boolean).at(-1)!;
    const record = { title: job.title, company: job.company, location: job.location, description: job.description, canonicalUrl: job.url, sourcePublishedAt: job.postedAt ?? null, sourcePublishedMeaning: 'last_published_or_reposted' };
    const hash = createHash('sha256').update(JSON.stringify(record)).digest('hex');
    await client.query('insert into board_source_postings(source_id,employer_posting_id,canonical_url) values ($1,$2,$3) on conflict(source_id,employer_posting_id) do update set canonical_url=excluded.canonical_url,last_seen_at=now()', [source, id, job.url]);
    await client.query('insert into board_posting_versions(source_id,employer_posting_id,content_hash,record) values ($1,$2,$3,$4) on conflict do nothing', [source, id, hash, record]);
  }
  await client.query('update board_sources set last_success_at=now() where id=$1', [source]);
  await client.query("update board_collection_runs set outcome='succeeded',finished_at=now(),posting_count=$2 where id=$1", [run, jobs.length]);
  await client.query('commit');
  console.log(JSON.stringify({ run, source, employerRequests: 1, staged: jobs.length, published: 0 }));
} catch (error) {
  await client.query('rollback');
  // Do not persist raw HTTP errors, request headers, or environment data.
  await client.query("update board_collection_runs set outcome='failed',finished_at=now(),failure='Collection failed; source availability unknown' where id=$1", [run]);
  throw new Error('Collection failed; no postings were closed. Check configuration and the source before retrying.');
} finally { await client.end(); }
