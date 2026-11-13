import {createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {digest} from './review-history.js';
export const selectionPolicy='review-mix-v1';
export type ReviewLane='priority'|'uncertain'|'negative_audit'|'exploration'|'evaluation'|'manual';
export type QueueItem={id:string;title:string;source_id:string;location:string;location_hint:string;score:number;current_hash:string;first_seen_at?:Date|string;source_checked_at?:Date|string;signals?:{evergreenHint?:boolean};assessment_id:string|null;assessed_at?:Date|string;assessment: {fit:string;reason?:string;engineering?:string;focus?:string[]}|null;review_id:string|null;decision:string|null;has_text:boolean;lane?:ReviewLane};
export function reviewPurpose(id:string){return parseInt(digest(id).slice(0,8),16)%5===0?'evaluation' as const:'calibration' as const;}
const positive=new Set(['builder','product_builder','operations_builder','engineering_builder','engineering_blend']);
export function modelSuggestsBuilder(row:QueueItem){return positive.has(row.assessment?.fit??'');}
export function makeReviewQueue(items:QueueItem[],lane='mixed',limit=25){
  const ranked=[...items].sort((a,b)=>Number(!!a.signals?.evergreenHint)-Number(!!b.signals?.evergreenHint)||b.score-a.score||a.id.localeCompare(b.id));
  const prioritized=[...ranked].sort((a,b)=>Number(modelSuggestsBuilder(b))-Number(modelSuggestsBuilder(a))||Number(!!a.signals?.evergreenHint)-Number(!!b.signals?.evergreenHint)||b.score-a.score||a.id.localeCompare(b.id));
  const random=[...items].sort((a,b)=>digest(selectionPolicy+a.id).localeCompare(digest(selectionPolicy+b.id)));
  const calibration=(row:QueueItem)=>reviewPurpose(row.id)==='calibration';
  const pools={priority:prioritized.filter(row=>calibration(row)&&(!row.assessment||positive.has(row.assessment.fit))),uncertain:ranked.filter(row=>calibration(row)&&row.assessment&&['unclear','stretch'].includes(row.assessment.fit)),negative_audit:random.filter(row=>calibration(row)&&row.assessment?.fit==='exclude'),exploration:random.filter(row=>calibration(row)&&!row.assessment),evaluation:random.filter(row=>!calibration(row))};
  const used=new Set<string>(),employers=new Map<string,number>(),output:QueueItem[]=[];
  const take=(key:keyof typeof pools)=>{
    const available=pools[key].filter(row=>!used.has(row.id));
    const next=available.find(row=>(employers.get(row.source_id)??0)<2)??available[0];
    if(next){used.add(next.id);employers.set(next.source_id,(employers.get(next.source_id)??0)+1);output.push({...next,lane:key});return true;}return false;
  };
  if(lane==='reviewed')return ranked.slice(0,limit).map(row=>({...row,lane:'manual' as const}));
  if(lane in pools){while(output.length<limit&&take(lane as keyof typeof pools)){}return output;}
  const rotation=['priority','uncertain','priority','exploration','evaluation','negative_audit','priority','uncertain','evaluation','negative_audit'] as const;
  while(output.length<limit){let added=false;for(const key of rotation){let picked=take(key);if(!picked)for(const fallback of ['priority','exploration','uncertain','negative_audit','evaluation'] as const){if(take(fallback)){picked=true;break;}}added=picked||added;if(output.length>=limit)break;}if(!added)break;}
  return output;
}
export function makeDailyReviewQueue(items:QueueItem[],now=Date.now(),limit=25){
  const since=now-24*60*60*1000;
  // Reserve room for blind evaluation, uncertainty, exploration and negative audits.
  const cap=Math.ceil(limit*0.6);
  const recent=items.filter(item=>modelSuggestsBuilder(item)&&item.assessed_at&&new Date(item.assessed_at).getTime()>=since);
  const fresh=makeReviewQueue(recent,'priority',cap);
  const selected=new Set(fresh.map(item=>item.id));
  const older=makeReviewQueue(items.filter(item=>modelSuggestsBuilder(item)&&!selected.has(item.id)),'priority',cap-fresh.length);
  for(const item of older)selected.add(item.id);
  return [...fresh,...older,...makeReviewQueue(items.filter(item=>!selected.has(item.id)),'mixed',limit-selected.size)];
}
const TokenSchema=z.object({id:z.string().regex(/^[a-f0-9]{32}$/),hash:z.string().regex(/^[a-f0-9]{64}$/),nonce:z.string().uuid(),actor:z.string(),assessmentId:z.string().uuid().nullable(),reviewId:z.string().uuid().nullable(),lane:z.enum(['priority','uncertain','negative_audit','exploration','evaluation','manual']),policy:z.literal(selectionPolicy),issuedAt:z.number()});
export type ReviewToken=z.infer<typeof TokenSchema>;
export function signReviewToken(value:ReviewToken,secret:string){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',secret).update(data).digest('base64url');}
export function readReviewToken(token:string,secret:string,actor:string,now=Date.now()){
  const [data,signature,...extra]=token.split('.');if(!data||!signature||extra.length)throw new Error('Invalid review token');
  const expected=createHmac('sha256',secret).update(data).digest(),actual=Buffer.from(signature,'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Invalid review token');
  const value=TokenSchema.parse(JSON.parse(Buffer.from(data,'base64url').toString()));
  if(value.actor!==actor||value.issuedAt>now+60000||now-value.issuedAt>86400000)throw new Error('Expired review token');return value;
}
export const FeedbackSchema=z.object({decision:z.enum(['yes','no','maybe']),note:z.string().trim().max(4000),focus:z.string().trim().max(200),engineering:z.enum(['','explicit_non_swe_route','swe_required','technical_fluency','unclear'])});
