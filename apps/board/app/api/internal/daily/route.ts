import {randomUUID,timingSafeEqual} from 'node:crypto';
import {start} from 'workflow/api';
import {HookConflictError} from 'workflow/errors';
import {database} from '../../../../src/store';
import {runDailyIntake,runDailyReviewEmail,runCollectorProbe,digestDate} from '../../../../src/daily-workflow';
import {checkDailyHealth,pacificHour,previewBackupProblem} from '../../../../src/daily-watchdog';
import {sendDailyDigestCorrection} from '../../../../src/daily-digest-correction';
import {resendMailer} from '../../../../src/daily-review-delivery';
export const dynamic='force-dynamic';
function authorized(request:Request){
  const secret=process.env.CRON_SECRET,received=request.headers.get('authorization')??'';
  const expected=`Bearer ${secret??''}`;
  return !!secret&&received.length===expected.length&&timingSafeEqual(Buffer.from(received),Buffer.from(expected));
}
export async function GET(request:Request){
  if(!authorized(request))return new Response('Unauthorized',{status:401});
  if(process.env.BOARD_DAILY_RUNS_ENABLED!=='true')return Response.json({enabled:false},{status:503});
  const action=new URL(request.url).searchParams.get('action');
  const day=digestDate();
  if(action==='probe'&&process.env.VERCEL_ENV==='preview'){
    const run=await start(runCollectorProbe,[]);
    return Response.json({started:true,action,day,runId:run.runId});
  }
  if(action==='intake'){
    const token=randomUUID();
    const claim=await database().query("insert into board_daily_cycles(review_date,state,run_token) values($1,'queued',$2) on conflict do nothing returning review_date",[day,token]);
    if(!claim.rows.length){
      const cycle=(await database().query('select state from board_daily_cycles where review_date=$1',[day])).rows[0];
      return Response.json({started:false,action,day,state:cycle?.state??'unknown'},{status:cycle?.state==='failed'?503:200});
    }
    try{const run=await start(runDailyIntake,[day,token],{experimental_hook:{token:`daily-intake:${day}`}});return Response.json({started:true,action,day,runId:run.runId});}
    catch(error){
      await database().query("update board_daily_cycles set state='failed',finished_at=now(),summary=$3::jsonb where review_date=$1 and run_token=$2 and state='queued'",[day,token,JSON.stringify({error:'Workflow start failed; inspect the provider run before retrying'})]);
      if(HookConflictError.is(error))return Response.json({started:false,action,day,runId:error.conflictingRunId});
      throw error;
    }
  }
  if(action==='digest'){
    if(pacificHour()<8)return Response.json({error:'Daily digest starts at 8 a.m. Pacific'},{status:425});
    const origin=process.env.BOARD_CANONICAL_ORIGIN||(process.env.VERCEL_ENV==='preview'?new URL(request.url).origin:undefined);
    if(!origin||!process.env.BOARD_DAILY_REVIEW_TO||!process.env.BOARD_DAILY_REVIEW_FROM||!process.env.RESEND_API_KEY)return Response.json({error:'Daily mail configuration is incomplete'},{status:503});
    try{const run=await start(runDailyReviewEmail,[day,origin],{experimental_hook:{token:`daily-email:${day}`}});return Response.json({started:true,action,day,runId:run.runId});}
    catch(error){if(HookConflictError.is(error))return Response.json({started:false,action,day,runId:error.conflictingRunId});throw error;}
  }
  if(action==='correction'&&process.env.VERCEL_ENV==='preview'){
    const origin=process.env.BOARD_CANONICAL_ORIGIN;
    const recipient=process.env.BOARD_DAILY_REVIEW_TO,from=process.env.BOARD_DAILY_REVIEW_FROM,key=process.env.RESEND_API_KEY;
    if(!origin||!recipient||!from||!key)return Response.json({error:'Daily mail configuration is incomplete'},{status:503});
    const client=await database().connect();
    try{return Response.json(await sendDailyDigestCorrection(client,{recipient,from,origin,mailer:resendMailer(key)}));}
    finally{client.release();}
  }
  if(action==='watchdog'){
    const origin=process.env.BOARD_CANONICAL_ORIGIN||(process.env.VERCEL_ENV==='preview'?new URL(request.url).origin:undefined);
    const recipient=process.env.BOARD_DAILY_REVIEW_TO,from=process.env.BOARD_DAILY_REVIEW_FROM,key=process.env.RESEND_API_KEY;
    if(!origin||!recipient||!from||!key)return Response.json({error:'Daily mail configuration is incomplete'},{status:503});
    const test=process.env.VERCEL_ENV==='preview'&&new URL(request.url).searchParams.get('test')==='1';
    const backupProblem=process.env.VERCEL_ENV==='preview'&&!test&&pacificHour()>=9?await previewBackupProblem():null;
    const client=await database().connect();
    try{return Response.json(await checkDailyHealth(client,{recipient,from,origin,mailer:resendMailer(key),test,backupProblem}));}
    finally{client.release();}
  }
  return Response.json({error:'Choose action=intake, digest, or watchdog'},{status:422});
}
