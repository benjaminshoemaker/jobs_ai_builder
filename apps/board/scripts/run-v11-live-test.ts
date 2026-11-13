import {Client} from 'pg';import {readFile,writeFile} from 'node:fs/promises';
import {enqueuePipeline,runPipeline} from '../src/pipeline.js';import {pipelineBudgetKey,pipelineRequestReservation} from '../src/assessment-budget.js';import {preparedAssessment} from '../src/pipeline-assessor.js';import {digest} from '../src/review-history.js';
const mode=process.argv.includes('--prepare')?'prepare':process.argv.includes('--run')?'run':null;
if(!mode||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview --prepare or --run required');
const file='../../research/luna-v11-live-test-2026-10-29-frozen.json',results='../../research/luna-v11-live-test-2026-10-29-results.json';
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();
try{
if(mode==='prepare'){
 const pre=(await c.query("select count(*)::int n from board_pipeline_jobs where kind='assess' and state in ('pending','retry','running')")).rows[0].n;if(pre)throw new Error('Inspect existing pending inference before freezing a new batch');
 await enqueuePipeline(c,'assess',20,Date.now(),'gpt-6-luna');
 const rows=(await c.query(`select j.id job_id,j.payload,d.*,s.provenance,v.snapshot from board_pipeline_jobs j join board_discovery_candidates d on d.id=j.payload->>'candidateId' join board_discovery_sources s on s.id=d.source_id join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash where j.kind='assess' and j.state='pending' order by j.updated_at,j.id`)).rows;
 if(rows.length>20||!rows.length)throw new Error('Unexpected test size');
 const cases=rows.map((r,i)=>{const p=preparedAssessment('gpt-6-luna',r);return {reviewId:'L'+String(i+1).padStart(2,'0'),jobId:r.job_id,candidateId:r.id,company:r.provenance?.company??r.source_id,title:r.title,url:r.canonical_url,location:r.location,score:r.score,sourceHash:r.current_hash,requestHash:digest(p.body),promptHash:p.promptHash,source:r.snapshot,reservation:pipelineRequestReservation(p.body)};});
 const report={createdAt:new Date().toISOString(),model:'gpt-6-luna',policy:'builder-fit-v11',reasoning:'medium',budgetKey:pipelineBudgetKey,allowanceUsd:5,maxRequests:20,totalReservationUsd:cases.reduce((n,r)=>n+r.reservation,0)/1e9,cases};await writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({prepared:cases.length,maxReservationUsd:report.totalReservationUsd}));
}else{
 if(!process.env.OPENAI_API_KEY)throw new Error('Existing credential missing');const frozen=JSON.parse(await readFile(file,'utf8'));
 const pending=(await c.query("select id from board_pipeline_jobs where kind='assess' and state in ('pending','retry','running')")).rows;
 if(pending.some(r=>!frozen.cases.some((f:any)=>f.jobId===r.id)))throw new Error('Unfrozen inference present');
 for(let i=0;i<4;i++){const run=await runPipeline(c,{phase:'assess',actor:'user-authorized-luna-v11-test',limit:5,enqueue:false},{model:'gpt-6-luna',apiKey:process.env.OPENAI_API_KEY});console.log(JSON.stringify({batch:i+1,...run}));if(!run.processed||('states' in run&&run.states.blocked===run.processed))break;}
 const rows=[];
 for(const f of frozen.cases){const job=(await c.query('select * from board_pipeline_jobs where id=$1',[f.jobId])).rows[0];const a=(await c.query("select result,model,created_at from board_candidate_assessments where candidate_id=$1 and source_hash=$2 and classifier_version='builder-fit-v11' and model='gpt-6-luna' order by created_at desc limit 1",[f.candidateId,f.sourceHash])).rows[0];rows.push({reviewId:f.reviewId,candidateId:f.candidateId,company:f.company,title:f.title,url:f.url,location:f.location,score:f.score,sourceHash:f.sourceHash,requestHash:f.requestHash,state:job.state,failure:job.failure,assessment:a?.result??null});}
 const budget=(await c.query('select count(*)::int requests,coalesce(sum(reserved_nanodollars),0)::float8/1e9 reserved_usd,coalesce(sum(actual_nanodollars),0)::float8/1e9 uncached_usage_estimate_usd from board_model_budget_reservations where budget_key=$1',[pipelineBudgetKey])).rows[0];const report={completedAt:new Date().toISOString(),model:'gpt-6-luna',policy:'builder-fit-v11',frozenArtifactHash:digest(await readFile(file,'utf8')),budget,publication:false,scheduling:false,predictions:rows};await writeFile(results,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({budget,counts:rows.reduce((n:any,r:any)=>{const k=r.assessment?.fit??r.state;n[k]=(n[k]??0)+1;return n},{})}));
}
}finally{await c.end()}
