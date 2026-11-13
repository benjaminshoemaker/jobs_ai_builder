import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {digest} from '../src/review-history.js';
import {safeEmployerHtml} from '../src/employer-recheck.js';
import {queueCandidateDraft,holdCandidateDraft} from '../src/pipeline-drafts.js';
import {runPipeline,tx} from '../src/pipeline.js';
if(!process.argv.includes('--apply')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview import required');
const root=resolve(import.meta.dirname,'../../..');
const sourceText=await readFile(resolve(root,'research/v10-fresh-review-2026-10-29-sources.json'),'utf8');
const predictionText=await readFile(resolve(root,'research/v10-fresh-review-2026-10-29-predictions.json'),'utf8');
const labelsText=await readFile(resolve(root,'research/v10-fresh-review-2026-10-29-user-labels.json'),'utf8');
const sources=JSON.parse(sourceText),predictions=JSON.parse(predictionText),labels=JSON.parse(labelsText);
if(digest(sourceText)!==predictions.sourceArtifactHash||digest(predictionText)!==labels.predictionArtifactHash)throw new Error('Frozen source/prediction provenance changed');
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const uuid=(s:string)=>{const h=digest(s);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();
const summary:any={imported:[],draftRuns:[],modelCalls:0,published:0};
try{
  await tx(c,async()=>{
    const runId=randomUUID();await c.query("insert into board_discovery_runs(id,status,max_requests,finished_at,summary) values($1,'completed',1,now(),'{\"origin\":\"verified_chat_review_import\",\"requests\":0}')",[runId]);
    for(const source of sources.sources){
      const label=labels.reviews.find((r:any)=>r.reviewId===source.reviewId);if(!label||label.sourceHash!==source.sourceHash||label.normalizedHash!==digest(source.description))throw new Error('Source-bound user review mismatch');
      const u=new URL(source.url),provider=source.provider,slug=provider==='bamboohr'?u.hostname.split('.')[0]:provider==='greenhouse'?new URL(source.sourceUrl).pathname.split('/')[3]:u.pathname.split('/')[1];
      const sourceId=provider+':'+slug,identity=sourceId+':'+source.employerPostingId,id=digest(identity).slice(0,32);
      await c.query(`insert into board_discovery_sources(id,provider,slug,provenance) values($1,$2,$3,$4) on conflict(id) do update set provenance=board_discovery_sources.provenance || excluded.provenance`,[sourceId,provider,slug,{origin:'user_reviewed_batch',company:source.company,artifact:'research/v10-fresh-review-2026-10-29-user-labels.json'}]);
      const snapshot={title:source.title,descriptionHtml:safeEmployerHtml(source.description.split('\n').map((line:string)=>'<p>'+esc(line)+'</p>').join('')),text:source.description,location:provider==='ashby'?source.location.primary:provider==='bamboohr'?source.location.location:source.location,secondaryLocations:source.location.secondary??[],workplaceType:source.location.workplaceType??(source.location.locationType==='2'?'Hybrid':null),isRemote:source.location.isRemote??null,compensation:source.compensation??null,metadata:[],originalPublishedAt:provider==='greenhouse'&&source.postedAt?new Date(source.postedAt).toISOString():null,lastPublishedAt:provider==='ashby'?source.postedAt:null,canonicalUrl:source.url,applyUrl:source.url};
      if(provider==='lever')delete snapshot.location.workplaceType;
      const hash=digest(JSON.stringify(snapshot)),location=provider==='ashby'?[source.location.primary,...(source.location.secondary??[]).map((x:any)=>x.location)].join('; '):provider==='bamboohr'?[source.location.location.city,source.location.location.state].join(', '):typeof source.location==='string'?source.location:source.location.name??source.location.location??'';
      await c.query(`insert into board_discovery_candidates(id,identity_key,source_id,employer_posting_id,canonical_url,title,location,score,signals,location_hint,current_hash,first_seen_at,last_seen_at,last_run_id) values($1,$2,$3,$4,$5,$6,$7,100,$8,'unknown',$9,$10,$10,$11) on conflict(identity_key) do update set current_hash=case when board_discovery_candidates.last_seen_at<=excluded.last_seen_at then excluded.current_hash else board_discovery_candidates.current_hash end,last_seen_at=greatest(board_discovery_candidates.last_seen_at,excluded.last_seen_at)`,[id,identity,sourceId,source.employerPostingId,source.url,source.title,location,{method:'verified_review_import',originalArtifactSourceHash:source.sourceHash,normalizedHash:source.normalizedHash},hash,source.checkedAt,runId]);
      await c.query('insert into board_discovery_versions(candidate_id,content_hash,snapshot,checked_at) values($1,$2,$3,$4) on conflict do nothing',[id,hash,snapshot,source.checkedAt]);
      const reviewId=uuid(digest(labelsText)+':'+source.reviewId);
      await c.query(`insert into board_candidate_reviews(id,candidate_id,source_hash,decision,focus,engineering_gate,note,actor_id,sampling_lane,selection_policy,purpose,created_at) values($1,$2,$3,$4,null,null,$5,'chat:user-confirmed','evaluation','review-mix-v1','evaluation',$6) on conflict(id) do nothing`,[reviewId,id,hash,label.decision,label.userReason??'User-confirmed '+label.decision+' in fresh batch '+source.reviewId+'; source artifact '+source.sourceHash,labels.createdAt]);
      const current=(await c.query('select current_hash from board_discovery_candidates where id=$1',[id])).rows[0];
      const latest=(await c.query('select id from board_candidate_reviews where candidate_id=$1 and source_hash=$2 order by created_at desc,id desc limit 1',[id,hash])).rows[0];
      const eligible=current.current_hash===hash&&latest.id===reviewId;
      if(eligible&&label.decision==='yes')await queueCandidateDraft(c,id,reviewId,hash);
      else if(eligible)await holdCandidateDraft(c,id,label.decision);
      summary.imported.push({reviewId:source.reviewId,candidateId:id,decision:label.decision,currentSource:eligible});
    }
  });
  for(let i=0;i<4;i++){const run=await runPipeline(c,{phase:'stage',actor:'chat-review-import',limit:3});summary.draftRuns.push(run);if(!run.processed)break;}
  summary.drafts=(await c.query("select b.job_id,j.record->>'status' as status from board_candidate_drafts b join board_jobs j on j.id=b.job_id order by b.job_id")).rows;
  await writeFile(resolve(root,'research/fresh-review-pipeline-import-2026-10-29.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}finally{await c.end();}
