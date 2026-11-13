import {Client} from 'pg';
import {candidateQueueData} from '../src/candidate-review-store.js';
import {dailyReviewDigest} from '../src/daily-review-digest.js';

if(!process.argv.includes('--preview')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Preview database and explicit --preview required');
const db=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});
await db.connect();
try {
  const {eligible}=await candidateQueueData(db,'all','us_or_unknown');
  const [last,blocked]=await Promise.all([db.query('select state from board_daily_cycles order by review_date desc limit 1'),db.query("select count(*)::int as n from board_pipeline_jobs where state='blocked'")]);
  const status=`${last.rows[0]?.state??'no daily run yet'}; ${blocked.rows[0]?.n??0} blocked steps`;
  const digest=dailyReviewDigest(eligible,process.env.BOARD_PREVIEW_URL||'https://jobs-ai-builder-dlvllaffl-benshoemakerxyz-3472s-projects.vercel.app',Date.now(),status);
  console.log(JSON.stringify({subject:digest.subject,newCount:digest.newCount,backlogCount:digest.backlogCount,top:digest.top,link:digest.link,lastRunStatus:status},null,2));
} finally {await db.end();}
