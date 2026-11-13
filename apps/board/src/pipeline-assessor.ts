import {z} from 'zod';
import {plainDescription,provisionalAssessment} from '@ai-builder-jobs/core';
import {builderRequestV12,buildBuilderPromptV12,builderPromptVersionV12} from './builder-prompt.js';
import {digest} from './review-history.js';
const Decision=z.object({decision:z.enum(['yes','no','unclear']),reason:z.string().min(1).max(600)}).strict();
export type FitDecision=z.infer<typeof Decision>;
export function preparedAssessment(model:string,row:{title:string;source_id:string;location:string;snapshot:{descriptionHtml:string}}){
  const request=builderRequestV12(model,{title:row.title,company:row.source_id,location:row.location,description:row.snapshot.descriptionHtml});
  return {request,body:JSON.stringify(request),promptHash:digest(request.instructions),version:builderPromptVersionV12,calibration:buildBuilderPromptV12({company:row.source_id})};
}
export async function inferBuilder(request:ReturnType<typeof preparedAssessment>['request'],apiKey:string,fetchImpl:typeof fetch=fetch){
  const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(35000)});
  if(!response.ok)throw new Error('Model HTTP failure; request retained for reconciliation');
  const payload=await response.json();
  if(payload.status!=='completed')throw new Error('Model output incomplete; no category judgment recorded');
  const text=payload.output?.flatMap((x:any)=>x.content??[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('');
  return {decision:Decision.parse(JSON.parse(text)),usage:payload.usage??null};
}
export function reviewAssessment(description:string,decision:FitDecision){
  const source=plainDescription(description),extracted=provisionalAssessment(description);
  // Source reading cues, not generated quotations or purported model proof.
  const evidence=source.split(/\n|(?<=[.!?])\s+/).map((s:string)=>s.trim()).filter((s:string)=>s.length>=30&&/build|ship|AI|Claude|Cursor|customer|user/i.test(s)).slice(0,3).map((s:string)=>s.slice(0,300));
  if(evidence.some(s=>!source.includes(s)))throw new Error('Source reading cue mismatch');
  return {...extracted,fit:decision.decision==='yes'?'builder':decision.decision==='no'?'exclude':'unclear',reason:decision.reason,evidence,evidenceMode:'source_reading_cues',focus:[],engineering:'unclear',metadataStatus:'Provisional source excerpts; reconcile focus and experience gate before publication'};
}
