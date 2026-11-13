import { z } from 'zod';
import { JobSchema, type Job } from './catalog.js';
import { digest } from './review-history.js';
import { observationHash, type EmployerSnapshot } from './listing-maintenance.js';
import { safeEmployerHtml } from './employer-recheck.js';
import type {ListingFields} from './listing-fields.js';

export class ReviewError extends Error {constructor(message:string,readonly status=409){super(message);}}
export const recordVersion=(job:Job)=>digest(JSON.stringify(JobSchema.parse(job)));
export type ReviewRow={id:string;record:Job;decision:string;reference_id:string;check_id:string;disposition:string;checked_at:Date|string;outcome:string;snapshot:EmployerSnapshot|null;note:string;changed_fields:string[];preparation_status?:string;preparation_result?:{issues?:string[];fields?:Partial<ListingFields>}};
export const ReviewActionSchema=z.object({action:z.enum(['approve','withdraw']),checkId:z.string().uuid(),recordVersion:z.string().regex(/^[a-f0-9]{64}$/),sourceHash:z.string().max(64),note:z.string().trim().min(1).max(4000)});
export type ReviewAction=z.infer<typeof ReviewActionSchema>;
export function checkReviewVersion(row:ReviewRow,input:ReviewAction,now=Date.now()) {
  if(row.record.status!=='draft'||row.decision!=='approved')throw new ReviewError('This role is no longer an approved role held for review.');
  if(row.check_id!==input.checkId||recordVersion(row.record)!==input.recordVersion||(row.snapshot?observationHash(row.snapshot):'')!==input.sourceHash)throw new ReviewError('The source or listing changed after this page opened. Reload and review the latest version.');
  if(input.action==='approve'){
    const checked=Date.parse(String(row.checked_at));
    if(row.outcome!=='needs_review'||row.disposition!=='needs_review'||!row.snapshot||!Number.isFinite(checked)||checked>now||now-checked>86400000)throw new ReviewError('Approval requires a successful source check within the past day. Recheck this listing before approving.');
  }
}
const required=z.string().trim().min(1).max(4000);
const FieldsSchema=z.object({company:required.optional(),workplace:required,location:required,cities:z.string().max(4000),arrangement:z.enum(['Remote','Hybrid','Onsite']),remoteScope:z.enum(['','US']),focus:required,gate:z.enum(['open','required','unclear']),gateLabel:required,payMin:z.string().max(40),payMax:z.string().max(40),payPeriod:z.enum(['year','hour']),payKind:z.enum(['base','unspecified']),payText:required,payDetail:required,reason:required,problem:required,building:required,delivery:required,qualifications:required,confirmed:z.literal('yes')});
export function approvedRecord(row:ReviewRow,fields:Record<string,unknown>,draftOnly=false):Job {
  const schema=draftOnly?FieldsSchema.extend({confirmed:z.literal('yes').optional(),arrangement:z.enum(['Remote','Hybrid','Onsite','Unknown'])}):FieldsSchema;
  const parsed=schema.safeParse(fields);
  if(!parsed.success)throw new ReviewError('Complete the required fields and confirm you reviewed the source and display fields.',422);
  const f=parsed.data,cities=f.cities.split(/\r?\n/).map(city=>city.trim()).filter(Boolean);
  if(!draftOnly&&f.arrangement!=='Remote'&&!cities.length)throw new ReviewError('Onsite and hybrid roles need at least one explicit city.',422);
  if(!draftOnly&&f.arrangement==='Remote'&&f.remoteScope!=='US')throw new ReviewError('Confirm U.S. remote eligibility before publishing this role.',422);
  const hasMin=f.payMin.trim()!=='',hasMax=f.payMax.trim()!=='';
  let compensation:Job['compensation']=null;
  if(hasMin!==hasMax)throw new ReviewError('Supply both ends of the pay range, or leave both blank.',422);
  if(hasMin){
    const min=Number(f.payMin),max=Number(f.payMax);
    if(!Number.isFinite(min)||!Number.isFinite(max)||min<0||max<min)throw new ReviewError('Enter a valid pay range with maximum at least minimum.',422);
    compensation={currency:'USD',min,max,period:f.payPeriod,kind:f.payKind};
  }
  if(!row.snapshot)throw new ReviewError('Current employer source is missing.');
  const amount=(value:number)=>'$'+value.toLocaleString('en-US',{maximumFractionDigits:2});
  const pay=compensation?`${amount(compensation.min)}${compensation.min===compensation.max?'':'–'+amount(compensation.max)}${compensation.period==='hour'?' / hour':compensation.kind==='base'?' base':' / year'}${compensation.period==='hour'&&compensation.kind==='base'?' base':''}`:f.payText;
  return JobSchema.parse({...row.record,company:f.company??row.record.company,title:row.snapshot.title.trim(),descriptionHtml:safeEmployerHtml(row.snapshot.descriptionHtml),status:draftOnly?'draft':'published',checkedAt:new Date(row.checked_at).toISOString(),workplace:f.workplace,location:f.location,cities:[...new Set(cities)],arrangement:f.arrangement,remoteScope:f.arrangement==='Remote'&&f.remoteScope==='US'?'US':null,locationTags:[],focus:f.focus,gate:f.gate,gateLabel:f.gateLabel,pay,payDetail:f.payDetail,compensation,reason:f.reason,problem:f.problem,building:f.building,delivery:f.delivery,qualifications:f.qualifications});
}

// Preparation is distinct from publication. Incomplete remote eligibility may stay
// explicit in a hidden draft; the publication form still requires confirmation.
const DraftDisplaySchema=JobSchema.innerType().pick({location:true,workplace:true,arrangement:true,cities:true,remoteScope:true,focus:true,gate:true,gateLabel:true,pay:true,payDetail:true,compensation:true,reason:true,problem:true,building:true,delivery:true,qualifications:true}).strict();
export function reconciledDraft(row:ReviewRow,input:ReviewAction,fields:unknown,now=Date.now()):Job {
  checkReviewVersion(row,{...input,action:'approve'},now);
  const parsed=DraftDisplaySchema.safeParse(fields);
  if(!parsed.success)throw new ReviewError('Invalid draft display fields.',422);
  return JobSchema.parse({...row.record,...parsed.data,title:row.snapshot!.title,descriptionHtml:safeEmployerHtml(row.snapshot!.descriptionHtml),checkedAt:new Date(row.checked_at).toISOString(),status:'draft'});
}
