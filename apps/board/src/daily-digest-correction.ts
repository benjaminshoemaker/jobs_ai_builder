import type {Client,PoolClient} from 'pg';
import {candidateQueueData} from './candidate-review-store.js';
import {dailyReviewDigest} from './daily-review-digest.js';
import {digestDate,type Mailer} from './daily-review-delivery.js';
import {sendRecordedNotice} from './daily-notice.js';
import {pacificHour} from './daily-watchdog.js';

type DB=Pick<Client|PoolClient,'query'>;
export function needsDigestCorrection(cycle:{state:string;finished_at:Date|string}|undefined,digest:{state:string;sent_at:Date|string}|undefined){
  if(cycle?.state!=='completed'||digest?.state!=='sent'||!cycle.finished_at||!digest.sent_at)return false;
  const sent=new Date(digest.sent_at).getTime(),finished=new Date(cycle.finished_at).getTime();
  return Number.isFinite(sent)&&Number.isFinite(finished)&&pacificHour(sent)<8&&finished>sent;
}
export async function sendDailyDigestCorrection(db:DB,options:{recipient:string;from:string;origin:string;mailer:Mailer;now?:number}){
  const now=options.now??Date.now(),day=digestDate(now);
  const [cycleResult,digestResult]=await Promise.all([
    db.query('select state,finished_at from board_daily_cycles where review_date=$1',[day]),
    db.query('select state,sent_at from board_daily_digests where review_date=$1',[day])
  ]);
  if(!needsDigestCorrection(cycleResult.rows[0],digestResult.rows[0]))return {state:'not_needed' as const,day};
  const {eligible}=await candidateQueueData(db,'all','us_or_unknown');
  const review=dailyReviewDigest(eligible,options.origin,now,'completed');
  const key=`builder-digest-correction-${day}`;
  const subject=`Updated builder roles: ${review.newCount} new likely matches`;
  const body=[`This morning's review email was sent during a delivery test before today's job intake finished. Here is the updated list after intake completed.`, '', review.text].join('\n');
  return sendRecordedNotice(db,{key,recipient:options.recipient,from:options.from,subject,body,mailer:options.mailer,now,day});
}
