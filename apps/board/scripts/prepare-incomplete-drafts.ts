import {Client} from 'pg';
import {loadReview} from '../src/editorial-store.js';
import {prepareListing} from '../src/listing-preparation.js';

if (!process.argv.includes('--live') || process.env.VERCEL_ENV === 'production' || !process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('Explicit configured preview --live required');
}
const db = new Client({connectionString: process.env.DATABASE_URL_UNPOOLED});
await db.connect();
try {
  const {rows} = await db.query("select id,record->>'company' company from board_jobs where record->>'status'='draft' and (record->>'focus'='Review focus' or record->>'pay'='Not confirmed') order by id limit 7");
  for (const {id,company} of rows) {
    const review = await loadReview(db,id);
    if (!review || review.decision !== 'approved') { console.log(JSON.stringify({id,company,status:'not_approved'})); continue; }
    const result = await prepareListing(db,id,'manual-backfill',{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY});
    console.log(JSON.stringify({id,company,status:result.status,issues:'result' in result ? (result.result as {issues?:string[]}|undefined)?.issues : undefined}));
  }
} finally { await db.end(); }
