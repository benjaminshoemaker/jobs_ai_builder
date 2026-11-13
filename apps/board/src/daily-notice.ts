import type {Client,PoolClient} from 'pg';
import type {Mailer} from './daily-review-delivery.js';

type DB=Pick<Client|PoolClient,'query'>;
export async function sendRecordedNotice(db:DB,options:{key:string;recipient:string;from:string;subject:string;body:string;mailer:Mailer;now:number;day:string}){
  const {key,day,now}=options;
  const lock=(await db.query('select pg_try_advisory_lock(hashtext($1)) as locked',[key])).rows[0].locked;
  if(!lock)return {state:'busy' as const,day};
  try{
    const result=await db.query(`insert into board_daily_alerts(alert_key,recipient,subject,body)
      values($1,$2,$3,$4) on conflict(alert_key) do update set alert_key=excluded.alert_key returning *`,[key,options.recipient,options.subject,options.body]);
    const row=result.rows[0];
    if(row.state==='sent'||row.state==='unknown')return {state:row.state as 'sent'|'unknown',day,messageId:row.provider_message_id};
    if(now-new Date(row.prepared_at).getTime()>23*60*60*1000){
      await db.query("update board_daily_alerts set state='unknown',failure='Idempotency window expired; inspect provider before retry' where alert_key=$1",[key]);
      return {state:'unknown' as const,day};
    }
    try{
      const messageId=await options.mailer({from:options.from,to:row.recipient,subject:row.subject,text:row.body,idempotencyKey:key});
      await db.query("update board_daily_alerts set state='sent',provider_message_id=$2,sent_at=now(),failure=null where alert_key=$1",[key,messageId]);
      return {state:'sent' as const,day,messageId};
    }catch(error){
      await db.query("update board_daily_alerts set state='failed',failure=$2 where alert_key=$1",[key,error instanceof Error?error.message.slice(0,300):'Delivery failed']);
      throw error;
    }
  }finally{await db.query('select pg_advisory_unlock(hashtext($1))',[key]);}
}
