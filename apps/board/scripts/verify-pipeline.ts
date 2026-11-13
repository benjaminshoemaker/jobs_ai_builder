import {Client} from 'pg';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {runPipeline,enqueuePipeline,tx} from '../src/pipeline.js';
import {parseDiscoveryFeed} from '../src/broad-discovery.js';
import {saveCandidateReview} from '../src/candidate-review-store.js';
import {prepareListing} from '../src/listing-preparation.js';
import {automaticPublishCandidate} from '../src/automatic-publication.js';
import {recheckListing} from '../src/editorial-actions.js';
import {stageCandidate} from '../src/pipeline-drafts.js';
import {loadReview,commitReview,saveDraftReconciliation} from '../src/editorial-store.js';
import {recordVersion} from '../src/editorial-review.js';
import {observationHash} from '../src/listing-maintenance.js';
import {visibleJobs} from '../src/catalog.js';
import {digest} from '../src/review-history.js';
import {operatingBudgetKey as budgetKey} from '../src/assessment-budget.js';
if(!process.argv.includes('--isolated-schema-test')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit isolated preview-schema test required');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED}),other=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});
const schema='pipeline_verify_'+randomUUID().replaceAll('-',''),checks:string[]=[];
let cleaned=false,fixtureCalls=0,networkCalls=0,feedFails=false,closed=false,changed=false,autoAvailable=false;
const source={id:'ashby:pipelinefixture',provider:'ashby' as const,slug:'pipelinefixture',provenance:{company:'Pipeline fixture'}};
const description='<p>Understand user needs, decide what to build, and personally build and ship real tools with Claude Code. Own adoption and outcomes with users. No prior software engineering career required. Use AI to implement, test and improve the software, not just write specifications.</p>';
function job(id='one'){return {id,title:'AI Product Builder',isListed:true,jobUrl:`https://jobs.ashbyhq.com/pipelinefixture/${id}`,applyUrl:`https://jobs.ashbyhq.com/pipelinefixture/${id}/application`,descriptionHtml:description+(changed?'<p>New responsibility: build analytics tools for finance users.</p>':''),location:'Remote, United States',workplaceType:'Remote',isRemote:true,publishedAt:'2026-10-20T00:00:00Z',secondaryLocations:[]};}
const deps={model:'gpt-6-luna',get:async(url:string)=>{
  if(url.endsWith('/robots.txt'))return {status:404,text:'',data:null};
  if(url.startsWith('https://api.ashbyhq.com/')){
    if(feedFails)return {status:503,text:'',data:null};
    const data={jobs:closed?[]:[job(),...(autoAvailable?[job('auto')]:[])]};return {status:200,text:JSON.stringify(data),data};
  }
  return {status:404,text:'',data:null};
},fixtureInfer:async(request:any)=>{
  fixtureCalls++;assert.ok(request.instructions.includes('Distinguish owning the problem'));assert.ok(request.instructions.includes('opening paragraphs'));assert.equal(request.reasoning.effort,'medium');assert.equal(request.max_output_tokens,2000);assert.equal(request.text.format.name,'builder_fit_v12');
  return {decision:'yes' as const,reason:'Fixture: owns problem decisions and personally builds and ships with AI.'};
}};
async function records(){return (await c.query('select record from board_jobs')).rows.map(r=>r.record);}
async function human(id:string,decision:'yes'|'no'|'maybe'){
  const d=(await c.query('select * from board_discovery_candidates where id=$1',[id])).rows[0];
  const latest=(await c.query('select id from board_candidate_reviews where candidate_id=$1 and source_hash=$2 order by created_at desc,id desc limit 1',[id,d.current_hash])).rows[0];
  return tx(c,()=>saveCandidateReview(c,{id,hash:d.current_hash,nonce:randomUUID(),actor:'isolated-fixture',assessmentId:null,reviewId:latest?.id??null,lane:'manual',policy:'review-mix-v1',issuedAt:Date.now()},{decision,note:'Isolated test decision',focus:'product',engineering:'explicit_non_swe_route'}));
}
async function publish(id:string){
  const row=await loadReview(c,id);assert.ok(row);
  return tx(c,()=>commitReview(c,id,{action:'approve',checkId:row.check_id,recordVersion:recordVersion(row.record),sourceHash:observationHash(row.snapshot!),note:'Fixture metadata verified'}, {workplace:'Remote in the United States',location:'United States',cities:'',arrangement:'Remote',remoteScope:'US',focus:'Product',gate:'open',gateLabel:'No SWE career required',payMin:'',payMax:'',payPeriod:'year',payKind:'unspecified',payText:'Not published',payDetail:'No employer pay range supplied',reason:row.record.reason,problem:row.record.problem,building:row.record.building,delivery:row.record.delivery,qualifications:row.record.qualifications,confirmed:'yes'},'isolated-fixture'));
}
async function addCandidate(id:string){
  const r=parseDiscoveryFeed({jobs:[job(id)]},source).records[0];
  const run=(await c.query('select id from board_discovery_runs limit 1')).rows[0].id;
  await c.query(`insert into board_discovery_candidates(id,identity_key,source_id,employer_posting_id,canonical_url,title,location,score,signals,location_hint,current_hash,last_run_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[r.id,r.identity,source.id,r.employerId,r.url,r.title,r.location,r.score,JSON.stringify(r.signals),r.locationHint,r.hash,run]);
  await c.query('insert into board_discovery_versions values($1,$2,$3,now())',[r.id,r.hash,r.snapshot]);return r;
}
await c.connect();await other.connect();
try{
  await c.query(`create schema ${schema}`);await c.query(`set search_path to ${schema}`);await other.query(`set search_path to ${schema}`);
  const folder=resolve(import.meta.dirname,'../migrations');
  for(const name of (await readdir(folder)).filter(n=>n.endsWith('.sql')).sort())await c.query((await readFile(resolve(folder,name),'utf8')).replaceAll('public.',schema+'.'));
  await c.query('insert into board_discovery_sources(id,provider,slug,provenance) values($1,$2,$3,$4)',[source.id,source.provider,source.slug,source.provenance]);
  feedFails=true;await runPipeline(c,{phase:'collect',actor:'isolated-fixture'},deps);
  assert.equal((await c.query("select state from board_pipeline_jobs where kind='collect'")).rows[0].state,'retry');
  feedFails=false;await c.query("update board_pipeline_jobs set next_attempt_at=now()");await runPipeline(c,{phase:'resume',actor:'isolated-fixture'},deps);
  assert.equal((await c.query('select count(*)::int as n from board_discovery_candidates')).rows[0].n,1);
  assert.equal((await runPipeline(c,{phase:'collect',actor:'isolated-fixture'},deps)).processed,0);checks.push('Collection failure retries safely; repeat collection does not duplicate candidates or requests');
  await runPipeline(c,{phase:'assess',actor:'isolated-fixture'},deps);
  assert.equal(fixtureCalls,1);await runPipeline(c,{phase:'assess',actor:'isolated-fixture'},deps);assert.equal(fixtureCalls,1);
  const candidate=(await c.query('select * from board_discovery_candidates')).rows[0];
  assert.equal((await c.query('select model from board_candidate_assessments')).rows[0].model,'fixture:gpt-6-luna');checks.push('Actual v12 request contract; no duplicate inference; fixture output explicitly labeled');
  await human(candidate.id,'yes');await runPipeline(c,{phase:'stage',actor:'isolated-fixture'},deps);
  const listing=(await records())[0];assert.equal(listing.status,'draft');assert.equal(visibleJobs(await records()).length,0);
  checks.push('Saving human Yes immediately creates one hidden draft without a staging action');
  const metaFields={company:null,focus:'Operations',gate:'open',gateLabel:'No SWE career required',arrangement:'Remote',location:'Remote, United States',cities:[],remoteUS:true,pay:{min:null,max:null,period:null,currency:null,kind:'unspecified'},payDetail:'No range disclosed.',problem:'Understand user needs.',building:'Personally build and ship tools with AI.',delivery:'Own adoption and outcomes.',qualifications:'No prior software engineering career required.',evidence:{company:[],focus:['Understand user needs'],gate:['No prior software engineering career required.'],location:['Remote, United States'],pay:[],problem:['Understand user needs, decide what to build'],building:['personally build and ship real tools with Claude Code'],delivery:['Own adoption and outcomes with users'],qualifications:['No prior software engineering career required.']}};
  let metadataCalls=0;
  const metadataDeps={fixture:async()=>{metadataCalls++;return metaFields;}};
  assert.equal((await prepareListing(c,listing.id,'fixture-editor',metadataDeps)).status,'succeeded');
  await prepareListing(c,listing.id,'fixture-editor',metadataDeps);assert.equal(metadataCalls,1);
  assert.equal((await records())[0].focus,'product');assert.equal((await records())[0].status,'draft');
  checks.push('Metadata preparation verifies evidence, preserves reviewer choices, and reuses its result without duplicate inference');

  await runPipeline(c,{phase:'stage',actor:'isolated-fixture'},deps);assert.equal((await records()).length,1);
  const draftRow=(await loadReview(c,listing.id))!;
  const displayNames=['location','workplace','arrangement','cities','remoteScope','focus','gate','gateLabel','pay','payDetail','compensation','reason','problem','building','delivery','qualifications'] as const;
  await tx(c,()=>saveDraftReconciliation(c,listing.id,{action:'approve',checkId:draftRow.check_id,recordVersion:recordVersion(draftRow.record),sourceHash:observationHash(draftRow.snapshot!),note:'Fixture editorial preparation only'},Object.fromEntries(displayNames.map(k=>[k,draftRow.record[k]])),'fixture-editor'));
  assert.equal((await records())[0].status,'draft');assert.equal(visibleJobs(await records()).length,0);
  assert.equal((await c.query('select count(*)::int n from board_editorial_reviews')).rows[0].n,0);
  assert.equal((await c.query("select reconciliation->'preparedDraft'->>'actorId' actor from board_publication_provenance where job_id=$1",[listing.id])).rows[0].actor,'fixture-editor');
  checks.push('Saving source-bound draft preparation records provenance without publication or an approval event');
  await publish(listing.id);assert.equal(visibleJobs(await records()).length,1);const firstSeen=(await records())[0].firstSeenAt;
  checks.push('Human Yes → one hidden draft → explicit editorial approval; published unknown pay remains unknown');
  await human(candidate.id,'maybe');assert.equal(visibleJobs(await records()).length,0);await human(candidate.id,'yes');await runPipeline(c,{phase:'stage',actor:'isolated-fixture'},deps);await publish(listing.id);
  checks.push('Human Maybe immediately holds a linked listing; renewed Yes still requires draft approval');
  await c.query('update board_maintenance_state set next_check_at=now()');await runPipeline(c,{phase:'maintain',actor:'isolated-fixture'},deps);
  assert.equal((await records())[0].status,'published');assert.equal((await records())[0].firstSeenAt,firstSeen);checks.push('New discovery publications participate in freshness maintenance without recency bump');
  changed=true;await enqueuePipeline(c,'collect',1,Date.now()+86400000);await runPipeline(c,{phase:'resume',actor:'isolated-fixture'},deps);
  assert.equal((await records())[0].status,'draft');assert.equal((await loadReview(c,listing.id))!.decision,'uncertain');
  await assert.rejects(()=>publish(listing.id));await human(candidate.id,'yes');await runPipeline(c,{phase:'stage',actor:'isolated-fixture'},deps);await publish(listing.id);
  checks.push('Changed source holds listing and blocks stale editorial approval until new-source human review');
  closed=true;await c.query('update board_maintenance_state set next_check_at=now()');await runPipeline(c,{phase:'maintain',actor:'isolated-fixture'},deps);
  assert.equal((await records())[0].status,'closed');assert.equal(visibleJobs(await records()).length,0);checks.push('Complete feed absence plus exact posting 404 closes a new publication');
  const invalid=await addCandidate('prep-invalid');await human(invalid.id,'yes');
  assert.equal((await prepareListing(c,'candidate-'+invalid.id,'fixture-editor',{fixture:async()=>({...metaFields,evidence:{...metaFields.evidence,gate:['Invented qualifications']}})})).status,'failed');
  assert.equal((await c.query('select record from board_jobs where id=$1',['candidate-'+invalid.id])).rows[0].record.status,'draft');
  const race=await addCandidate('prep-race');await human(race.id,'yes');
  assert.equal((await prepareListing(c,'candidate-'+race.id,'fixture-editor',{fixture:async()=>{await c.query("update board_jobs set record=jsonb_set(record,'{reason}','\"Human edit while preparing\"') where id=$1",['candidate-'+race.id]);return metaFields;}})).status,'obsolete');
  assert.equal((await c.query('select record from board_jobs where id=$1',['candidate-'+race.id])).rows[0].record.reason,'Human edit while preparing');
  checks.push('Invalid evidence stays unpublished; a concurrent human edit invalidates metadata without being overwritten');
  const budgetCandidate=await addCandidate('budget');
  const cal=(await c.query('select id from board_calibration_versions limit 1')).rows[0].id,request=randomUUID();
  await c.query("insert into board_assessment_requests(id,candidate_id,source_hash,model,calibration_version,status) values($1,$2,$3,'gpt-6-luna',$4,'failed')",[request,budgetCandidate.id,budgetCandidate.hash,cal]);
  await c.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,discovery_request_id) values($1,$2,10000000000,$1)',[request,budgetKey]);
  const realFetch=globalThis.fetch;globalThis.fetch=async()=>{networkCalls++;throw new Error('Network forbidden in test');};
  try{await runPipeline(c,{phase:'assess',actor:'isolated-fixture',limit:1},{model:'gpt-6-luna',apiKey:'fixture-not-a-real-key'});}finally{globalThis.fetch=realFetch;}
  assert.equal(networkCalls,0);assert.equal((await c.query("select state from board_pipeline_jobs where payload->>'candidateId'=$1",[budgetCandidate.id])).rows[0].state,'blocked');checks.push('Exhausted real reservation path stops before any network transmission');
  const interrupted=await addCandidate('interrupted');await enqueuePipeline(c,'assess',5,Date.now(),'gpt-6-luna');
  await c.query("update board_pipeline_jobs set state='running',attempts=1 where kind='assess' and payload->>'candidateId'=$1",[interrupted.id]);
  const before=fixtureCalls;await runPipeline(c,{phase:'resume',actor:'isolated-fixture'},deps);assert.equal(fixtureCalls,before);
  assert.equal((await c.query("select state from board_pipeline_jobs where payload->>'candidateId'=$1",[interrupted.id])).rows[0].state,'blocked');checks.push('Interrupted model attempt is reconciled manually, never automatically resent');
  const stale=await addCandidate('stale');await runPipeline(c,{phase:'assess',actor:'isolated-fixture',limit:1},{...deps,fixtureInfer:async req=>{const answer=await deps.fixtureInfer(req);await c.query('update board_discovery_candidates set current_hash=$2 where id=$1',[stale.id,digest('changed-during-inference')]);return answer;}});
  assert.equal((await c.query('select count(*)::int as n from board_candidate_assessments where candidate_id=$1',[stale.id])).rows[0].n,0);checks.push('Source change during inference discards assessment without overwriting human labels');
  assert.equal((await other.query("select pg_try_advisory_lock(hashtext('board-preview-pipeline')) as locked")).rows[0].locked,true);
  try{assert.equal((await runPipeline(c,{phase:'resume',actor:'isolated-fixture'},deps)).busy,true);}finally{await other.query("select pg_advisory_unlock(hashtext('board-preview-pipeline'))");}checks.push('Concurrent worker invocation returns busy without processing');
  const overBudgetCandidate=await addCandidate('over-budget'),overBudgetRequest=randomUUID();
  await c.query("insert into board_assessment_requests(id,candidate_id,source_hash,model,calibration_version,status) values($1,$2,$3,'gpt-6-luna',$4,'failed')",[overBudgetRequest,overBudgetCandidate.id,overBudgetCandidate.hash,cal]);
  await assert.rejects(()=>c.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,discovery_request_id) values($1,$2,1,$1)',[overBudgetRequest,budgetKey]),/Monthly Luna board allowance exhausted/);
  checks.push('Database rejects reservations above the Pacific calendar-month Luna cap');
  assert.equal((await c.query('select sum(reserved_nanodollars)::float8 as n from board_model_budget_reservations')).rows[0].n,10000000000);
  changed=false;closed=false;autoAvailable=true;
  const automatic=await addCandidate('auto');await human(automatic.id,'yes');
  const automaticResult=await automaticPublishCandidate(c,'candidate-'+automatic.id,'isolated-fixture',{
    recheck:(db,id)=>recheckListing(db,id,deps),
    prepare:(db,id,actor)=>prepareListing(db,id,actor,{fixture:async()=>metaFields})
  });
  assert.equal(automaticResult.status,'published');
  assert.equal((await c.query('select record->>\'status\' as status from board_jobs where id=$1',['candidate-'+automatic.id])).rows[0].status,'published');
  assert.equal((await c.query('select count(*)::int as n from board_editorial_reviews where job_id=$1',['candidate-'+automatic.id])).rows[0].n,1);
  checks.push('Human Yes automatically rechecks exact employer posting, prepares supported fields, and publishes without a second manual approval');
}finally{
  await c.query('set search_path to public');await other.query('set search_path to public');await c.query(`drop schema if exists ${schema} cascade`);cleaned=true;await other.end();await c.end();
}
const report={checkedAt:new Date().toISOString(),database:'Dedicated preview database; isolated temporary schema with all migrations and real foreign keys',checks,fixtureModelCalls:fixtureCalls,externalModelCalls:networkCalls,schemaRemoved:cleaned,realBoardRowsChanged:0,schedulesEnabled:false};
await writeFile(resolve(import.meta.dirname,'../../../research/preview-pipeline-verification-2026-10-29.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
