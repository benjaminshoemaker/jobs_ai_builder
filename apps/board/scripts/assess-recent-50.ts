import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseEnv} from 'node:util';
import {preparedAssessment,inferBuilder,reviewAssessment} from '../src/pipeline-assessor.js';
import {pipelineRequestReservation,operatingBudgetKey,operatingBudgetNanodollars,operatingMonthUsageSql,canReserve,usageCost} from '../src/assessment-budget.js';
import {digest} from '../src/review-history.js';

const prepare=process.argv.includes('--prepare'),live=process.argv.includes('--live');
if(prepare===live||process.env.VERCEL_ENV==='production')throw new Error('Choose exactly one of --prepare or --live outside production');
const envPath=process.argv.find(value=>value.startsWith('--preview-env='))?.slice('--preview-env='.length);
if(!envPath)throw new Error('Explicit Preview environment file required');
const preview=parseEnv(await readFile(envPath,'utf8'));
const connectionString=preview.DATABASE_URL_UNPOOLED??preview.DATABASE_URL;
if(!connectionString||connectionString.includes('[SENSITIVE]')||connectionString===process.env.DATABASE_URL)throw new Error('Distinct Preview database required');
if(live&&(!process.env.OPENAI_API_KEY||process.env.BOARD_CLASSIFIER_MODEL!=='gpt-6-luna'))throw new Error('Configured local Luna API credential required');
const path=resolve(import.meta.dirname,'../../../research/recent-50-luna-2026-11-12.json');
const model='gpt-6-luna',client=new Client({connectionString});
const selectedSql=`select d.id,d.title,d.source_id,d.canonical_url,d.location,d.first_seen_at,d.current_hash,v.snapshot
  from board_discovery_candidates d join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash
  where d.location_hint<>'non_us_indicated'
    and not exists(select 1 from board_candidate_reviews r where r.candidate_id=d.id and r.source_hash=d.current_hash)
    and not exists(select 1 from board_review_roles h where h.identity_key=d.identity_key or h.canonical_url=d.canonical_url)
    and not exists(select 1 from board_candidate_assessments a where a.candidate_id=d.id and a.source_hash=d.current_hash)
    and not exists(select 1 from board_assessment_requests r where r.candidate_id=d.id and r.source_hash=d.current_hash)
  order by d.first_seen_at desc,d.id limit 50`;
