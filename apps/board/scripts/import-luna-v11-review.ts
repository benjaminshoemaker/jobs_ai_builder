import {Client} from 'pg';import {readFile,writeFile} from 'node:fs/promises';import {digest} from '../src/review-history.js';import {tx} from '../src/pipeline.js';import {queueCandidateDraft,holdCandidateDraft} from '../src/pipeline-drafts.js';
if(!process.argv.includes('--apply')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview --apply required');
const source=await readFile('../../research/luna-v11-live-test-2026-10-29-frozen.json','utf8'),predictions=await readFile('../../research/luna-v11-live-test-2026-10-29-results.json','utf8'),text=await readFile('../../research/luna-v11-live-test-2026-10-29-user-labels.json','utf8'),labels=JSON.parse(text);
if(digest(source)!==labels.sourceArtifactHash||digest(predictions)!==labels.predictionArtifactHash)throw new Error('Frozen evidence changed');
const uuid=(s:string)=>{const h=digest(s);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();try{
const report=await tx(c,async()=>{const saved=[];for(const r of labels.reviews){
const row=(await c.query('select current_hash from board_discovery_candidates where id=$1 for update',[r.candidateId])).rows[0];
if(!(await c.query('select 1 from board_discovery_versions where candidate_id=$1 and content_hash=$2',[r.candidateId,r.sourceHash])).rows.length)throw new Error('Exact reviewed source is unavailable');
const a=(await c.query("select id from board_candidate_assessments where candidate_id=$1 and source_hash=$2 and classifier_version='builder-fit-v11' and model='gpt-6-luna' order by created_at desc limit 1",[r.candidateId,r.sourceHash])).rows[0];if(!a)throw new Error('Frozen assessment missing');
const id=uuid(digest(text)+':'+r.reviewId);
await c.query(`insert into board_candidate_reviews(id,candidate_id,source_hash,decision,note,actor_id,sampling_lane,selection_policy,purpose,assessment_id,created_at) values($1,$2,$3,$4,$5,'chat:user-confirmed','evaluation','review-mix-v1','evaluation',$6,$7) on conflict(id) do nothing`,[id,r.candidateId,r.sourceHash,r.decision,r.userNote,a.id,labels.createdAt]);
const latest=(await c.query('select id from board_candidate_reviews where candidate_id=$1 and source_hash=$2 order by created_at desc,id desc limit 1',[r.candidateId,r.sourceHash])).rows[0];
const current=row?.current_hash===r.sourceHash&&latest?.id===id;
if(current&&r.decision==='yes')await queueCandidateDraft(c,r.candidateId,id,r.sourceHash);else if(current)await holdCandidateDraft(c,r.candidateId,r.decision);
saved.push({reviewId:r.reviewId,decision:r.decision,currentSource:current,reviewRecordId:id});}return {saved,published:0,modelCalls:0};});await writeFile('../../research/luna-v11-review-import-2026-10-29.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await c.end()}
