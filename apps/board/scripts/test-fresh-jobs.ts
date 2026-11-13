import {Client} from 'pg';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assessWithAI,boardEligibility} from '@ai-builder-jobs/core';
import {calibrationSnapshot} from '../src/review-calibration.js';
import {assessmentSample} from '../src/assessment-sample.js';
import {boundedModelFetch,boundedRequestBody} from '../src/bounded-model-fetch.js';
import {budgetKey,budgetNanodollars,requestReservation} from '../src/assessment-budget.js';
const live=process.argv.includes('--live');
if(!live&&!process.argv.includes('--prepare'))throw new Error('Choose --prepare or --live');
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Configured preview database required');
if(live&&(!process.env.OPENAI_API_KEY||process.env.BOARD_CLASSIFIER_MODEL!=='gpt-6-luna'))throw new Error('Configured Luna credential required');
const run='fresh-unseen-2026-10-29-v6',classifier='builder-feedback-v6';
const artifact=resolve(import.meta.dirname,'../../../research/'+run+'.json');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();let locked=false;
try{
  locked=(await c.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;if(!locked)throw new Error('Another model worker is active');
  let report:any=null;try{report=JSON.parse(await readFile(artifact,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const corpus=await calibrationSnapshot(c);
  const options={apiKey:process.env.OPENAI_API_KEY??'preflight-only',model:'gpt-6-luna',referenceContext:corpus.context,eligibilityInstructions:boardEligibility,evidenceMode:'passage_ids' as const};
  const candidate=(row:any)=>({title:row.title,company:row.source_id,url:row.canonical_url,location:row.location,description:row.snapshot.descriptionHtml,availability:'employer_feed' as const,checkedAt:new Date(row.last_seen_at).toISOString()});
  const estimate=async(row:any)=>{
    let body:string|null=null;const stop=new Error('preflight-only');
    try{await assessWithAI(candidate(row),{...options,fetchImpl:async(_url:RequestInfo|URL,init?:RequestInit)=>{body=boundedRequestBody(init!.body as string);throw stop;}});}catch(error){if(error!==stop)throw error;}
    if(!body)throw new Error('No bounded request captured');
    return {reservation:requestReservation(body),requestHash:hash(body)};
  };
  if(!report){
    const rows=(await c.query(`select c.*,s.provider,v.snapshot from board_discovery_candidates c join board_discovery_sources s on s.id=c.source_id join board_discovery_versions v on v.candidate_id=c.id and v.content_hash=c.current_hash where c.location_hint<>'non_us_indicated' and not coalesce((c.signals->>'evergreenHint')::boolean,false) and not exists(select 1 from board_assessment_requests a where a.candidate_id=c.id) and not exists(select 1 from board_candidate_reviews r where r.candidate_id=c.id) and not exists(select 1 from board_review_roles h where h.identity_key=c.identity_key or h.canonical_url=c.canonical_url) order by c.score desc,c.id`)).rows;
    const pool=assessmentSample(rows as (typeof rows[number]&{id:string;source_id:string;score:number;provider:string})[],40);
    const spent=Number((await c.query('select coalesce(sum(reserved_nanodollars),0)::text as used from board_model_budget_reservations where budget_key=$1',[budgetKey])).rows[0].used);
    let planned=0;const selected:any[]=[];
    for(const row of pool){const cost=await estimate(row);if(spent+planned+cost.reservation>budgetNanodollars)break;planned+=cost.reservation;selected.push({id:row.id,title:row.title,sourceId:row.source_id,url:row.canonical_url,sourceHash:row.current_hash,provider:row.provider,score:row.score,location:row.location,...cost});}
    report={run,model:'gpt-6-luna',classifier,calibrationVersion:corpus.id,createdAt:new Date().toISOString(),policy:'Previously unattempted and unreviewed current source versions; deterministic score thirds with employer/provider diversity. Take the budget-fitting prefix, without selecting on model outcomes or job cost.',eligiblePool:rows.length,requested:40,selected,maximumNewUSD:planned/1e9,priorReservedUSD:spent/1e9,results:[]};
    await writeFile(artifact,JSON.stringify(report,null,2)+'\n');
  }
  if(report.calibrationVersion!==corpus.id)throw new Error('Calibration changed after preparation');
  if(report.selected.length>40||new Set(report.selected.map((r:any)=>r.id)).size!==report.selected.length)throw new Error('Invalid bounded sample manifest');
  console.log(JSON.stringify({run,requested:40,selected:report.selected.length,maximumNewUSD:report.maximumNewUSD,priorReservedUSD:report.priorReservedUSD,live}));
  let consecutiveFailures=0;
  if(live)for(const item of report.selected){
    if(report.results.some((r:any)=>r.id===item.id))continue;
    const old=(await c.query('select id,status from board_assessment_requests where candidate_id=$1',[item.id])).rows;
    if(old.length)throw new Error('Candidate was attempted after preparation; refusing duplicate request');
    const row=(await c.query('select c.*,v.snapshot from board_discovery_candidates c join board_discovery_versions v on v.candidate_id=c.id and v.content_hash=c.current_hash where c.id=$1',[item.id])).rows[0];
    if(!row||row.current_hash!==item.sourceHash||(await estimate(row)).requestHash!==item.requestHash)throw new Error('Frozen source or request changed');
    const id=randomUUID();await c.query("insert into board_assessment_requests(id,candidate_id,source_hash,model,calibration_version,status) values($1,$2,$3,'gpt-6-luna',$4,'started')",[id,row.id,row.current_hash,corpus.id]);
    let record:any;
    try{
      const result=await assessWithAI(candidate(row),{...options,fetchImpl:boundedModelFetch(c,id,'discovery')});
      await c.query('begin');const current=(await c.query('select current_hash from board_discovery_candidates where id=$1 for update',[row.id])).rows[0];
      if(current?.current_hash!==item.sourceHash)throw new Error('Source changed during assessment');
      await c.query('insert into board_candidate_assessments(id,candidate_id,source_hash,classifier_version,calibration_version,model,result) values($1,$2,$3,$4,$5,\'gpt-6-luna\',$6)',[id,row.id,row.current_hash,classifier,corpus.id,JSON.stringify(result)]);
      await c.query("update board_assessment_requests set status='succeeded',finished_at=now() where id=$1",[id]);await c.query('commit');
      record={id:row.id,requestId:id,status:'succeeded',result};consecutiveFailures=0;
    }catch(error){await c.query('rollback');const failure=error instanceof Error?error.message.slice(0,200):'Assessment failed';await c.query("update board_assessment_requests set status='failed',finished_at=now() where id=$1",[id]);record={id:row.id,requestId:id,status:'failed',failure};consecutiveFailures++;}
    report.results.push(record);await writeFile(artifact,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({completed:report.results.length,title:item.title,status:record.status,fit:record.result?.fit}));
    if(consecutiveFailures>=3)break;
  }
  report.budget=(await c.query('select sum(reserved_nanodollars)::float8/1e9 as reserved_usd,sum(actual_nanodollars)::float8/1e9 as uncached_usage_estimate_usd from board_model_budget_reservations where budget_key=$1',[budgetKey])).rows[0];
  await writeFile(artifact,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({completed:report.results.length,budget:report.budget,artifact}));
}finally{if(locked)await c.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await c.end();}