type Item={id:string;title:string;sourceId:string;url:string;sourceHash:string;firstSeenAt:string;requestHash:string;promptHash:string;reservation:number};
type Result={id:string;requestId?:string;status:'succeeded'|'failed'|'obsolete'|'interrupted';decision?:'yes'|'no'|'unclear';reason?:string;usage?:unknown;costEstimateNanodollars?:number|null;failure?:string};
type Report={run:string;model:string;classifierVersion:string;createdAt:string;selection:string;budgetBeforeNanodollars:number;maximumNewNanodollars:number;items:Item[];results:Result[]};
const persist=(report:Report)=>writeFile(path,JSON.stringify(report,null,2)+'\n');
await client.connect();
let locked=false;
try{
  locked=(await client.query("select pg_try_advisory_lock(hashtext('board-model-assessment')) as locked")).rows[0].locked;
  if(!locked)throw new Error('Another manual model run is active');
  let report:Report;
  if(prepare){
    const rows=(await client.query(selectedSql)).rows;
    if(rows.length!==50)throw new Error(`Expected 50 new full-text candidates; found ${rows.length}`);
    const items:Item[]=rows.map(row=>{const p=preparedAssessment(model,row);return {id:row.id,title:row.title,sourceId:row.source_id,url:row.canonical_url,sourceHash:row.current_hash,firstSeenAt:new Date(row.first_seen_at).toISOString(),requestHash:digest(p.body),promptHash:p.promptHash,reservation:pipelineRequestReservation(p.body)};});
    const budgetBefore=Number((await client.query(operatingMonthUsageSql)).rows[0].n);
    const maximumNew=items.reduce((sum,item)=>sum+item.reservation,0);
    if(!canReserve(budgetBefore,maximumNew,operatingBudgetNanodollars))throw new Error('The 50-request conservative maximum exceeds the remaining $10 monthly allowance');
    report={run:'recent-50-luna-2026-11-12',model,classifierVersion:preparedAssessment(model,rows[0]).version,createdAt:new Date().toISOString(),selection:'Newest first_seen_at among U.S.-or-unknown unreviewed candidates with a current full-text snapshot and no prior assessment attempt. Frozen before model outputs.',budgetBeforeNanodollars:budgetBefore,maximumNewNanodollars:maximumNew,items,results:[]};
    try{await readFile(path,'utf8');throw new Error('Prepared report already exists; refusing to replace it');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    await persist(report);
    console.log(JSON.stringify({prepared:items.length,firstSeenRange:[items[0].firstSeenAt,items.at(-1)?.firstSeenAt],maximumNewUSD:maximumNew/1e9,monthReservedBeforeUSD:budgetBefore/1e9,path}));
  }else{
    report=JSON.parse(await readFile(path,'utf8')) as Report;
    if(report.model!==model||report.items.length!==50||new Set(report.items.map(item=>item.id)).size!==50)throw new Error('Invalid frozen cohort');
    let consecutiveFailures=0;
    for(const item of report.items){
      if(report.results.some(result=>result.id===item.id))continue;
      const old=(await client.query('select id,status from board_assessment_requests where candidate_id=$1 and source_hash=$2',[item.id,item.sourceHash])).rows[0];
      if(old){report.results.push({id:item.id,requestId:old.id,status:'interrupted',failure:`Existing ${old.status} request; no resend`});await persist(report);continue;}
      const row=(await client.query('select d.*,v.snapshot from board_discovery_candidates d join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash where d.id=$1',[item.id])).rows[0];
      if(!row||row.current_hash!==item.sourceHash){report.results.push({id:item.id,status:'obsolete',failure:'Source version changed before request'});await persist(report);continue;}
      const p=preparedAssessment(model,row);
      if(digest(p.body)!==item.requestHash||p.promptHash!==item.promptHash||pipelineRequestReservation(p.body)!==item.reservation)throw new Error(`Frozen request changed for ${item.id}`);
      const requestId=randomUUID(),calibrationId=digest(p.calibration.instructions);
      await client.query('begin');
      try{
        await client.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");
        const used=Number((await client.query(operatingMonthUsageSql)).rows[0].n);
        if(!canReserve(used,item.reservation,operatingBudgetNanodollars))throw new Error('Monthly allowance exhausted before request');
        await client.query('insert into board_calibration_versions(id,manifest,prompt_context) values($1,$2,$3) on conflict do nothing',[calibrationId,{policy:p.version,examples:p.calibration.exampleIds},p.calibration.instructions]);
        await client.query("insert into board_assessment_requests(id,candidate_id,source_hash,model,calibration_version,status) values($1,$2,$3,$4,$5,'started')",[requestId,row.id,row.current_hash,model,calibrationId]);
        await client.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,discovery_request_id) values($1,$2,$3,$1)',[requestId,operatingBudgetKey,item.reservation]);
        await client.query('commit');
      }catch(error){await client.query('rollback');throw error;}
      let result:Result;
      try{
        const response=await inferBuilder(p.request,process.env.OPENAI_API_KEY!);
        const cost=response.usage?usageCost(response.usage):null;
        if(response.usage)await client.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where id=$1',[requestId,response.usage,cost]);
        await client.query('begin');
        const current=(await client.query('select current_hash from board_discovery_candidates where id=$1 for update',[row.id])).rows[0];
        const reviewed=(await client.query('select 1 from board_candidate_reviews where candidate_id=$1 and source_hash=$2',[row.id,item.sourceHash])).rows.length>0;
        if(current?.current_hash!==item.sourceHash||reviewed){
          await client.query("update board_assessment_requests set status='obsolete',finished_at=now() where id=$1",[requestId]);
          result={id:item.id,requestId,status:'obsolete',usage:response.usage,costEstimateNanodollars:cost};
        }else{
          const assessment=reviewAssessment(row.snapshot.descriptionHtml,response.decision);
          await client.query('insert into board_candidate_assessments(id,candidate_id,source_hash,classifier_version,calibration_version,model,result) values($1,$2,$3,$4,$5,$6,$7)',[requestId,row.id,item.sourceHash,p.version,calibrationId,model,assessment]);
          await client.query("update board_assessment_requests set status='succeeded',finished_at=now() where id=$1",[requestId]);
          result={id:item.id,requestId,status:'succeeded',decision:response.decision.decision,reason:response.decision.reason,usage:response.usage,costEstimateNanodollars:cost};
        }
        await client.query('commit');consecutiveFailures=0;
      }catch(error){
        await client.query('rollback').catch(()=>{});
        await client.query("update board_assessment_requests set status='failed',finished_at=now() where id=$1 and status='started'",[requestId]);
        result={id:item.id,requestId,status:'failed',failure:error instanceof Error?error.message.slice(0,200):'Unknown failure'};
        consecutiveFailures++;
      }
      report.results.push(result);await persist(report);
      console.log(JSON.stringify({completed:report.results.length,title:item.title,status:result.status,decision:result.decision??null}));
      if(consecutiveFailures>=3)break;
    }
    const totals={yes:0,no:0,unclear:0,failed:0,obsolete:0,interrupted:0};
    for(const result of report.results)if(result.decision)totals[result.decision]++;else if(result.status!=='succeeded')totals[result.status]++;
    const costs=(await client.query('select coalesce(sum(actual_nanodollars),0)::text as actual,coalesce(sum(reserved_nanodollars),0)::text as reserved from board_model_budget_reservations where id=any($1::uuid[])',[report.results.map(result=>result.requestId).filter(Boolean)])).rows[0];
    console.log(JSON.stringify({completed:report.results.length,totals,estimatedUncachedUsageUSD:Number(costs.actual)/1e9,reservedMaximumUSD:Number(costs.reserved)/1e9,path}));
  }
}finally{if(locked)await client.query("select pg_advisory_unlock(hashtext('board-model-assessment'))");await client.end();}
