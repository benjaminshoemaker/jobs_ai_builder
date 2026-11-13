import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {baselineModels,baselinePolicy,baselineRequest,baselineReservation,baselineMaxOutputTokens,baselineReasonMaxCharacters} from '../src/capability-baseline.js';
import {budgetKey} from '../src/assessment-budget.js';
const live=process.argv.includes('--live');
if(!live&&!process.argv.includes('--prepare'))throw new Error('Choose --prepare or --live');
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Preview configuration required');
if(live&&!process.env.OPENAI_API_KEY)throw new Error('API credential required');
const root=resolve(import.meta.dirname,'../../..'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const path=resolve(root,'research/capability-baseline-15-bounded-2026-10-29.json');
const base=JSON.parse(await readFile(resolve(root,'research/capability-baseline-prepared-2026-10-29.json'),'utf8'));
if(base.policyHash!==hash(baselinePolicy))throw new Error('Prepared policy changed');
const keys=['overjoy','axiad','amperity','alt','apollo','batch1_c20','batch1_c29','batch1_c03','batch1_c08','rillet','batch1_c50'];
const selected=base.cases.filter((row:any)=>row.expected==='no'||keys.includes(row.key));
if(selected.length!==15||selected.filter((r:any)=>r.expected==='no').length!==4)throw new Error('Expected eleven positives and four negatives');
const resultSchema=z.object({decision:z.enum(['yes','no','unclear']),reason:z.string().min(1),evidence:z.array(z.string()).max(4)}).strict();
const approvedTotalNanodollars=3_600_000_000; // Explicit user authorization, October 29.
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();let locked=false;
try{
  locked=(await c.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;if(!locked)throw new Error('Model worker is active');
  const inputs=new Map<string,ReturnType<typeof baselineRequest>>();
  for(const item of selected){
    const row=item.expected==='yes'?(await c.query('select snapshot from board_review_checks where id=$1 and content_hash=$2',[item.sourceId,item.sourceHash])).rows[0]:(await c.query('select snapshot from board_discovery_versions where candidate_id=$1 and content_hash=$2',[item.key,item.sourceHash])).rows[0];
    const description=row?.snapshot.descriptionHtml??row?.snapshot.text;
    if(typeof description!=='string'||hash(description)!==item.inputHash)throw new Error('Frozen source unavailable or changed');
    // Location comes from the same frozen historical fixture used by preparation.
    const prior=JSON.parse(await readFile(resolve(root,'research/luna-reviewed-regression-2026-10-29-v3.json'),'utf8')).cases.find((x:any)=>x.key===item.key);
    for(const model of baselineModels){const body=baselineRequest(model,{title:item.title,company:item.company,location:prior.location,description});inputs.set(item.key+':'+model,body);}
  }
  for(const item of selected)item.arms=baselineModels.map(model=>({model,requestHash:hash(JSON.stringify(inputs.get(item.key+':'+model)!)),maximumUSD:baselineReservation(inputs.get(item.key+':'+model)!)/1e9}));
  const maxima=Object.fromEntries(baselineModels.map(model=>[model,selected.reduce((sum:number,item:any)=>sum+baselineReservation(inputs.get(item.key+':'+model)!),0)/1e9]));
  const manifestHash=hash(JSON.stringify({selected,policy:base.policyHash,models:baselineModels,maxima,approvedTotalNanodollars}));
  let report:any=null;try{report=JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if(report&&report.manifestHash!==manifestHash)throw new Error('Frozen comparison changed');
  report??={status:'prepared_not_run',runId:'capability-baseline-15-bounded-2026-10-29',manifestHash,policy:baselinePolicy,policyHash:base.policyHash,models:baselineModels,reasoning:'medium',maxOutputTokens:baselineMaxOutputTokens,reasonMaxCharacters:baselineReasonMaxCharacters,pilot:'The original unbounded-explanation run was interrupted after multiple Sol truncations. Pilot requests and reservations remain retained; none is scored in this paired rerun.',approvedTotalUSD:3.60,maximumNewUSD:Object.values(maxima).reduce((a,b)=>a+b,0),maximaUSD:maxima,selection:'All four recent negatives; eleven historical positives covering source-matched Overjoy, clear builder roles, prototypes, junior scope, design, operations and engineering/customer-facing overlap. Selected before new model outputs. This is a small challenge set, not a representative accuracy sample.',cases:selected,results:[]};
  const persist=()=>writeFile(path,JSON.stringify(report,null,2)+'\n');await persist();
  console.log(JSON.stringify({live,cases:15,requests:30,maximumNewUSD:report.maximumNewUSD,approvedTotalUSD:3.60}));
  let consecutiveFailures=0;
  if(live)for(const item of selected)for(const model of baselineModels){
    const runId=report.runId+':'+model;
    const old=(await c.query('select * from board_classifier_regression_requests where run_id=$1 and case_key=$2',[runId,item.key])).rows[0];
    if(old){if(!report.results.some((r:any)=>r.key===item.key&&r.model===model))report.results.push({key:item.key,model,expected:item.expected,status:old.status,result:old.result,failure:old.failure});continue;}
    if(consecutiveFailures>=3)break;
    const body=inputs.get(item.key+':'+model)!,reservation=baselineReservation(body),id=randomUUID();
    await c.query('begin');
    try{
      await c.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");
      const reserved=Number((await c.query('select coalesce(sum(reserved_nanodollars),0)::text as n from board_model_budget_reservations')).rows[0].n);
      if(reserved+reservation>approvedTotalNanodollars)throw new Error('Cumulative $3.60 limit would be exceeded');
      await c.query(`insert into board_classifier_regression_requests(id,run_id,case_key,model,expected,source_hash,context_hash,classifier_hash,status) values($1,$2,$3,$4,$5,$6,$7,$8,'started')`,[id,runId,item.key,model,item.expected,item.sourceHash,base.policyHash,hash(JSON.stringify(body))]);
      await c.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,regression_request_id) values($1,$2,$3,$1)',[id,budgetKey,reservation]);
      await c.query('commit');
    }catch(e){await c.query('rollback');throw e;}
    let record:any;
    try{
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
      if(!response.ok)throw new Error(`API HTTP ${response.status}; body omitted`);
      const payload=await response.json() as any;
      if(payload.usage){const rate=model==='gpt-6.1-sol'?{input:2000,output:10000}:{input:100,output:500};const {input_tokens:i,output_tokens:o}=payload.usage;if(!Number.isSafeInteger(i)||!Number.isSafeInteger(o)||i<0||o<0)throw new Error('Invalid usage response');await c.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where id=$1',[id,JSON.stringify(payload.usage),Math.ceil(i*rate.input+(payload.usage.input_tokens_details?.cache_write_tokens??0)*rate.input*0.25+o*rate.output)]);}
      if(payload.status!=='completed')throw new Error('Incomplete/refused model response: '+JSON.stringify(payload.incomplete_details??{}));
      const output=payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text??'').join('');
      const result=resultSchema.parse(JSON.parse(output));
      const passages=JSON.parse(body.input).passages;
      if(new Set(result.evidence).size!==result.evidence.length||result.evidence.some(id=>!passages.some((p:any)=>p.id===id)))throw new Error('Invalid evidence IDs');
      const stored={...result,quotes:result.evidence.map(id=>passages.find((p:any)=>p.id===id).text)};
      await c.query("update board_classifier_regression_requests set status='succeeded',result=$2,finished_at=now() where id=$1",[id,JSON.stringify(stored)]);
      record={key:item.key,company:item.company,title:item.title,model,expected:item.expected,labelEvidence:item.labelEvidence,status:'succeeded',result:stored};consecutiveFailures=0;
    }catch(e){const failure=e instanceof Error?e.message.slice(0,200):'Request failed';await c.query("update board_classifier_regression_requests set status='failed',failure=$2,finished_at=now() where id=$1",[id,failure]);record={key:item.key,model,expected:item.expected,labelEvidence:item.labelEvidence,status:'failed',failure};consecutiveFailures++;}
    report.results.push(record);await persist();console.log(JSON.stringify({completed:report.results.length,title:item.title,model,decision:record.result?.decision,status:record.status}));
  }
  report.status=report.results.length===30?'complete':live?'partial':'prepared_not_run';report.summary={};
  for(const model of baselineModels){const rows=report.results.filter((r:any)=>r.model===model);report.summary[model]={attempted:rows.length,agreesWithRecordedLabel:rows.filter((r:any)=>r.result?.decision===r.expected).length,disagrees:rows.filter((r:any)=>r.result&&r.result.decision!=='unclear'&&r.result.decision!==r.expected).length,unclear:rows.filter((r:any)=>r.result?.decision==='unclear').length,failed:rows.filter((r:any)=>r.status==='failed').length};}
  report.budget=(await c.query('select sum(reserved_nanodollars)::float8/1e9 as cumulative_reserved_usd,sum(actual_nanodollars)::float8/1e9 as cumulative_uncached_usage_estimate_usd from board_model_budget_reservations')).rows[0];
  await persist();console.log(JSON.stringify({status:report.status,summary:report.summary,budget:report.budget,path}));
}finally{if(locked)await c.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await c.end();}
