import type {Client,PoolClient} from 'pg';
import {randomUUID} from 'node:crypto';
import {provisionalAssessment} from '@ai-builder-jobs/core';
import {JobSchema} from './catalog.js';
import {safeEmployerHtml} from './employer-recheck.js';
import {digest} from './review-history.js';
import {observationHash} from './listing-maintenance.js';
type DB=Pick<Client|PoolClient,'query'>;
export function initialDraft(row:any,now=Date.now()){
  const s=row.snapshot,e=provisionalAssessment(s.descriptionHtml);
  const arrangement=/^remote$/i.test(s.workplaceType??'')?'Remote':/^hybrid$/i.test(s.workplaceType??'')?'Hybrid':/^onsite$/i.test(s.workplaceType??'')?'Onsite':'Unknown';
  return JobSchema.parse({id:'candidate-'+row.id,company:row.provenance?.company??row.source_id.split(':').slice(1).join(':'),title:s.title,logo:'/logos/company-placeholder.svg',url:row.canonical_url,status:'draft',checkedAt:new Date(row.last_seen_at).toISOString(),originalPublishedAt:s.originalPublishedAt??null,firstSeenAt:new Date(row.first_seen_at).toISOString(),location:row.location,workplace:row.location||'Workplace requires review',arrangement,cities:[],remoteScope:null,focus:row.focus?.join(', ')||'Review focus',gate:row.engineering_gate==='swe_required'?'required':row.engineering_gate==='explicit_non_swe_route'?'open':'unclear',gateLabel:'Review employer experience requirements',pay:'Not confirmed',payDetail:'Reconcile employer compensation; do not infer missing pay.',reason:row.note||'Human-approved builder fit; reconcile display fields before publication.',problem:e.product,building:e.building,delivery:'Review delivery and adoption responsibilities in employer text.',qualifications:e.qualifications,descriptionHtml:safeEmployerHtml(s.descriptionHtml)});
}
// Caller owns the transaction. Reuses the existing editorial and maintenance path.
// The legacy review-history columns store current labels with explicit origin,
// never claim these new approvals were part of the historical calibration set.
export async function stageCandidate(db:DB,id:string,now=Date.now()){
  const {rows}=await db.query(`select d.*,s.provenance,v.snapshot,r.id as review_id,r.decision,r.note,r.focus,r.engineering_gate from board_discovery_candidates d join board_discovery_sources s on s.id=d.source_id join board_discovery_versions v on v.candidate_id=d.id and v.content_hash=d.current_hash join lateral(select * from board_candidate_reviews where candidate_id=d.id and source_hash=d.current_hash order by created_at desc,id desc limit 1) r on true where d.id=$1 for update of d`,[id]);
  const row=rows[0];if(!row||row.decision!=='yes')throw new Error('Current source needs an explicit human Yes');
  const age=now-new Date(row.last_seen_at).getTime();if(age<0)throw new Error('Employer source time is invalid'); // Stale hidden drafts are allowed; publication still requires a fresh check.
  const prior=(await db.query('select * from board_candidate_drafts where candidate_id=$1',[id])).rows[0];
  if(prior?.review_id===row.review_id&&prior.source_hash===row.current_hash)return {jobId:prior.job_id,created:false};
  const job=initialDraft(row,now),roleId='candidate-'+id,checkId=randomUUID(),runId=randomUUID(),maintenanceId=randomUUID();
  const provenance={origin:'candidate_review',candidateId:id,reviewId:row.review_id,sourceHash:row.current_hash,scope:'Current human approval; not historical calibration'};
  await db.query(`insert into board_review_roles(id,identity_key,company,title,canonical_url,historical_label,decision,user_focus,historical_reason,reviewed_version_hash,provenance) values($1,$2,$3,$4,$5,'yes','approved',$6,$7,$8,$9) on conflict(id) do update set decision='approved',title=excluded.title,user_focus=excluded.user_focus,reviewed_version_hash=excluded.reviewed_version_hash,provenance=excluded.provenance`,[roleId,row.identity_key,job.company,job.title,job.url,row.focus?JSON.stringify(row.focus):null,row.note,row.current_hash,provenance]);
  await db.query(`insert into board_review_checks(id,role_id,checked_at,outcome,canonical_url,content_hash,snapshot,note,historical_comparison) values($1,$2,$3,'open',$4,$5,$6,'Current public source approved for fit; display fields awaiting reconciliation','not_available')`,[checkId,roleId,job.checkedAt,job.url,row.current_hash,row.snapshot]);
  await db.query('insert into board_jobs(id,record) values($1,$2) on conflict(id) do update set record=excluded.record,updated_at=now()',[job.id,job]);
  await db.query(`insert into board_publication_provenance(job_id,reference_id,check_id,source_content_hash,reconciliation) values($1,$2,$3,$4,$5) on conflict(job_id) do update set check_id=excluded.check_id,source_content_hash=excluded.source_content_hash,reconciliation=excluded.reconciliation`,[job.id,roleId,checkId,row.current_hash,{...provenance,publication:'not_published_draft'}]);
  await db.query(`insert into board_maintenance_runs(id,status,max_requests,finished_at,summary) values($1,'completed',1,now(),'{"origin":"candidate_staging","requests":0}')`,[runId]);
  await db.query(`insert into board_maintenance_checks(id,run_id,job_id,checked_at,outcome,note,changed_fields,observed_hash,snapshot,previous_record) values($1,$2,$3,$4,'needs_review','New human-approved role; reconcile display fields before publication','["new_role","location","compensation","qualifications"]',$5,$6,$7)`,[maintenanceId,runId,job.id,job.checkedAt,observationHash(row.snapshot),row.snapshot,job]);
  await db.query(`insert into board_maintenance_state(job_id,check_id,disposition,failures,next_check_at) values($1,$2,'needs_review',0,now()) on conflict(job_id) do update set check_id=excluded.check_id,disposition='needs_review',next_check_at=now()`,[job.id,maintenanceId]);
  await db.query(`insert into board_candidate_drafts(candidate_id,job_id,review_role_id,review_id,source_hash) values($1,$2,$3,$4,$5) on conflict(candidate_id) do update set review_id=excluded.review_id,source_hash=excluded.source_hash`,[id,job.id,roleId,row.review_id,row.current_hash]);
  return {jobId:job.id,created:!prior};
}
export async function holdCandidateDraft(db:DB,id:string,decision:'no'|'maybe'|'changed'){
  const status=decision==='no'?'closed':'draft';
  await db.query(`update board_jobs j set record=jsonb_set(j.record,'{status}',to_jsonb($2::text)),updated_at=now() from board_candidate_drafts d where d.candidate_id=$1 and j.id=d.job_id`,[id,status]);
  if(decision!=='changed')await db.query(`update board_review_roles r set decision=$2 from board_candidate_drafts d where d.candidate_id=$1 and r.id=d.review_role_id`,[id,decision==='no'?'rejected':'uncertain']);
}
export async function queueCandidateDraft(db:DB,id:string,reviewId:string,sourceHash:string){
  await db.query("insert into board_pipeline_jobs(id,kind,payload) values($1,'stage',$2) on conflict do nothing",[digest(`stage:${id}:${reviewId}:${sourceHash}`),{candidateId:id,reviewId,sourceHash}]);
}
