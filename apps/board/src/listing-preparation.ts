import type {Client,PoolClient} from 'pg';import {randomUUID} from 'node:crypto';
import {loadReview} from './editorial-store.js';import {recordVersion} from './editorial-review.js';import {observationHash} from './listing-maintenance.js';import {digest} from './review-history.js';
import {metadataVersion,listingFieldsRequest,checkedListingFields,preparedListing,type ListingFields} from './listing-fields.js';
import {operatingBudgetKey,operatingBudgetNanodollars,operatingMonthUsageSql,pipelineRequestReservation,canReserve,usageCost} from './assessment-budget.js';
type DB=Pick<Client|PoolClient,'query'>;type Deps={apiKey?:string;model?:string;fetchImpl?:typeof fetch;fixture?:(request:ReturnType<typeof listingFieldsRequest>)=>Promise<unknown>};
const transaction=async<T>(db:DB,fn:()=>Promise<T>)=>{await db.query('begin');try{const r=await fn();await db.query('commit');return r}catch(e){await db.query('rollback');throw e}};
export async function prepareListing(db:DB,jobId:string,actor:string,deps:Deps={}){
 const row=await loadReview(db,jobId);if(!row||row.record.status!=='draft'||row.decision!=='approved'||!row.snapshot)return {status:'unavailable'};
 const age=Date.now()-new Date(row.checked_at).getTime();if(age<0||age>86400000||row.outcome!=='needs_review')return {status:'recheck_required'};
 const sourceHash=observationHash(row.snapshot),version=recordVersion(row.record),request=listingFieldsRequest(row.snapshot,row.record.company),body=JSON.stringify(request),model=deps.fixture?'fixture:gpt-6-luna':'gpt-6-luna',id=randomUUID();
 const prior=(await db.query('select status,result from board_listing_preparations where job_id=$1 and source_hash=$2 and policy_version=$3 and model=$4',[jobId,sourceHash,metadataVersion,model])).rows[0];
 if(prior)return {status:prior.status,result:prior.result,reused:true};
 if(!deps.fixture&&(!deps.apiKey||deps.model!=='gpt-6-luna'))return {status:'not_configured'};
 const reserved=await transaction(db,async()=>{
  await db.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");
  if((await db.query('select 1 from board_listing_preparations where job_id=$1 and source_hash=$2 and policy_version=$3 and model=$4',[jobId,sourceHash,metadataVersion,model])).rows.length)return false;
  if(!deps.fixture){const used=Number((await db.query(operatingMonthUsageSql)).rows[0].n),allowance=(await db.query('select cap_nanodollars,model from board_model_allowances where id=$1',[operatingBudgetKey])).rows[0];if(!allowance||allowance.model!=='gpt-6-luna'||!canReserve(used,pipelineRequestReservation(body),Math.min(operatingBudgetNanodollars,Number(allowance.cap_nanodollars))))throw new Error('Approved $10 monthly model allowance exhausted');}
  await db.query("insert into board_listing_preparations(id,job_id,source_hash,record_version,policy_version,model,request_hash,status) values($1,$2,$3,$4,$5,$6,$7,'started')",[id,jobId,sourceHash,version,metadataVersion,model,digest(body)]);
  if(!deps.fixture)await db.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,listing_preparation_id) values($1,$2,$3,$1)',[id,operatingBudgetKey,pipelineRequestReservation(body)]);
  return true;
 });if(!reserved)return {status:'in_progress'};
 try{
  let value:unknown,usage:any=null;
  if(deps.fixture)value=await deps.fixture(request);else{
   const response=await (deps.fetchImpl??fetch)('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${deps.apiKey}`,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(35000)});
   if(!response.ok)throw new Error('Metadata request failed');const payload=await response.json();usage=payload.usage;
   if(usage)await db.query('update board_model_budget_reservations set usage=$2,actual_nanodollars=$3 where listing_preparation_id=$1',[id,usage,usageCost(usage)]);
   if(payload.status!=='completed')throw new Error('Incomplete metadata response');
   const text=payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');value=JSON.parse(text);
  }
  const fields:ListingFields=checkedListingFields(value,row.snapshot),prepared=preparedListing(row.record,fields);
  const human=(await db.query('select r.focus,r.engineering_gate from board_candidate_drafts b join board_candidate_reviews r on r.id=b.review_id where b.job_id=$1',[jobId])).rows[0];
  if(human?.focus?.length){prepared.record.focus=human.focus.join(', ');prepared.issues=prepared.issues.filter(issue=>issue!=='Set the work focus');}
  if(human?.engineering_gate==='swe_required'){prepared.record.gate='required';prepared.record.gateLabel='Prior software engineering background required (reviewer decision)';}
  if(human?.engineering_gate==='explicit_non_swe_route'){prepared.record.gate='open';prepared.record.gateLabel='Prior software engineering career not required (reviewer decision)';}
  return transaction(db,async()=>{
   const current=await loadReview(db,jobId,true);
   if(!current||current.record.status!=='draft'||current.decision!=='approved'||!current.snapshot||observationHash(current.snapshot)!==sourceHash||recordVersion(current.record)!==version){await db.query("update board_listing_preparations set status='obsolete',finished_at=now(),failure='Listing, source or human decision changed during preparation' where id=$1",[id]);return {status:'obsolete'};}
   await db.query('update board_jobs set record=$2,updated_at=now() where id=$1',[jobId,prepared.record]);
   const result={fields,issues:prepared.issues,actor,sourceHash,humanOverrides:human??null};
   await db.query("update board_listing_preparations set status='succeeded',result=$2,finished_at=now() where id=$1",[id,result]);
   await db.query("update board_publication_provenance set reconciliation=reconciliation || jsonb_build_object('automaticPreparation',$2::jsonb) where job_id=$1",[jobId,JSON.stringify({id,sourceHash,actor,model,policy:metadataVersion})]);
   return {status:'succeeded',result};
  });
 }catch{
  await db.query("update board_listing_preparations set status='failed',failure='Fields could not be verified. Reserved usage is retained; review manually. No automatic retry.',finished_at=now() where id=$1",[id]);return {status:'failed'};
 }
}
