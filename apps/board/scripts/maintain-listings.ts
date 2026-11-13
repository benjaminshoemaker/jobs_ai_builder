import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { JobSchema } from '../src/catalog.js';
import { observeEmployerRole, type SourceResponse } from '../src/listing-maintenance.js';
import { applyObservation } from '../src/maintenance-store.js';

if(!process.argv.includes('--live'))throw new Error('Explicit --live is required; maintenance is never scheduled by this command');
if(process.env.VERCEL_ENV==='production')throw new Error('Preview/development only');
if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('DATABASE_URL_UNPOOLED required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
const runId=randomUUID(),maxRequests=40,cache=new Map<string,Promise<SourceResponse>>();let requests=0,locked=false;
const get=async(endpoint:string)=>{
  if(!cache.has(endpoint))cache.set(endpoint,(async()=>{
    if(requests>=maxRequests)throw new Error('Request budget exhausted');
    // Reserve even failed attempts before issuing the HTTP request.
    await client.query('insert into board_maintenance_requests(run_id,sequence,endpoint) values($1,$2,$3)',[runId,++requests,endpoint]);
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(15000),redirect:'manual',headers:{Accept:'application/json,text/html'}});
    const text=await response.text();let data:unknown=null;try{data=JSON.parse(text);}catch{/* Public HTML is expected for some employers. */}
    return {status:response.status,text,data};
  })());
  return cache.get(endpoint)!;
};
try {
  locked=(await client.query("select pg_try_advisory_lock(hashtext('board-listing-maintenance')) as locked")).rows[0].locked;
  if(!locked)throw new Error('Another maintenance run is active');
  const prior=await client.query("select count(*)::int as n from board_maintenance_runs where started_at>now()-interval '24 hours' and summary->>'origin' is distinct from 'candidate_staging'");
  if(prior.rows[0].n>=2)throw new Error('Maximum two manual maintenance runs per 24 hours');
  // Holding the session lock proves older running entries no longer have an active worker.
  await client.query("update board_maintenance_runs set status='interrupted',finished_at=now() where status='running'");
  await client.query("insert into board_maintenance_runs(id,status,max_requests) values($1,'running',$2)",[runId,maxRequests]);
  const {rows}=await client.query(`select j.record,c.snapshot from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_roles r on r.id=p.reference_id join board_review_checks c on c.id=p.check_id left join board_maintenance_state s on s.job_id=j.id where r.decision='approved' and (j.record->>'status'='published' or (j.record->>'status'='draft' and s.disposition in ('needs_review','retry','closure_pending'))) and (s.next_check_at is null or s.next_check_at<=now()) order by coalesce(s.next_check_at,(j.record->>'checkedAt')::timestamptz),j.id`);
  const outcomes:Record<string,number>={};let processed=0;
  for(const row of rows){
    if(requests>=maxRequests)break;
    const job=JobSchema.parse(row.record);
    const observation=await observeEmployerRole(job.url,job.title,get);
    await client.query('begin');
    try{
      const outcome=await applyObservation(client,{runId,job,baseline:row.snapshot,observation,now:Date.now()});
      await client.query('commit');outcomes[outcome]=(outcomes[outcome]??0)+1;processed++;
    }catch(error){await client.query('rollback');throw error;}
  }
  const summary={due:rows.length,processed,deferred:rows.length-processed,requests,outcomes,scheduled:false};
  await client.query("update board_maintenance_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[runId,summary]);
  console.log(JSON.stringify({runId,...summary},null,2));
}catch(error){await client.query("update board_maintenance_runs set status='failed',finished_at=now(),summary=$2 where id=$1 and status='running'",[runId,{reason:'Maintenance stopped; inspect retained per-job checks before retrying',requests}]);throw error;}
finally{if(locked)await client.query("select pg_advisory_unlock(hashtext('board-listing-maintenance'))");await client.end();}
