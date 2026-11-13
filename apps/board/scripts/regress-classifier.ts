import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {assessWithAI,definition,boardEligibility,provisionalAssessment} from '@ai-builder-jobs/core';
import {boundedModelFetch} from '../src/bounded-model-fetch.js';
import {regressionContext,hash} from '../src/classifier-regression.js';
import {budgetKey} from '../src/assessment-budget.js';
import {calibrationSnapshot} from '../src/review-calibration.js';
const live=process.argv.includes('--live');
if(!live&&!process.argv.includes('--prepare'))throw new Error('Choose --prepare or --live');
if(process.env.VERCEL_ENV==='production')throw new Error('Preview only');
if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('Database configuration required');
if(live&&(!process.env.OPENAI_API_KEY||process.env.BOARD_CLASSIFIER_MODEL!=='gpt-6-luna'))throw new Error('Configured Luna credential required');
const retryFailures=process.argv.includes('--retry-failures');
const runId=retryFailures?'luna-reviewed-regression-2026-10-29-v6-validation-recovery':'luna-reviewed-regression-2026-10-29-v6';
const artifact=resolve(import.meta.dirname,'../../../research/'+runId+'.json');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();let locked=false;
try{
  locked=(await c.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;if(!locked)throw new Error('Another model worker is active');
  const frozen=await calibrationSnapshot(c);
  const historical=(await c.query("select id,company,title,canonical_url,decision,historical_label,user_focus,historical_reason from board_review_roles where provenance->>'origin' is distinct from 'candidate_review' order by id")).rows;
  const feedback=(await c.query(`select distinct on(r.candidate_id,r.source_hash) r.id,r.candidate_id,r.decision,r.note,r.focus,r.engineering_gate,d.source_id,d.title,v.snapshot from board_candidate_reviews r join board_discovery_candidates d on d.id=r.candidate_id join board_discovery_versions v on v.candidate_id=r.candidate_id and v.content_hash=r.source_hash where r.purpose='calibration' order by r.candidate_id,r.source_hash,r.created_at desc`)).rows.map(row=>{const e=provisionalAssessment(row.snapshot.descriptionHtml);return {id:row.id,candidate_id:row.candidate_id,source_id:row.source_id,title:row.title,decision:row.decision,note:row.note,focus:row.focus,engineering:row.engineering_gate,qualifications:e.qualifications,building:e.building,ownership:e.product,operations:e.operations,ai:e.ai};});
  const positives=(await c.query(`select r.id,r.company,r.title,r.canonical_url,r.reviewed_version_hash,ch.id as source_id,ch.content_hash,ch.historical_comparison,ch.snapshot,ch.checked_at from board_review_roles r left join lateral(select * from board_review_checks where role_id=r.id and snapshot is not null order by checked_at desc limit 1)ch on true where r.decision='approved' order by r.id`)).rows;
  type Case={key:string;company:string;title:string;url:string;expected:'yes'|'no';description:string;location:string;checkedAt:string;sourceHash:string;sourceId:string;comparison:string;context:string;contextHash:string};
  const cases:Case[]=[],missing:{id:string;company:string;title:string;reason:string}[]=[];
  const add=(row:any,expected:'yes'|'no',description:string,sourceId:string,sourceHash:string,comparison:string)=>{
    const context=regressionContext(historical,feedback,{company:row.company,id:row.id,url:row.canonical_url});
    cases.push({key:row.id,company:row.company,title:row.title,url:row.canonical_url,expected,description,location:row.snapshot.location??'',checkedAt:new Date(row.checked_at).toISOString(),sourceHash,sourceId,comparison,context:context.context,contextHash:hash(context.context)});
  };
  for(const row of positives){const text=row.snapshot?.descriptionHtml??row.snapshot?.text;if(!text){missing.push({id:row.id,company:row.company,title:row.title,reason:'No full saved employer description; not evaluated from a title or user-label summary'});continue;}add(row,'yes',text,row.source_id,row.content_hash,row.historical_comparison??'not_available');}
  const negatives=JSON.parse(await readFile(resolve(import.meta.dirname,'../../../research/luna-boundary-user-review-2026-10-29.json'),'utf8')).reviews;
  for(const entry of negatives){const row=(await c.query('select d.*,v.snapshot from board_discovery_candidates d join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=$2 where d.id=$1',[entry.candidateId,entry.sourceHash])).rows[0];if(!row)throw new Error('Missing exact negative source version');add({...row,company:row.source_id.split(':')[1],checked_at:row.last_seen_at},'no',row.snapshot.descriptionHtml,entry.candidateId,entry.sourceHash,'exact_user_reviewed_version');}
  cases.sort((a,b)=>Number(a.expected==='yes')-Number(b.expected==='yes')||a.key.localeCompare(b.key));
  if(cases.length>40)throw new Error('Explicit regression batch is limited to 40 requests');
  const baseline=JSON.parse(await readFile(resolve(import.meta.dirname,'../../../research/luna-reviewed-regression-2026-10-29-v3.json'),'utf8'));
  if(cases.length!==baseline.cases.length||cases.some(item=>{const old=baseline.cases.find((x:any)=>x.key===item.key);return !old||old.sourceHash!==item.sourceHash||old.inputHash!==hash(item.description)||old.contextHash!==item.contextHash||old.expected!==item.expected;}))throw new Error('Same-example rerun requires unchanged source text, labels and leave-out contexts');
  if(retryFailures){
    const priorRun=JSON.parse(await readFile(resolve(import.meta.dirname,'../../../research/luna-reviewed-regression-2026-10-29-v5.json'),'utf8'));
    const failed=new Set(priorRun.results.filter((r:any)=>r.status==='failed').map((r:any)=>r.key));
    for(let i=cases.length-1;i>=0;i--)if(!failed.has(cases[i].key))cases.splice(i,1);
    if(!cases.length)throw new Error('No operational failures to retry; classification disagreements are not retry targets');
  }
  const classifierHash=hash(JSON.stringify({definition,boardEligibility,reasoning:'low',max_output_tokens:6000,version:'builder-feedback-v6',evidenceMode:'passage_ids'}));
  for(const item of cases)await c.query('insert into board_calibration_versions(id,manifest,prompt_context) values($1,$2,$3) on conflict do nothing',[item.contextHash,JSON.stringify({policy:'employer-family-leave-out-v1',target:item.key,parentCalibration:frozen.id}),item.context]);
  const manifest=cases.map(({description,context,...rest})=>({...rest,inputHash:hash(description)}));
  const manifestHash=hash(JSON.stringify({classifierHash,cases:manifest,missing}));
  let existing:any=null;try{existing=JSON.parse(await readFile(artifact,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(existing&&existing.manifestHash!==manifestHash)throw new Error('Frozen regression inputs changed; use a new explicit run version');
  const report:any=existing??{runId,manifestHash,classifierHash,model:'gpt-6-luna',scope:retryFailures?'Operational failures from v5 only; no retry of disagreements':'Full frozen regression set',createdAt:new Date().toISOString(),calibrationVersion:frozen.id,policy:'Employer-family leave-out; role fit separate from geography. Target labels/reasons absent from prompt. Previously reviewed cases, not an unseen benchmark.',sourceCaveat:'Positive expectations are historical labels; descriptions marked changed/not_available are drift diagnostics, not verified exact historical-source regression.',missing,cases:manifest,results:[]};
  const persist=()=>writeFile(artifact,JSON.stringify(report,null,2)+'\n');await persist();
  console.log(JSON.stringify({runId,live,positiveCases:cases.filter(x=>x.expected==='yes').length,negativeCases:cases.filter(x=>x.expected==='no').length,missing,remainingDollarBudget:'shared cumulative $1 ledger; existing discovery reservations retained'}));
  if(live){
    // The user explicitly authorized this new fixed-case rerun. Bound its total
    // requests per frozen run, retaining the unchanged cumulative dollar limit.
    const attempted=(await c.query('select count(*)::int as n from board_classifier_regression_requests where run_id=$1',[runId])).rows[0].n;
    let allowed=Math.min(40,cases.length)-attempted,failures=0;
    for(const item of cases){
      const prior=(await c.query('select * from board_classifier_regression_requests where run_id=$1 and case_key=$2',[runId,item.key])).rows[0];
      if(prior){if(prior.source_hash!==item.sourceHash||prior.context_hash!==item.contextHash||prior.classifier_hash!==classifierHash)throw new Error('Existing request conflicts with frozen inputs');if(!report.results.some((r:any)=>r.key===item.key))report.results.push({key:item.key,company:item.company,title:item.title,expected:item.expected,status:prior.status,result:prior.result,failure:prior.failure});continue;}
      if(allowed--<=0)break;
      const id=randomUUID();await c.query(`insert into board_classifier_regression_requests(id,run_id,case_key,model,expected,source_hash,context_hash,classifier_hash,status) values($1,$2,$3,'gpt-6-luna',$4,$5,$6,$7,'started')`,[id,runId,item.key,item.expected,item.sourceHash,item.contextHash,classifierHash]);
      let record:any;
      try{
        const result=await assessWithAI({title:item.title,company:item.company,url:item.url,location:item.location,description:item.description,availability:'employer_feed',checkedAt:item.checkedAt},{apiKey:process.env.OPENAI_API_KEY!,model:'gpt-6-luna',referenceContext:item.context,eligibilityInstructions:boardEligibility,evidenceMode:'passage_ids',fetchImpl:boundedModelFetch(c,id,'regression')});
        await c.query("update board_classifier_regression_requests set status='succeeded',result=$2,finished_at=now() where id=$1",[id,JSON.stringify(result)]);
        record={key:item.key,company:item.company,title:item.title,expected:item.expected,status:'succeeded',result};failures=0;
      }catch(error){const failure=error instanceof Error?error.message.slice(0,200):'Assessment failed';await c.query("update board_classifier_regression_requests set status='failed',failure=$2,finished_at=now() where id=$1",[id,failure]);record={key:item.key,company:item.company,title:item.title,expected:item.expected,status:'failed',failure};failures++;}
      report.results.push(record);await persist();console.log(JSON.stringify({completed:report.results.length,company:item.company,title:item.title,expected:item.expected,fit:record.result?.fit,status:record.status}));
      if(failures>=3){console.log('Stopped after three consecutive failures; no automatic retries');break;}
    }
  }
  const positive=new Set(['builder','product_builder','operations_builder','engineering_builder','engineering_blend']);
  report.summary={};
  for(const expected of ['yes','no']){const rows=report.results.filter((r:any)=>r.expected===expected);report.summary[expected]={tested:rows.length,positive:rows.filter((r:any)=>positive.has(r.result?.fit)).length,negative:rows.filter((r:any)=>r.result?.fit==='exclude').length,uncertain:rows.filter((r:any)=>['stretch','unclear'].includes(r.result?.fit)).length,failed:rows.filter((r:any)=>r.status==='failed').length};}
  report.budget=(await c.query('select sum(reserved_nanodollars)::float8/1e9 as reserved_usd,sum(actual_nanodollars)::float8/1e9 as uncached_usage_estimate_usd from board_model_budget_reservations where budget_key=$1',[budgetKey])).rows[0];
  await persist();console.log(JSON.stringify({summary:report.summary,budget:report.budget,artifact}));
}finally{if(locked)await c.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await c.end();}
