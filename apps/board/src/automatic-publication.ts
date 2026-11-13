import type {Client,PoolClient} from 'pg';
import {recheckListing} from './editorial-actions.js';
import {loadReview,commitReview} from './editorial-store.js';
import {prepareListing} from './listing-preparation.js';
import {observationHash} from './listing-maintenance.js';
import {recordVersion,type ReviewRow} from './editorial-review.js';

type DB=Client|PoolClient;
type Deps={model?:string;apiKey?:string;recheck?:typeof recheckListing;prepare?:typeof prepareListing};
export type AutomaticPublication={status:'published'|'held'|'closed';issues:string[]};

const usLocation=/\b(?:United States|USA|U\.S\.|US)\b|,\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;

export function automaticPublicationIssues(row:ReviewRow|null):string[]{
  if(!row)return ['The approved draft is unavailable.'];
  const issues:string[]=[];
  if(row.record.status!=='draft'||row.decision!=='approved')issues.push('The current source version no longer has an approved hidden draft.');
  if(row.outcome!=='needs_review'||row.disposition!=='needs_review'||!row.snapshot)issues.push('The employer posting was not verified as open.');
  if(row.changed_fields.includes('new_role'))issues.push('A fresh employer check is required before this older draft can be published.');
  else if(row.changed_fields.length)issues.push('The employer posting changed after the builder-fit decision: '+row.changed_fields.join(', ')+'.');
  if(row.preparation_status!=='succeeded'||!row.preparation_result?.fields)issues.push('Listing fields could not be prepared and verified.');
  else{
    issues.push(...(row.preparation_result.issues??[]));
    const fields=row.preparation_result.fields;
    if(!fields.problem||!fields.building||!fields.qualifications)issues.push('The problem, personal building, or qualifications summary lacks source support.');
    if(!fields.evidence?.problem?.length||!fields.evidence?.building?.length||!fields.evidence?.qualifications?.length)issues.push('Exact employer evidence for the builder explanation is missing.');
  }
  const job=row.record;
  if(job.arrangement==='Unknown')issues.push('Work arrangement is unclear.');
  if(job.arrangement==='Remote'&&job.remoteScope!=='US')issues.push('U.S. remote hiring eligibility is not confirmed.');
  if(['Hybrid','Onsite'].includes(job.arrangement)&&(!job.cities.length||!usLocation.test(job.location)))issues.push('A U.S. office city and location are not confirmed.');
  if(job.focus==='Review focus'||!job.reason.trim())issues.push('The work focus or builder explanation is incomplete.');
  return [...new Set(issues)];
}

export async function automaticPublishCandidate(db:DB,jobId:string,actor:string,deps:Deps={}):Promise<AutomaticPublication>{
  const before=await loadReview(db,jobId);
  if(!before||before.record.status!=='draft'||before.decision!=='approved'||!jobId.startsWith('candidate-'))return {status:'held',issues:['The current role is not an approved candidate draft.']};
  const outcome=await (deps.recheck??recheckListing)(db,jobId);
  if(outcome==='closed')return {status:'closed',issues:['The employer has closed the posting.']};
  if(outcome!=='needs_review')return {status:'held',issues:['The employer posting could not be verified as open.']};
  const checked=await loadReview(db,jobId);
  if(!checked||checked.changed_fields.length)return {status:'held',issues:automaticPublicationIssues(checked)};
  const prepared=await (deps.prepare??prepareListing)(db,jobId,actor,{model:deps.model,apiKey:deps.apiKey});
  if(prepared.status!=='succeeded')return {status:'held',issues:[prepared.status==='recheck_required'?'A fresh employer check is required.':'Listing fields could not be prepared and verified.']};
  const row=await loadReview(db,jobId);
  const issues=automaticPublicationIssues(row);
  if(issues.length||!row?.snapshot)return {status:'held',issues};
  const job=row.record,pay=job.compensation;
  const fields={company:job.company,location:job.location,workplace:job.workplace,cities:job.cities.join('\n'),arrangement:job.arrangement,remoteScope:job.remoteScope??'',focus:job.focus,gate:job.gate,gateLabel:job.gateLabel,payMin:pay?String(pay.min):'',payMax:pay?String(pay.max):'',payPeriod:pay?.period??'year',payKind:pay?.kind??'unspecified',payText:job.pay,payDetail:job.payDetail,reason:job.reason,problem:job.problem,building:job.building,delivery:job.delivery,qualifications:job.qualifications,confirmed:'yes'};
  await db.query('begin');
  try{
    await commitReview(db,jobId,{action:'approve',checkId:row.check_id,recordVersion:recordVersion(job),sourceHash:observationHash(row.snapshot),note:'Published after human builder-fit approval and automated employer-source and listing-field checks.'},fields,actor);
    await db.query('commit');
  }catch(error){await db.query('rollback');throw error;}
  return {status:'published',issues:[]};
}
