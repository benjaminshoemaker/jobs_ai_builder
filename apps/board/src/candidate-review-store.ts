import type {Pool,PoolClient,Client} from 'pg';
import {reviewPurpose,FeedbackSchema,type ReviewToken,type QueueItem} from './candidate-review.js';
import {stageCandidate,holdCandidateDraft} from './pipeline-drafts.js';
import {priorSweForJob} from './prior-swe.js';
type DB=Pick<Pool|PoolClient|Client,'query'>;
export async function candidateQueueData(db:DB,provider:string,scope:string,reviewed=false,includePriorSwe=false){
  const gateColumn=includePriorSwe?",r.engineering_gate,v.snapshot->>'descriptionHtml' as gate_description":'';
  const {rows}=await db.query(`select c.id,c.title,c.source_id,c.location,c.location_hint,c.score,c.current_hash,c.first_seen_at,v.checked_at as source_checked_at,c.signals,(v.candidate_id is not null) as has_text,a.id as assessment_id,a.created_at as assessed_at,a.result as assessment,r.id as review_id,r.decision${gateColumn} from board_discovery_candidates c join board_discovery_sources s on s.id=c.source_id left join board_discovery_versions v on v.candidate_id=c.id and v.content_hash=c.current_hash left join lateral(select id,created_at,result from board_candidate_assessments where candidate_id=c.id and source_hash=c.current_hash order by created_at desc,id desc limit 1)a on true left join lateral(select id,decision,engineering_gate from board_candidate_reviews where candidate_id=c.id and source_hash=c.current_hash order by created_at desc,id desc limit 1)r on true where ($1='all' or s.provider=$1) and ($2='all' or c.location_hint<>'non_us_indicated') and not exists(select 1 from board_review_roles h where (h.identity_key=c.identity_key or h.canonical_url=c.canonical_url) and h.provenance->>'origin' is distinct from 'candidate_review') order by c.score desc,c.id`,[provider,scope]);
  const all=includePriorSwe?rows.map(({gate_description,engineering_gate,...row})=>({...row,prior_swe:priorSweForJob(gate_description,engineering_gate,row.title)})) as QueueItem[]:rows as QueueItem[];
  return {all,eligible:all.filter(row=>row.has_text&&(reviewed?!!row.review_id:!row.review_id))};
}
export async function candidateDetail(db:DB,id:string){
  const {rows}=await db.query(`select c.*,v.snapshot,a.id as assessment_id,a.result as assessment,a.model,a.classifier_version,a.calibration_version,r.id as review_id,r.decision,r.note as review_note,r.focus as review_focus,r.engineering_gate from board_discovery_candidates c left join board_discovery_versions v on v.candidate_id=c.id and v.content_hash=c.current_hash left join lateral(select * from board_candidate_assessments where candidate_id=c.id and source_hash=c.current_hash order by created_at desc,id desc limit 1)a on true left join lateral(select * from board_candidate_reviews where candidate_id=c.id and source_hash=c.current_hash order by created_at desc,id desc limit 1)r on true where c.id=$1`,[id]);return rows[0]??null;
}
export class CandidateReviewError extends Error{constructor(message:string,readonly status=409){super(message);}}
// Caller owns the transaction. Source versions and prior decisions are locked before accepting feedback.
export async function saveCandidateReview(db:DB,token:ReviewToken,fields:unknown){
  const feedback=FeedbackSchema.parse(fields);
  const focus=feedback.focus?feedback.focus.split(',').map(s=>s.trim()).filter(Boolean):null;
  const replayQuery='select id,candidate_id,source_hash,decision,note,focus,engineering_gate from board_candidate_reviews where id=$1';
  const same=(row:any)=>row.candidate_id===token.id&&row.source_hash===token.hash&&row.decision===feedback.decision&&row.note===feedback.note&&JSON.stringify(row.focus)===JSON.stringify(focus)&&row.engineering_gate===(feedback.engineering||null);
  const old=await db.query(replayQuery,[token.nonce]);
  if(old.rows[0]){if(!same(old.rows[0]))throw new CandidateReviewError('This form was already used for a different decision or note. Reload before changing it.');return old.rows[0].id as string;}
  const {rows}=await db.query('select current_hash from board_discovery_candidates where id=$1 for update',[token.id]);
  const replay=await db.query(replayQuery,[token.nonce]);
  if(replay.rows[0]){if(!same(replay.rows[0]))throw new CandidateReviewError('This form was already used. Reload before changing it.');return replay.rows[0].id as string;}
  if(!rows[0]||rows[0].current_hash!==token.hash)throw new CandidateReviewError('The employer source changed. Review the current version before saving.');
  const full=await db.query('select 1 from board_discovery_versions where candidate_id=$1 and content_hash=$2',[token.id,token.hash]);
  if(!full.rows.length)throw new CandidateReviewError('Full employer text is required before recording a fit decision.');
  const latest=await db.query('select id from board_candidate_reviews where candidate_id=$1 and source_hash=$2 order by created_at desc,id desc limit 1',[token.id,token.hash]);
  if((latest.rows[0]?.id??null)!==token.reviewId)throw new CandidateReviewError('A newer decision was saved. Reload before changing it.');
  if(token.assessmentId){const assessment=await db.query('select 1 from board_candidate_assessments where id=$1 and candidate_id=$2 and source_hash=$3',[token.assessmentId,token.id,token.hash]);if(!assessment.rows.length)throw new CandidateReviewError('The assessment does not match this source version.');}
  await db.query(`insert into board_candidate_reviews(id,candidate_id,source_hash,decision,focus,engineering_gate,note,actor_id,sampling_lane,selection_policy,purpose,assessment_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[token.nonce,token.id,token.hash,feedback.decision,focus?JSON.stringify(focus):null,feedback.engineering||null,feedback.note,token.actor,token.lane,token.policy,reviewPurpose(token.id),token.assessmentId]);
  if(feedback.decision==='yes')await stageCandidate(db,token.id);
  else await holdCandidateDraft(db,token.id,feedback.decision);
  return token.nonce;
}
