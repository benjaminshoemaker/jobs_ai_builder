import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {buildBuilderPromptV7,builderRequestV7,builderPromptVersion,buildBuilderPromptV8,builderRequestV8,builderPromptVersionV8} from '../src/builder-prompt.js';
import {classificationMetrics} from '../src/classification-metrics.js';
import {budgetKey} from '../src/assessment-budget.js';
const live=process.argv.includes('--live'),v8=process.argv.includes('--v8');
const version=v8?builderPromptVersionV8:builderPromptVersion,buildPrompt=v8?buildBuilderPromptV8:buildBuilderPromptV7,buildRequest=v8?builderRequestV8:builderRequestV7;
if(!live&&!process.argv.includes('--prepare'))throw new Error('Choose --prepare or --live');
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Preview configuration required');
if(live&&!process.env.OPENAI_API_KEY)throw new Error('API credential required');
const root=resolve(import.meta.dirname,'../../..'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const base=JSON.parse(await readFile(resolve(root,'research/capability-baseline-15-bounded-2026-10-29.json'),'utf8'));
const allKeys=['c1d22788c9cb215c409c26b711293492','8fe2124691866e8b9c1bf3a95887a3dd','65c30d5f2a8fabb4e8631904aabc177e','overjoy','batch1_c08','batch1_c20'];
const keys=v8?allKeys.filter(key=>!['c1d22788c9cb215c409c26b711293492','batch1_c20'].includes(key)):allKeys;
const path=resolve(root,'research/builder-prompt-'+(v8?'v8':'v7')+'-smoke-2026-10-29.json');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();let locked=false;
try{
  locked=(await c.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;if(!locked)throw new Error('Another worker is active');
  const cases=[];
  for(const key of keys){
    const item=base.cases.find((x:any)=>x.key===key);if(!item)throw new Error('Case outside the authorized fifteen');
    const row=item.expected==='yes'?(await c.query('select snapshot from board_review_checks where id=$1 and content_hash=$2',[item.sourceId,item.sourceHash])).rows[0]:(await c.query('select snapshot from board_discovery_versions where candidate_id=$1 and content_hash=$2',[item.key,item.sourceHash])).rows[0];
    const description=row?.snapshot.descriptionHtml??row?.snapshot.text;if(typeof description!=='string'||hash(description)!==item.inputHash)throw new Error('Frozen source differs');
    const body=buildRequest('gpt-6-luna',{title:item.title,company:item.company,location:'See source posting',description});
    const reservation=(Buffer.byteLength(JSON.stringify(body))+4096)*125+body.max_output_tokens*500;
    cases.push({item,body,reservation,requestHash:hash(JSON.stringify(body)),examples:buildPrompt({company:item.company}).exampleIds});
  }
  const spent=Number((await c.query('select sum(reserved_nanodollars)::text as n from board_model_budget_reservations')).rows[0].n);
  const maximum=cases.reduce((n,row)=>n+row.reservation,0);
  const manifestHash=hash(JSON.stringify(cases.map(x=>({key:x.item.key,hash:x.requestHash,expected:x.item.expected}))));
  let report:any=null;try{report=JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  if(report&&report.manifestHash!==manifestHash)throw new Error('Previously frozen smoke test changed');
  report??={status:'prepared',version,manifestHash,cases:cases.map(x=>({key:x.item.key,title:x.item.title,company:x.item.company,expected:x.item.expected,sourceHash:x.item.sourceHash,labelEvidence:x.item.labelEvidence,requestHash:x.requestHash,exampleIds:x.examples})),maximumNewUSD:maximum/1e9,priorReservedUSD:spent/1e9,results:[],note:'One development smoke test on previously inspected cases, not a holdout benchmark. Original source-text caveats still apply to historical positives. Target employer examples excluded.'};
  const persist=()=>writeFile(path,JSON.stringify(report,null,2)+'\n');await persist();
  console.log(JSON.stringify({live,cases:keys.length,maximumNewUSD:maximum/1e9,maximumTotalUSD:(spent+maximum)/1e9,withinCap:spent+maximum<=3600000000}));
  if(live){
    const remaining=cases.filter(x=>!report.results.some((r:any)=>r.key===x.item.key));
    if(spent+remaining.reduce((s,row)=>s+row.reservation,0)>3600000000)throw new Error('Whole remaining smoke batch exceeds authorized cap');
    for(const {item,body,reservation,requestHash} of remaining){
      const old=await c.query("select id from board_classifier_regression_requests where run_id=$1 and case_key=$2",[version+'-smoke-2026-10-29',item.key]);if(old.rows.length)throw new Error('Existing request needs explicit reconciliation; no automatic retry');
      const id=randomUUID();await c.query('begin');try{await c.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");const n=Number((await c.query('select sum(reserved_nanodollars)::text as n from board_model_budget_reservations')).rows[0].n);if(n+reservation>3600000000)throw new Error('Budget exceeded');await c.query(`insert into board_classifier_regression_requests(id,run_id,case_key,model,expected,source_hash,context_hash,classifier_hash,status) values($1,$2,$3,'gpt-6-luna',$4,$5,$6,$6,'started')`,[id,version+'-smoke-2026-10-29',item.key,item.expected,item.sourceHash,requestHash]);await c.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,regression_request_id) values($1,$2,$3,$1)',[id,budgetKey,reservation]);await c.query('commit');}catch(e){await c.query('rollback');throw e;}
      let record:any;
      try{const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`API HTTP ${response.status}`);const payload=await response.json() as any;if(payload.usage){const u=payload.usage;await c.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where id=$1',[id,JSON.stringify(u),Math.ceil(u.input_tokens*100+(u.input_tokens_details?.cache_write_tokens??0)*25+u.output_tokens*500)]);}if(payload.status!=='completed')throw new Error('Incomplete model response');const text=payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text??'').join('');const result=z.object({decision:z.enum(['yes','no','unclear']),reason:z.string().max(600)}).strict().parse(JSON.parse(text));await c.query("update board_classifier_regression_requests set status='succeeded',result=$2,finished_at=now() where id=$1",[id,JSON.stringify(result)]);record={key:item.key,expected:item.expected,status:'succeeded',result};}catch(e){const failure=e instanceof Error?e.message.slice(0,200):'Failure';await c.query("update board_classifier_regression_requests set status='failed',failure=$2,finished_at=now() where id=$1",[id,failure]);record={key:item.key,expected:item.expected,status:'failed',failure};}
      report.results.push(record);await persist();console.log(JSON.stringify({key:item.key,title:item.title,expected:item.expected,decision:record.result?.decision,status:record.status}));
    }
  }
  report.status=report.results.length===keys.length?'complete':'prepared';
  report.developmentDiagnosticMetrics=classificationMetrics(report.results.map((r:any)=>({expected:r.expected,prediction:r.result?.decision??null,status:r.status,sourceComparable:true})));
  delete report.developmentDiagnosticMetrics.sourceUnverified;
  report.developmentDiagnosticMetrics.labelBasis='Recorded user judgments, including historical positive expectations with unverified original text pairs';
  report.developmentDiagnosticMetrics.includedHistoricallyPaired=report.cases.filter((x:any)=>x.labelEvidence!=='explicit_current_source_review').length;
  report.sourceVerifiedMetrics=classificationMetrics(report.results.map((r:any)=>({expected:r.expected,prediction:r.result?.decision??null,status:r.status,sourceComparable:report.cases.find((x:any)=>x.key===r.key).labelEvidence==='explicit_current_source_review'})));
  report.budget=(await c.query('select sum(reserved_nanodollars)::float8/1e9 as reserved_usd,sum(actual_nanodollars)::float8/1e9 as reported_usage_estimate_usd from board_model_budget_reservations')).rows[0];await persist();console.log(JSON.stringify({status:report.status,developmentDiagnosticMetrics:report.developmentDiagnosticMetrics,budget:report.budget}));
}finally{if(locked)await c.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await c.end();}
