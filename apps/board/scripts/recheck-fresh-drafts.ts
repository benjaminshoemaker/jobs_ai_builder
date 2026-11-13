import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {JobSchema} from '../src/catalog.js';
import {observeEmployerRole,changedFields,type SourceResponse} from '../src/listing-maintenance.js';
import {applyObservation} from '../src/maintenance-store.js';
import {tx} from '../src/pipeline.js';
if(!process.argv.includes('--live')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview --live required');
const db=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await db.connect();let locked=false;const runId=randomUUID(),cache=new Map<string,Promise<SourceResponse>>();let requests=0;
try{
 locked=(await db.query("select pg_try_advisory_lock(hashtext('board-preview-pipeline')) locked")).rows[0].locked;if(!locked)throw new Error('Pipeline is busy');
 const rows=(await db.query(`select j.record,c.snapshot from board_candidate_drafts b join board_jobs j on j.id=b.job_id join board_publication_provenance p on p.job_id=j.id join board_review_checks c on c.id=p.check_id where j.record->>'status'='draft' order by j.id`)).rows;if(rows.length!==9)throw new Error('Expected exactly the nine fresh hidden drafts; inspect inventory before widening scope');
 await db.query("insert into board_maintenance_runs(id,status,max_requests,summary) values($1,'running',20,$2)",[runId,{origin:'fresh_draft_reconciliation'}]);
 const get=async(endpoint:string)=>{if(!cache.has(endpoint))cache.set(endpoint,(async()=>{
  await tx(db,async()=>{await db.query("select pg_advisory_xact_lock(hashtext('board-source-budget'))");const used=Number((await db.query("select count(*) n from board_maintenance_requests where attempted_at>now()-interval '1 day'")).rows[0].n);if(used>=80||requests>=20)throw new Error('Employer request allowance exhausted');await db.query('insert into board_maintenance_requests(run_id,sequence,endpoint) values($1,$2,$3)',[runId,++requests,endpoint]);});
  const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),redirect:'manual',headers:{Accept:'application/json,text/html'}});const text=await response.text();let data:unknown=null;try{data=JSON.parse(text)}catch{}return {status:response.status,text,data};})());return cache.get(endpoint)!;};
 const checks=[];
 for(const row of rows){const job=JobSchema.parse(row.record),observation=await observeEmployerRole(job.url,job.title,get);const outcome=await tx(db,()=>applyObservation(db,{runId,job,baseline:row.snapshot,observation,now:Date.now()}));checks.push({id:job.id,company:job.company,title:job.title,url:job.url,outcome,note:observation.note,changedFields:observation.kind==='open'?changedFields(row.snapshot,observation.snapshot):[],previous:row.snapshot,current:observation.kind==='open'?observation.snapshot:null});}
 const report={checkedAt:new Date().toISOString(),runId,requests,published:0,checks};await db.query("update board_maintenance_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[runId,{origin:'fresh_draft_reconciliation',requests,processed:checks.length,published:0}]);await writeFile('../../research/fresh-drafts-rechecked-2026-10-29.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runId,requests,checks:checks.map(({id,company,outcome,changedFields})=>({id,company,outcome,changedFields}))},null,2));
}catch(error){await db.query("update board_maintenance_runs set status='failed',finished_at=now(),summary=$2 where id=$1 and status='running'",[runId,{origin:'fresh_draft_reconciliation',requests}]);throw error;}finally{if(locked)await db.query("select pg_advisory_unlock(hashtext('board-preview-pipeline'))");await db.end()}
