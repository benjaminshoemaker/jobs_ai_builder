import type {Client,PoolClient} from 'pg';
import {candidateQueueData} from './candidate-review-store.js';
import {dailyReviewDigest} from './daily-review-digest.js';

type DB=Pick<Client|PoolClient,'query'>;
export type Mailer=(mail:{from:string;to:string;subject:string;text:string;idempotencyKey:string})=>Promise<string>;
const pacificDate=(now:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export function digestDate(now=Date.now()){return pacificDate(now);}

export async function prepareDailyReview(db:DB,options:{origin:string;recipient:string;now?:number}){
  const now=options.now??Date.now(),day=digestDate(now);
  const prior=(await db.query('select * from board_daily_digests where review_date=$1',[day])).rows[0];
  if(prior)return prior;
  const {eligible}=await candidateQueueData(db,'all','us_or_unknown');
  const [last,blocked]=await Promise.all([db.query('select state from board_daily_cycles order by review_date desc limit 1'),db.query("select count(*)::int as n from board_pipeline_jobs where state='blocked'")]);
  const status=`${last.rows[0]?.state??'no daily run yet'}; ${blocked.rows[0]?.n??0} blocked steps`;
  const digest=dailyReviewDigest(eligible,options.origin,now,status);
  const key=`builder-review-${day}`;
  const result=await db.query(`insert into board_daily_digests(review_date,recipient,subject,body,idempotency_key)
    values($1,$2,$3,$4,$5) on conflict(review_date) do update set review_date=excluded.review_date returning *`,
    [day,options.recipient,digest.subject,digest.text,key]);
  return result.rows[0];
}

export async function deliverDailyReview(db:DB,day:string,from:string,mailer:Mailer,now=Date.now()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw new Error('Invalid review date');
  const lock=(await db.query("select pg_try_advisory_lock(hashtext('board-daily-digest')) as locked")).rows[0].locked;
  if(!lock)return {state:'busy' as const};
  try{
    const row=(await db.query('select * from board_daily_digests where review_date=$1',[day])).rows[0];
    if(!row)throw new Error('Prepare the daily digest before delivery');
    if(row.state==='sent'||row.state==='unknown')return {state:row.state as 'sent'|'unknown',messageId:row.provider_message_id};
    if(now-new Date(row.prepared_at).getTime()>23*60*60*1000){
      await db.query("update board_daily_digests set state='unknown',failure='Idempotency window expired; inspect provider before retry' where review_date=$1",[day]);
      return {state:'unknown' as const};
    }
    try{
      const messageId=await mailer({from,to:row.recipient,subject:row.subject,text:row.body,idempotencyKey:row.idempotency_key});
      await db.query("update board_daily_digests set state='sent',provider_message_id=$2,sent_at=now(),failure=null where review_date=$1",[day,messageId]);
      return {state:'sent' as const,messageId};
    }catch(error){
      await db.query("update board_daily_digests set state='failed',failure=$2 where review_date=$1",[day,error instanceof Error?error.message.slice(0,300):'Delivery failed']);
      throw error;
    }
  }finally{await db.query("select pg_advisory_unlock(hashtext('board-daily-digest'))");}
}

export function resendMailer(apiKey:string):Mailer{
  return async mail=>{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':mail.idempotencyKey},body:JSON.stringify({from:mail.from,to:[mail.to],subject:mail.subject,text:mail.text})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||typeof result.id!=='string')throw new Error(`Mail provider rejected request (${response.status})`);
    return result.id;
  };
}
