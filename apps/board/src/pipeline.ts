import type {Client,PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import {SourceSchema,sourceEndpoint,parseDiscoveryFeed,publicApiRobots,selectDailyDiscoverySources} from './broad-discovery.js';
import {assessmentSample} from './assessment-sample.js';
import {digest} from './review-history.js';
import {preparedAssessment,inferBuilder,reviewAssessment,type FitDecision} from './pipeline-assessor.js';
import {pipelineRequestReservation,canReserve,operatingBudgetKey,operatingBudgetNanodollars,operatingMonthUsageSql,usageCost} from './assessment-budget.js';
import {builderPromptVersionV12} from './builder-prompt.js';
import {stageCandidate,holdCandidateDraft} from './pipeline-drafts.js';
import {JobSchema} from './catalog.js';
import {observeEmployerRole,type SourceResponse} from './listing-maintenance.js';
import {applyObservation} from './maintenance-store.js';
type DB=Pick<Client|PoolClient,'query'>;
export type Phase='collect'|'assess'|'stage'|'maintain'|'resume';
export type PipelineDeps={get?:(url:string)=>Promise<SourceResponse>;fixtureInfer?:(request:ReturnType<typeof preparedAssessment>['request'])=>Promise<FitDecision>;model?:string;apiKey?:string;now?:()=>number};
export async function tx<T>(db:DB,fn:()=>Promise<T>){await db.query('begin');try{const result=await fn();await db.query('commit');return result;}catch(e){await db.query('rollback');throw e;}}
const json=(v:unknown)=>JSON.stringify(v);
async function enqueue(db:DB,kind:string,key:string,payload:unknown){await db.query('insert into board_pipeline_jobs(id,kind,payload) values($1,$2,$3) on conflict do nothing',[digest(key),kind,json(payload)]);}
export async function enqueuePipeline(db:DB,phase:Phase,limit=5,now=Date.now(),model?:string){
  if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error('Pipeline batch must be 1–20');
  const cycle=new Date(now).toISOString().slice(0,10);
  if(phase==='collect'){
    const all=(await db.query("select * from board_discovery_sources where provider in ('ashby','greenhouse','lever')")).rows;
    const existing=new Set((await db.query("select id from board_pipeline_jobs where kind='collect'")).rows.map(r=>r.id));
    const rows=selectDailyDiscoverySources(all.filter(s=>!existing.has(digest(`collect:${s.id}:${cycle}`))),limit,'pipeline-'+cycle);
    for(const s of rows)await enqueue(db,'collect',`collect:${s.id}:${cycle}`,{source:s});
  }
  if(phase==='assess'){
    if(model!=='gpt-6-luna')throw new Error('Existing live allowance supports configured Luna only; no model or spending limit is changed');
    const eligible=(await db.query(`select d.*,s.provider,v.snapshot from board_discovery_candidates d join board_discovery_sources s on s.id=d.source_id join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash where d.location_hint<>'non_us_indicated' and d.last_seen_at>now()-interval '1 day' and not exists(select 1 from board_candidate_reviews r where r.candidate_id=d.id and r.source_hash=d.current_hash) and not exists(select 1 from board_review_roles h where h.identity_key=d.identity_key or h.canonical_url=d.canonical_url) and not exists(select 1 from board_candidate_assessments a where a.candidate_id=d.id and a.source_hash=d.current_hash and a.classifier_version=$2 and a.model=$1) and not exists(select 1 from board_pipeline_jobs j where j.kind='assess' and j.state='blocked' and j.payload->>'candidateId'=d.id and j.payload->>'sourceHash'=d.current_hash) order by d.score desc,d.id`,[model,builderPromptVersionV12])).rows;
    const rows=assessmentSample(eligible as (typeof eligible[number]&{id:string;source_id:string;score:number;provider:string})[],limit);
    for(const r of rows){const p=preparedAssessment(model,r);await enqueue(db,'assess',`assess:${r.id}:${r.current_hash}:${p.promptHash}:${digest(p.body)}`,{candidateId:r.id,sourceHash:r.current_hash,promptHash:p.promptHash,requestHash:digest(p.body),model});}
  }
  if(phase==='stage'){
    const rows=(await db.query(`select d.id,r.id as review_id,d.current_hash from board_discovery_candidates d join lateral(select * from board_candidate_reviews where candidate_id=d.id and source_hash=d.current_hash order by created_at desc,id desc limit 1)r on r.decision='yes' left join board_candidate_drafts b on b.candidate_id=d.id where b.review_id is distinct from r.id or b.source_hash is distinct from d.current_hash order by d.id limit $1`,[limit])).rows;
    for(const r of rows)await enqueue(db,'stage',`stage:${r.id}:${r.review_id}:${r.current_hash}`,{candidateId:r.id,reviewId:r.review_id,sourceHash:r.current_hash});
  }
  if(phase==='maintain'){
    const rows=(await db.query(`select j.id,p.source_content_hash from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_roles r on r.id=p.reference_id left join board_maintenance_state s on s.job_id=j.id where r.decision='approved' and j.record->>'status' in ('published','draft') and (s.next_check_at is null or s.next_check_at<=now()) order by s.next_check_at nulls first,j.id limit $1`,[limit])).rows;
    for(const r of rows)await enqueue(db,'maintain',`maintain:${r.id}:${r.source_content_hash}:${cycle}`,{jobId:r.id});
  }
}
export async function sourceGet(db:DB,runId:string,kind:'collect'|'maintain',url:string,deps:PipelineDeps):Promise<SourceResponse>{
  const table=kind==='collect'?'board_discovery_requests':'board_maintenance_requests';
  await tx(db,async()=>{
    await db.query("select pg_advisory_xact_lock(hashtext('board-source-budget'))");
    const used=Number((await db.query(`select count(*)::int as n from ${table} where attempted_at>now()-interval '1 day'`)).rows[0].n);
    if(used>=(kind==='collect'?500:80))throw new Error('Employer request allowance exhausted');
    const n=Number((await db.query(`select count(*)::int as n from ${table} where run_id=$1`,[runId])).rows[0].n);
    if(n>=(kind==='collect'?40:40))throw new Error('Run request allowance exhausted');
    await db.query(`insert into ${table}(run_id,sequence,endpoint) values($1,$2,$3)`,[runId,n+1,url]);
  });
  if(deps.get)return deps.get(url);
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'manual',headers:{Accept:'application/json,text/plain,text/html','User-Agent':'JobsAIBuilderDiscovery/0.1'}});
  const text=await response.text();let data:unknown=null;try{data=JSON.parse(text);}catch{/* HTML adapters are allowed. */}
  return {status:response.status,text,data};
}
async function collect(db:DB,source:any,get:(url:string)=>Promise<SourceResponse>){
  SourceSchema.parse(source);
  const endpoint=sourceEndpoint(source),robots=await get(new URL('/robots.txt',endpoint).href),policy=publicApiRobots(endpoint,robots.status,robots.text);
  if(!policy.allowed)throw new Error('Employer API robots policy unavailable or restrictive');
  if(policy.delay>20000)throw new Error('Employer delay exceeds this bounded invocation');
  await new Promise(resolve=>setTimeout(resolve,policy.delay));
  const response=await get(endpoint);if(response.status!==200)throw new Error('Employer feed unavailable');
  const parsed=parseDiscoveryFeed(response.data,source);
  const known=new Set((await db.query("select identity_key from board_review_roles where provenance->>'origin' is distinct from 'candidate_review'")).rows.map(r=>r.identity_key));
  const records=parsed.records.filter(r=>r.retain&&!known.has(r.identity)).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  let retained=0,bytes=0;
  await tx(db,async()=>{
    for(const r of records){
      const prior=(await db.query('select current_hash from board_discovery_candidates where id=$1 for update',[r.id])).rows[0];
      await db.query(`insert into board_discovery_candidates(id,identity_key,source_id,employer_posting_id,canonical_url,title,location,score,signals,location_hint,current_hash,last_run_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict(identity_key) do update set title=excluded.title,location=excluded.location,score=excluded.score,signals=excluded.signals,location_hint=excluded.location_hint,current_hash=excluded.current_hash,last_seen_at=now(),last_run_id=excluded.last_run_id`,[r.id,r.identity,source.id,r.employerId,r.url,r.title,r.location,r.score,json(r.signals),r.locationHint,r.hash,source.runId]);
      const size=Buffer.byteLength(json(r.snapshot));
      if(retained<25&&bytes+size<=2*1024*1024){await db.query('insert into board_discovery_versions(candidate_id,content_hash,snapshot) values($1,$2,$3) on conflict do nothing',[r.id,r.hash,r.snapshot]);retained++;bytes+=size;}
      if(prior&&prior.current_hash!==r.hash)await holdCandidateDraft(db,r.id,'changed');
    }
    await db.query('update board_discovery_sources set last_checked_at=now() where id=$1',[source.id]);
  });
  return {postings:parsed.total,candidates:records.length,fullTextRetained:retained,deferredFullText:records.length-retained};
}
async function assess(db:DB,job:any,deps:PipelineDeps){
  const p=job.payload,row=(await db.query('select d.*,v.snapshot from board_discovery_candidates d join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash where d.id=$1',[p.candidateId])).rows[0];
  if(!row||row.current_hash!==p.sourceHash)return {obsolete:true};
  if((await db.query('select 1 from board_candidate_reviews where candidate_id=$1 and source_hash=$2',[row.id,row.current_hash])).rows.length)return {obsolete:true};
  const prepared=preparedAssessment(p.model,row);if(prepared.promptHash!==p.promptHash||digest(prepared.body)!==p.requestHash)throw new Error('Frozen classifier request changed');
  const calibrationId=digest(prepared.calibration.instructions);
  await db.query('insert into board_calibration_versions(id,manifest,prompt_context) values($1,$2,$3) on conflict do nothing',[calibrationId,{policy:prepared.version,examples:prepared.calibration.exampleIds},prepared.calibration.instructions]);
  let decision:FitDecision,usage:any=null;
  if(deps.fixtureInfer){decision=await deps.fixtureInfer(prepared.request);}
  else{
    if(!deps.apiKey||deps.model!==p.model)throw new Error('Configured model credential required');
    const requestId=randomUUID(),reservation=pipelineRequestReservation(prepared.body);
    await tx(db,async()=>{
      await db.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");
      const used=Number((await db.query(operatingMonthUsageSql)).rows[0].n);
      const allowance=(await db.query('select model,cap_nanodollars from board_model_allowances where id=$1',[operatingBudgetKey])).rows[0];
      if(!allowance||allowance.model!==p.model||!canReserve(used,reservation,Math.min(Number(allowance.cap_nanodollars),operatingBudgetNanodollars)))throw new Error('Authorized $10 monthly Luna board allowance unavailable or exhausted; no call sent');
      const daily=Number((await db.query("select count(*)::int as n from board_assessment_requests a join board_model_budget_reservations b on b.discovery_request_id=a.id where b.budget_key in ('luna-v11-preview-5usd','luna-monthly-10usd') and a.requested_at>now()-interval '1 day'")).rows[0].n);if(daily>=20)throw new Error('Daily model request allowance exhausted');
      await db.query("insert into board_assessment_requests(id,candidate_id,source_hash,model,calibration_version,status) values($1,$2,$3,$4,$5,'started')",[requestId,row.id,row.current_hash,p.model,calibrationId]);
      await db.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,discovery_request_id) values($1,$2,$3,$1)',[requestId,operatingBudgetKey,reservation]);
      await db.query('update board_pipeline_jobs set request_id=$2 where id=$1',[job.id,requestId]);
    });
    const response=await inferBuilder(prepared.request,deps.apiKey);decision=response.decision;usage=response.usage;
    if(usage)await db.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where discovery_request_id=$1',[requestId,json(usage),usageCost(usage)]);
    await db.query("update board_assessment_requests set status='succeeded',finished_at=now() where id=$1",[requestId]);
  }
  return tx(db,async()=>{
    const current=(await db.query('select current_hash from board_discovery_candidates where id=$1 for update',[row.id])).rows[0];
    const reviewed=(await db.query('select 1 from board_candidate_reviews where candidate_id=$1 and source_hash=$2',[row.id,p.sourceHash])).rows.length;
    if(current?.current_hash!==p.sourceHash||reviewed)return {obsolete:true};
    const result=reviewAssessment(row.snapshot.descriptionHtml,decision);
    await db.query('insert into board_candidate_assessments(id,candidate_id,source_hash,classifier_version,calibration_version,model,result) values($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),row.id,p.sourceHash,prepared.version,calibrationId,deps.fixtureInfer?'fixture:'+p.model:p.model,result]);
    return {fit:result.fit,fixture:!!deps.fixtureInfer};
  });
}
export async function runPipeline(db:DB,options:{phase:Phase;actor:string;limit?:number;enqueue?:boolean},deps:PipelineDeps={}){
  const limit=options.limit??3;if(!Number.isInteger(limit)||limit<1||limit>5)throw new Error('Invocation processes 1–5 durable jobs');
  const locked=(await db.query("select pg_try_advisory_lock(hashtext('board-preview-pipeline')) as locked")).rows[0].locked;
  if(!locked)return {busy:true,processed:0};
  const id=randomUUID();let processed=0;
  try{
    await db.query(`update board_pipeline_jobs set state=case when kind='assess' then 'blocked' else 'retry' end,failure=case when kind='assess' then 'Interrupted model attempt requires reconciliation; no automatic resend' else 'Interrupted step; safe bounded retry' end,lease_until=null where state='running'`);
    await db.query("update board_pipeline_runs set status='interrupted',finished_at=now() where status='running'");
    await db.query("insert into board_pipeline_runs(id,actor_id,phase,status) values($1,$2,$3,'running')",[id,options.actor,options.phase]);
    if(options.phase!=='resume'&&options.enqueue!==false)await enqueuePipeline(db,options.phase,5,(deps.now??Date.now)(),deps.model);
    for(let n=0;n<limit;n++){
      const job=await tx(db,async()=>{const row=(await db.query(`select * from board_pipeline_jobs where state in ('pending','retry') and attempts<3 and next_attempt_at<=now() ${options.phase==='resume'?'':'and kind=$1'} order by updated_at,id for update skip locked limit 1`,options.phase==='resume'?[]:[options.phase])).rows[0];if(row)await db.query("update board_pipeline_jobs set state='running',attempts=attempts+1,run_id=$2,lease_until=now()+interval '2 minutes',updated_at=now() where id=$1",[row.id,id]);return row;});
      if(!job)break;processed++;
      try{
        let result:any;
        if(job.kind==='collect')await db.query("insert into board_discovery_runs(id,status,max_requests) values($1,'running',40) on conflict do nothing",[id]);
        if(job.kind==='maintain')await db.query("insert into board_maintenance_runs(id,status,max_requests,summary) values($1,'running',40,'{\"origin\":\"pipeline\"}') on conflict do nothing",[id]);
        if(job.kind==='collect')result=await collect(db,{...job.payload.source,runId:id},url=>sourceGet(db,id,'collect',url,deps));
        if(job.kind==='assess')result=await assess(db,job,deps);
        if(job.kind==='stage')result=await tx(db,async()=>{
          const latest=(await db.query('select current_hash from board_discovery_candidates where id=$1',[job.payload.candidateId])).rows[0];
          const review=(await db.query('select id from board_candidate_reviews where candidate_id=$1 and source_hash=$2 order by created_at desc,id desc limit 1',[job.payload.candidateId,job.payload.sourceHash])).rows[0];
          if(latest?.current_hash!==job.payload.sourceHash||review?.id!==job.payload.reviewId)return {obsolete:true};
          return stageCandidate(db,job.payload.candidateId,(deps.now??Date.now)());
        });
        if(job.kind==='maintain'){
          const row=(await db.query('select j.record,c.snapshot from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_checks c on c.id=p.check_id join board_review_roles r on r.id=p.reference_id where j.id=$1 and r.decision=\'approved\'',[job.payload.jobId])).rows[0];
          if(!row)result={obsolete:true};else{const record=JobSchema.parse(row.record),observation=await observeEmployerRole(record.url,record.title,url=>sourceGet(db,id,'maintain',url,deps));result={outcome:await tx(db,()=>applyObservation(db as Client,{runId:id,job:record,baseline:row.snapshot,observation,now:(deps.now??Date.now)()}))};}
        }
        const retryMaintenance=['retry','closure_pending'].includes(result?.outcome)&&job.attempts+1<3;
        await db.query("update board_pipeline_jobs set state=$2,result=$3,failure=null,lease_until=null,next_attempt_at=case when $4 then now()+interval '2 hours' else next_attempt_at end,updated_at=now() where id=$1",[job.id,result?.obsolete?'obsolete':retryMaintenance?'retry':result?.outcome==='retry'||result?.outcome==='closure_pending'?'blocked':'succeeded',result,retryMaintenance]);
      }catch{
        const retry=job.kind==='collect'&&job.attempts+1<3;
        if(job.kind==='assess')await db.query("update board_assessment_requests set status='failed',finished_at=now() where id=(select request_id from board_pipeline_jobs where id=$1) and status='started'",[job.id]);
        await db.query("update board_pipeline_jobs set state=$2,failure=$3,lease_until=null,next_attempt_at=now()+interval '5 minutes',updated_at=now() where id=$1",[job.id,retry?'retry':'blocked',job.kind==='assess'?'Assessment stopped: check model allowance, source and retained request before any retry':'Step failed; inspect source, freshness or approval. No partial publication applied.']);
      }
    }
    const states=(await db.query('select state,count(*)::int as n from board_pipeline_jobs where run_id=$1 group by state',[id])).rows;
    const summary={processed,states:Object.fromEntries(states.map(r=>[r.state,r.n])),scheduled:false,published:0,fixture:!!deps.fixtureInfer};
    await db.query("update board_pipeline_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[id,summary]);
    await db.query("update board_discovery_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[id,summary]);
    await db.query("update board_maintenance_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[id,{...summary,origin:'pipeline'}]);
    return {runId:id,...summary};
  }catch(e){await db.query("update board_pipeline_runs set status='failed',finished_at=now(),summary='{\"failure\":\"Pipeline stopped; durable jobs retained\"}' where id=$1",[id]);throw e;}
  finally{await db.query("select pg_advisory_unlock(hashtext('board-preview-pipeline'))");}
}
