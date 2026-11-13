import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {loadReview,saveDraftReconciliation} from '../src/editorial-store.js';
import {recordVersion} from '../src/editorial-review.js';
import {observationHash} from '../src/listing-maintenance.js';
import {tx} from '../src/pipeline.js';
if(!process.argv.includes('--apply')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview --apply required');
const prepared=JSON.parse(await readFile('../../research/fresh-drafts-display-preparation-2026-10-29.json','utf8'));
const source=JSON.parse(await readFile('../../'+prepared.sourceCheckArtifact,'utf8'));
if(prepared.reviews.length!==9||new Set(prepared.reviews.map((r:any)=>r.id)).size!==9)throw new Error('Expected nine distinct reviewed drafts');
const db=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await db.connect();
try{
 const report=await tx(db,async()=>{
  const before=Number((await db.query("select count(*) n from board_jobs where record->>'status'='published'")).rows[0].n),saved=[];
  for(const input of prepared.reviews){
   const check=source.checks.find((r:any)=>r.id===input.id);if(!check?.current||check.url!==input.url)throw new Error('Missing exact employer source');
   const row=await loadReview(db,input.id,true);if(!row?.snapshot||observationHash(row.snapshot)!==observationHash(check.current))throw new Error('Source changed since preparation');
   const record=await saveDraftReconciliation(db,input.id,{action:'approve',checkId:row.check_id,sourceHash:observationHash(row.snapshot),recordVersion:recordVersion(row.record),note:input.note},input.fields,'agent:source-reconciliation');
   if(record.status!=='draft')throw new Error('Preparation must not publish');saved.push({id:record.id,company:record.company,pay:record.pay,workplace:record.workplace,focus:record.focus,gate:record.gate,remainingIssues:input.remainingIssues});
  }
  const after=Number((await db.query("select count(*) n from board_jobs where record->>'status'='published'")).rows[0].n);if(before!==after)throw new Error('Published inventory unexpectedly changed');
  return {checkedAt:new Date().toISOString(),publishedBefore:before,publishedAfter:after,newPublications:0,saved};
 });
 await writeFile('../../research/fresh-drafts-prepared-result-2026-10-29.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await db.end()}
