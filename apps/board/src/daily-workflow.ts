import {database} from './store.js';
import {runPipeline,enqueuePipeline,type Phase} from './pipeline.js';
import {digestDate,prepareDailyReview,deliverDailyReview,resendMailer} from './daily-review-delivery.js';

export async function beginIntake(day:string,token:string){
  'use step';
  const result=await database().query("update board_daily_cycles set state='running',started_at=now() where review_date=$1 and run_token=$2 and state='queued' returning review_date",[day,token]);
  if(result.rows.length)return true;
  const current=(await database().query('select state,run_token from board_daily_cycles where review_date=$1',[day])).rows[0];
  return current?.state==='running'&&current.run_token===token;
}
export async function intakeBatch(phase:Phase,day:string){
  'use step';
  const client=await database().connect();
  try{return await runPipeline(client,{phase,actor:`daily:${day}`,limit:5},{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY});}
  finally{client.release();}
}
export async function finishIntake(day:string,token:string,summary:unknown,failed=false){
  'use step';
  await database().query('update board_daily_cycles set state=$3,finished_at=now(),summary=$4::jsonb where review_date=$1 and run_token=$2 and state=\'running\'',[day,token,failed?'failed':'completed',JSON.stringify(summary)]);
}
export async function runDailyIntake(day:string,token:string){
  'use workflow';
  if(!await beginIntake(day,token))return {alreadyStarted:true};
  const results:unknown[]=[];
  try{
    for(let n=0;n<4;n++)results.push({phase:'collect',...(await intakeBatch('collect',day))});
    for(let n=0;n<4;n++)results.push({phase:'maintain',...(await intakeBatch('maintain',day))});
    for(let n=0;n<2;n++)results.push({phase:'assess',...(await intakeBatch('assess',day))});
    await finishIntake(day,token,results);
    return {completed:true,results};
  }catch(error){
    await finishIntake(day,token,{error:error instanceof Error?error.message:String(error),results},true);
    throw error;
  }
}
export async function oneCollectorStep(){
  'use step';
  const client=await database().connect();
  try{
    await enqueuePipeline(client,'collect',1);
    return await runPipeline(client,{phase:'collect',actor:'workflow-probe',limit:1,enqueue:false});
  }finally{client.release();}
}
export async function runCollectorProbe(){
  'use workflow';
  return oneCollectorStep();
}
export async function sendDailyReviewStep(day:string,origin:string){
  'use step';
  const recipient=process.env.BOARD_DAILY_REVIEW_TO;
  const from=process.env.BOARD_DAILY_REVIEW_FROM;
  const key=process.env.RESEND_API_KEY;
  if(!recipient||!from||!key)throw new Error('Daily mail configuration is incomplete');
  const client=await database().connect();
  try{
    await prepareDailyReview(client,{origin,recipient});
    return await deliverDailyReview(client,day,from,resendMailer(key));
  }finally{client.release();}
}
export async function runDailyReviewEmail(day:string,origin:string){
  'use workflow';
  return sendDailyReviewStep(day,origin);
}
export {digestDate};
