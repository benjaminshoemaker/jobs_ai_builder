import {auth,isAdmin} from '../../../src/auth';
import {database} from '../../../src/store';
import {sameOrigin} from '../../../src/request';
import {adminPage} from '../../../src/admin-page';
import {pipelinePage} from '../../../src/pipeline-page';
import {runPipeline,type Phase} from '../../../src/pipeline';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){
  try{
    const {data}=await auth().getSession();if(!data?.user)return Response.redirect(new URL('/admin/login',request.url),303);
    if(!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const db=database();
    const runs=await db.query('select * from board_pipeline_runs order by started_at desc limit 10');
    const jobs=await db.query("select j.*,d.title,b.job_id from board_pipeline_jobs j left join board_discovery_candidates d on d.id=j.payload->>'candidateId' left join board_candidate_drafts b on b.candidate_id=d.id order by j.updated_at desc limit 60");
    return pipelinePage(runs.rows,jobs.rows,!!process.env.OPENAI_API_KEY&&process.env.BOARD_CLASSIFIER_MODEL==='gpt-6-luna');
  }catch{return adminPage('<h1>Pipeline status temporarily unavailable</h1>',503);}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return adminPage('<h1>Request rejected</h1>',403);
  try{
    const {data}=await auth().getSession();if(!data?.user||!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    if(process.env.VERCEL_ENV==='production')return adminPage('<h1>Pipeline is restricted to the protected preview</h1>',403);
    const form=await request.formData(),phase=String(form.get('phase'));
    if(!['collect','assess','stage','maintain','resume','retry_safe'].includes(phase))return adminPage('<h1>Invalid pipeline action</h1>',422);
    const client=await database().connect();
    try{
      if(phase==='retry_safe')await client.query("update board_pipeline_jobs set state='retry',next_attempt_at=now() where state='blocked' and kind<>'assess' and attempts<3");
      else await runPipeline(client,{phase:phase as Phase,actor:data.user.id,limit:1},{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY});
    }finally{client.release();}
    return Response.redirect(new URL('/admin/pipeline',request.url),303);
  }catch{return adminPage('<h1>Pipeline step stopped</h1><p>Inspect retained run and queue state before retrying. No automatic publication occurred.</p><p><a href="/admin/pipeline">View pipeline status</a></p>',503);}
}
