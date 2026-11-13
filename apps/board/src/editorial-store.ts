import type { Client, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { JobSchema } from './catalog.js';
import { approvedRecord,reconciledDraft,recordVersion,checkReviewVersion,ReviewError,type ReviewAction,type ReviewRow } from './editorial-review.js';
import { digest } from './review-history.js';
type Connection=Pick<Client|PoolClient,'query'>;
export async function loadReview(client:Connection,id:string,lock=false):Promise<ReviewRow|null> {
  const {rows}=await client.query(`select j.id,j.record,case when exists(select 1 from board_candidate_drafts b join board_discovery_candidates d on d.id=b.candidate_id where b.job_id=j.id and b.source_hash<>d.current_hash) then 'uncertain' else r.decision end as decision,p.reference_id,s.check_id,s.disposition,c.checked_at,c.outcome,c.snapshot,c.note,c.changed_fields,lp.status as preparation_status,lp.result as preparation_result from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_roles r on r.id=p.reference_id join board_maintenance_state s on s.job_id=j.id join board_maintenance_checks c on c.id=s.check_id left join lateral(select status,result from board_listing_preparations where job_id=j.id and source_hash=c.observed_hash order by created_at desc limit 1)lp on true where j.id=$1 ${lock?'for update of j,r,p,s':''}`,[id]);
  return rows[0]?{...rows[0],record:JobSchema.parse(rows[0].record)}:null;
}
// Caller owns the transaction; the locks serialize publication with maintenance/editor changes.
export async function commitReview(client:Connection,id:string,input:ReviewAction,fields:Record<string,unknown>,actorId:string,now=Date.now()) {
  const row=await loadReview(client,id,true);if(!row)throw new ReviewError('Listing not found.',404);
  const replay=(await client.query('select * from board_editorial_reviews where job_id=$1 and check_id=$2 and action=$3 and actor_id=$4 and note=$5 order by created_at desc limit 1',[id,input.checkId,input.action,actorId,input.note])).rows[0];
  if(replay&&recordVersion(JobSchema.parse(replay.previous_record))===input.recordVersion&&replay.source_hash===input.sourceHash&&recordVersion(JobSchema.parse(replay.resulting_record))===recordVersion(row.record)){
    const repeated=input.action==='approve'?approvedRecord({...row,record:JobSchema.parse(replay.previous_record)},fields):JobSchema.parse({...replay.previous_record,status:'closed'});
    if(recordVersion(repeated)===recordVersion(row.record))return replay.id;
  }
  checkReviewVersion(row,input,now);
  const record=input.action==='approve'?approvedRecord(row,fields):JobSchema.parse({...row.record,status:'closed'});
  const reviewId=randomUUID();
  await client.query(`insert into board_editorial_reviews(id,job_id,check_id,action,actor_id,note,source_hash,previous_record,resulting_record) values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[reviewId,id,row.check_id,input.action,actorId,input.note,input.sourceHash||null,row.record,record]);
  if(input.action==='approve'){
    const sourceId=randomUUID(),hash=digest(JSON.stringify(row.snapshot));
    await client.query(`insert into board_review_checks(id,role_id,checked_at,outcome,canonical_url,content_hash,snapshot,note,historical_comparison) values($1,$2,$3,'open',$4,$5,$6,$7,'not_available')`,[sourceId,row.reference_id,row.checked_at,row.record.url,hash,row.snapshot,`Editorial reconciliation ${reviewId}; exact maintenance source approved`]);
    await client.query(`update board_publication_provenance set check_id=$2,source_content_hash=$3,reconciliation=reconciliation || $4::jsonb,published_at=now() where job_id=$1`,[id,sourceId,hash,JSON.stringify({latestEditorialReview:reviewId,approvedMaintenanceCheck:row.check_id})]);
  }
  await client.query('update board_jobs set record=$2,updated_at=now() where id=$1',[id,record]);
  await client.query(`update board_maintenance_state set disposition=$2,failures=0,next_check_at=$3 where job_id=$1`,[id,input.action==='approve'?'refreshed':'closed',input.action==='approve'?new Date(new Date(row.checked_at).getTime()+86400000).toISOString():new Date(now).toISOString()]);
  return reviewId;
}

// Caller owns the transaction. This saves editorial preparation only, preserving
// the approval boundary and the prior publication/source provenance.
export async function saveDraftReconciliation(client:Connection,id:string,input:ReviewAction,fields:unknown,actorId:string,now=Date.now()) {
  if(!input.note.trim()||!actorId.trim())throw new ReviewError('Draft preparation requires an actor and note.',422);
  const row=await loadReview(client,id,true);if(!row)throw new ReviewError('Listing not found.',404);
  const record=reconciledDraft(row,input,fields,now);
  await client.query('update board_jobs set record=$2,updated_at=now() where id=$1',[id,record]);
  await client.query(`update board_publication_provenance set reconciliation=reconciliation || jsonb_build_object('preparedDraft',$2::jsonb) where job_id=$1`,[id,JSON.stringify({actorId,at:new Date(now).toISOString(),note:input.note,checkId:row.check_id,sourceHash:input.sourceHash,previousRecord:row.record,resultingRecord:record,publication:'not_published_draft'})]);
  return record;
}

// Saves an incomplete editorial draft without treating preparation as approval.
export async function saveDraftForm(client:Connection,id:string,input:ReviewAction,fields:Record<string,unknown>,actorId:string,now=Date.now()) {
 const row=await loadReview(client,id,true);if(!row)throw new ReviewError('Listing not found.',404);
 checkReviewVersion(row,input,now);const record=approvedRecord(row,fields,true);
 await client.query('update board_jobs set record=$2,updated_at=now() where id=$1',[id,record]);
 await client.query("update board_publication_provenance set reconciliation=reconciliation || jsonb_build_object('preparedDraft',$2::jsonb) where job_id=$1",[id,JSON.stringify({actorId,at:new Date(now).toISOString(),note:input.note,checkId:row.check_id,sourceHash:input.sourceHash,previousRecord:row.record,resultingRecord:record,publication:'not_published_draft'})]);
}
