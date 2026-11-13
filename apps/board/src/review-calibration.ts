import type {Pool,Client,PoolClient} from 'pg';
import {provisionalAssessment,referenceSet} from '@ai-builder-jobs/core';
import {digest} from './review-history.js';
import {reviewPurpose} from './candidate-review.js';
type DB=Pick<Pool|Client|PoolClient,'query'>;
export function selectCalibrationFeedback(rows:any[]){
  const eligible=rows.filter(row=>row.purpose==='calibration'&&reviewPurpose(row.candidate_id)==='calibration');
  const selected:any[]=[];
  for(const [label,count] of [['yes',20],['no',15],['maybe',5]] as const)selected.push(...eligible.filter(row=>row.decision===label).slice(0,count));
  const ids=new Set(selected.map(row=>row.id));for(const row of eligible){if(selected.length>=40)break;if(!ids.has(row.id)){selected.push(row);ids.add(row.id);}}
  return selected.sort((a,b)=>(Date.parse(b.created_at) || 0)-(Date.parse(a.created_at) || 0)||b.id.localeCompare(a.id));
}
export async function calibrationSnapshot(db:DB){
  const historical=(await db.query("select id,company,title,canonical_url,historical_label,decision,user_focus,historical_reason from board_review_roles where provenance->>'origin' is distinct from 'candidate_review' order by id")).rows;
  if(referenceSet.some(reference=>!historical.some(row=>row.id===reference.id)))throw new Error('Import the complete historical review set before model assessment');
  const all=(await db.query(`select distinct on(r.candidate_id,r.source_hash) r.*,c.title,v.snapshot from board_candidate_reviews r join board_discovery_candidates c on c.id=r.candidate_id join board_discovery_versions v on v.candidate_id=r.candidate_id and v.content_hash=r.source_hash where r.purpose='calibration' order by r.candidate_id,r.source_hash,r.created_at desc,r.id desc`)).rows.sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()||b.id.localeCompare(a.id));
  const selected=selectCalibrationFeedback(all);
  const manifest={policy:'feedback-context-v1',historical:historical.map(row=>({id:row.id,label:row.historical_label,decision:row.decision,reason:row.historical_reason,focus:row.user_focus})),feedback:all.filter(row=>reviewPurpose(row.candidate_id)==='calibration').map(row=>({id:row.id,candidate:row.candidate_id,hash:row.source_hash,decision:row.decision,focus:row.focus,engineering:row.engineering_gate,note:row.note})),selected:selected.map(row=>row.id)};
  const examples=selected.map(row=>{const extraction=provisionalAssessment(row.snapshot.descriptionHtml);return {candidate:row.candidate_id,sourceHash:row.source_hash,title:row.snapshot.title,decision:row.decision,focus:row.focus,engineering:row.engineering_gate,note:row.note.slice(0,600),qualifications:extraction.qualifications.slice(0,450),building:extraction.building.slice(0,300),ownership:extraction.product.slice(0,300),operations:extraction.operations.slice(0,250),ai:extraction.ai.slice(0,200)};});
  const contextFor=(version:string)=>JSON.stringify({referenceVersion:version,historical,feedback:examples,note:'Human labels are authoritative for the cited posting version. Maybe means uncertain. Focus remains open vocabulary. Evaluation decisions are excluded. Do not infer an employer-wide label.'});
  while(contextFor('').length>100000&&examples.length)examples.pop();
  manifest.selected=selected.slice(0,examples.length).map(row=>row.id);
  const id=digest(JSON.stringify(manifest)),context=contextFor(id);
  if(context.length>120000)throw new Error('Calibration context exceeds bounded prompt size');
  await db.query('insert into board_calibration_versions(id,manifest,prompt_context) values($1,$2,$3) on conflict do nothing',[id,manifest,context]);
  return {id,context,historicalCount:historical.length,feedbackCount:all.length,selectedFeedback:examples.length};
}
