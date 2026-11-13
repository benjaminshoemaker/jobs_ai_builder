import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { JobSchema } from '../src/catalog.js';
import { applyObservation } from '../src/maintenance-store.js';

if(!process.argv.includes('--rollback-test')||process.env.VERCEL_ENV==='production')throw new Error('Explicit preview rollback test required');
if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('DATABASE_URL_UNPOOLED required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
try{
  await client.query('begin');
  const {rows}=await client.query(`select j.record,c.snapshot,p.reference_id from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_checks c on c.id=p.check_id join board_review_roles r on r.id=p.reference_id where r.decision='approved' and j.record->>'status'='published' order by j.id limit 1 for update of j,r,p`);
  assert.equal(rows.length,1,'A published, approved fixture is required');
  const row=rows[0],job=JobSchema.parse(row.record),runId=randomUUID(),now=Date.now();
  await client.query("insert into board_maintenance_runs(id,status,max_requests) values($1,'running',40)",[runId]);
  const apply=(record:typeof job,observation:Parameters<typeof applyObservation>[1]['observation'])=>applyObservation(client,{runId,job:record,baseline:row.snapshot,observation,now});
  assert.equal(await apply(job,{kind:'open',snapshot:row.snapshot,note:'Rollback verification'}),'refreshed');
  const refreshed=JobSchema.parse({...job,checkedAt:new Date(now).toISOString()});
  const stored=async()=>JobSchema.parse((await client.query('select record from board_jobs where id=$1',[job.id])).rows[0].record);
  assert.deepEqual(await stored(),refreshed);
  assert.equal(await apply(refreshed,{kind:'unknown',note:'Simulated timeout'}),'retry');
  assert.deepEqual(await stored(),refreshed);
  const changed={...row.snapshot,descriptionHtml:row.snapshot.descriptionHtml+'<p>New software engineering requirement.</p>'};
  assert.equal(await apply(refreshed,{kind:'open',snapshot:changed,note:'Simulated change'}),'needs_review');
  const held=await stored();assert.equal(held.status,'draft');assert.equal(held.descriptionHtml,job.descriptionHtml);
  assert.equal(await apply(held,{kind:'missing',note:'Simulated unconfirmed absence'}),'closure_pending');
  assert.deepEqual(await stored(),held);
  assert.equal(await apply(refreshed,{kind:'open',snapshot:row.snapshot,note:'Stale worker'}),'superseded');
  assert.equal(await apply(held,{kind:'closed',note:'Simulated confirmed withdrawal'}),'closed');
  assert.equal((await stored()).status,'closed');
  assert.equal(await apply(await stored(),{kind:'open',snapshot:row.snapshot,note:'Must not resurrect'}),'superseded');
  await client.query("update board_jobs set record=$2 where id=$1",[job.id,job]);
  await client.query("update board_review_roles set decision='rejected' where id=$1",[row.reference_id]);
  assert.equal(await apply(job,{kind:'open',snapshot:row.snapshot,note:'Rejected role must not refresh'}),'superseded');
  assert.equal((await client.query('select count(*)::int as n from board_maintenance_checks where run_id=$1',[runId])).rows[0].n,8);
  await client.query('rollback');
  assert.equal((await client.query('select count(*)::int as n from board_maintenance_runs where id=$1',[runId])).rows[0].n,0);
  console.log('Verified refresh, failure, changed-text hold, missing-source hold, closure, stale-worker and rejected-role guards; all fixture changes rolled back.');
}finally{await client.query('rollback');await client.end();}
