import {Client} from 'pg';
import {runPipeline} from '../src/pipeline.js';

const actor='initial-production-top-100';
if(!process.argv.includes('--live'))throw new Error('Explicit --live required');
if(process.env.NEON_PROJECT_ID!=='quiet-band-68598576')throw new Error('Expected the dedicated Production Neon project');
if(!process.env.DATABASE_URL_UNPOOLED||!process.env.OPENAI_API_KEY||process.env.OPENAI_API_KEY==='[SENSITIVE]'||process.env.BOARD_CLASSIFIER_MODEL!=='gpt-6-luna')throw new Error('Production database and local Luna credential required');

const db=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});
await db.connect();
try{
  const pending=Number((await db.query("select count(*)::int n from board_pipeline_jobs where kind='assess' and state in ('pending','retry','running')")).rows[0].n);
  if(pending)throw new Error(`Reconcile ${pending} pending assessment jobs before the top-100 pass`);
  const prior=Number((await db.query("select coalesce(sum((summary->>'processed')::int),0)::int n from board_pipeline_runs where actor_id=$1 and status='completed'",[actor])).rows[0].n);
  if(prior>100)throw new Error('The one-time pass has exceeded its target');
  console.log(JSON.stringify({target:100,previouslyProcessed:prior,remaining:100-prior}));
  for(let done=prior;done<100;){
    const result=await runPipeline(db,{phase:'assess',actor,limit:Math.min(5,100-done),initialTop100:true},{model:'gpt-6-luna',apiKey:process.env.OPENAI_API_KEY});
    if(!('states' in result))throw new Error('Pipeline is busy; resume after the other run completes');
    if(!result.processed)throw new Error(`Only ${done} eligible assessments were available`);
    done+=result.processed;
    console.log(JSON.stringify({processed:done,states:result.states,runId:result.runId}));
    if(result.states.blocked||result.states.retry)throw new Error('Assessment requires reconciliation; stopped without automatic retry');
  }
}finally{await db.end();}
