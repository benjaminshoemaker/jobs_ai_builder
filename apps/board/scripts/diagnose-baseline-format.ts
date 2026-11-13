import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {plainDescription} from '@ai-builder-jobs/core';
import {baselinePolicy,baselineReservation} from '../src/capability-baseline.js';
import {budgetKey} from '../src/assessment-budget.js';
if(!process.argv.includes('--live')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED||!process.env.OPENAI_API_KEY)throw new Error('Explicit preview API diagnostic required');
const root=resolve(import.meta.dirname,'../../..'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const caseIndex=process.argv.indexOf('--case'),caseKey=caseIndex<0?'amperity':process.argv[caseIndex+1];
const outputLimit=caseIndex<0?2000:600;
const baseline=JSON.parse(await readFile(resolve(root,'research/capability-baseline-15-bounded-2026-10-29.json'),'utf8'));
const source=baseline.cases.find((x:any)=>x.key===caseKey);
if(!baseline.results.some((x:any)=>x.key===caseKey&&x.model==='gpt-6.1-sol'&&x.status==='failed'))throw new Error('Only operational failures may be diagnosed');
if(!source)throw new Error('Case is outside the frozen comparison');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();let locked=false;
try{
  locked=(await c.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;if(!locked)throw new Error('Wait for the main comparison to finish');
  const old=(await c.query("select id from board_classifier_regression_requests where run_id='baseline-plain-format-diagnostic' and case_key=$1",[caseKey])).rows;if(old.length)throw new Error('Diagnostic already attempted');
  const row=(await c.query('select snapshot from board_review_checks where id=$1 and content_hash=$2',[source.sourceId,source.sourceHash])).rows[0];
  const description=row.snapshot.descriptionHtml??row.snapshot.text;if(hash(description)!==source.inputHash)throw new Error('Source changed');
  const instructions=baselinePolicy.replace('Cite relevant supplied passage IDs and explain the decision briefly.','Explain the decision briefly.');
  const body:any={model:'gpt-6.1-sol',store:false,service_tier:'default',reasoning:{effort:'medium'},max_output_tokens:outputLimit,instructions,input:JSON.stringify({title:source.title,company:source.company,description:plainDescription(description)}),text:{format:{type:'json_schema',name:'builder_plain_diagnostic',strict:true,schema:{type:'object',properties:{decision:{type:'string',enum:['yes','no','unclear']},reason:{type:'string',maxLength:600}},required:['decision','reason'],additionalProperties:false}}}};
  const reservation=baselineReservation(body),id=randomUUID();await c.query('begin');
  try{await c.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");const spent=Number((await c.query('select sum(reserved_nanodollars)::text as n from board_model_budget_reservations')).rows[0].n);if(spent+reservation>3600000000)throw new Error('Would exceed approved $3.60');await c.query(`insert into board_classifier_regression_requests(id,run_id,case_key,model,expected,source_hash,context_hash,classifier_hash,status) values($1,'baseline-plain-format-diagnostic',$2,'gpt-6.1-sol','yes',$3,$4,$5,'started')`,[id,caseKey,source.sourceHash,hash(instructions),hash(JSON.stringify(body))]);await c.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,regression_request_id) values($1,$2,$3,$1)',[id,budgetKey,reservation]);await c.query('commit');}catch(e){await c.query('rollback');throw e;}
  console.log(JSON.stringify({diagnostic:'same frozen source and criteria; plain posting, no evidence IDs',caseKey,maximumUSD:reservation/1e9}));
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const payload=await response.json() as any;const output=payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text??'').join('')??'';
  const diagnostic={caseKey,maxOutputTokens:outputLimit,status:payload.status,incompleteDetails:payload.incomplete_details,returnedModel:payload.model,outputText:output,outputTypes:payload.output?.map((x:any)=>x.type),usage:payload.usage};
  if(payload.usage){const u=payload.usage;await c.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where id=$1',[id,JSON.stringify(u),Math.ceil(u.input_tokens*2000+(u.input_tokens_details?.cache_write_tokens??0)*500+u.output_tokens*10000)]);}
  await c.query("update board_classifier_regression_requests set status=$2,result=$3,finished_at=now() where id=$1",[id,payload.status==='completed'?'succeeded':'failed',JSON.stringify(diagnostic)]);
  await writeFile(resolve(root,'research/capability-baseline-format-diagnostic-'+caseKey+'-2026-10-29.json'),JSON.stringify(diagnostic,null,2)+'\n');console.log(JSON.stringify({...diagnostic,outputText:output.slice(0,1800)}));
}finally{if(locked)await c.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await c.end();}
