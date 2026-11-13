import {Client} from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {baselineModels,baselinePolicy,baselineRequest,baselineReservation,baselineMaxOutputTokens} from '../src/capability-baseline.js';
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Preview database required');
const root=resolve(import.meta.dirname,'../../..'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const prior=JSON.parse(await readFile(resolve(root,'research/luna-reviewed-regression-2026-10-29-v3.json'),'utf8'));
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();
try{
  const cases:{key:string;title:string;company:string;url:string;expected:string;sourceId:string;sourceHash:string;inputHash:string;sourceComparison:string;labelEvidence:string;arms:{model:typeof baselineModels[number];requestHash:string;maximumUSD:number}[]}[]=[];
  for(const item of prior.cases){
    const historical=item.expected==='yes';
    const row=historical?(await c.query('select snapshot from board_review_checks where id=$1 and content_hash=$2',[item.sourceId,item.sourceHash])).rows[0]:(await c.query('select snapshot from board_discovery_versions where candidate_id=$1 and content_hash=$2',[item.key,item.sourceHash])).rows[0];
    if(!row)throw new Error('Missing frozen source');
    const description=row.snapshot.descriptionHtml??row.snapshot.text;
    if(hash(description)!==item.inputHash)throw new Error('Source text differs from frozen set');
    const input={title:item.title,company:item.company,location:item.location,description};
    const arms=baselineModels.map(model=>{const request=baselineRequest(model,input);return {model,requestHash:hash(JSON.stringify(request)),maximumUSD:baselineReservation(request)/1e9};});
    cases.push({key:item.key,title:item.title,company:item.company,url:item.url,expected:item.expected,sourceId:item.sourceId,sourceHash:item.sourceHash,inputHash:item.inputHash,sourceComparison:item.comparison,labelEvidence:item.comparison==='exact_user_reviewed_version'?'explicit_current_source_review':item.comparison==='identical'?'historical_label_with_matching_archived_capture':'historical_label_unverified_text_pair',arms});
  }
  const reserved=Number((await c.query('select coalesce(sum(reserved_nanodollars),0)::text as n from board_model_budget_reservations')).rows[0].n)/1e9;
  const maxima=Object.fromEntries(baselineModels.map(m=>[m,cases.reduce((sum,item)=>sum+item.arms.find(a=>a.model===m)!.maximumUSD,0)]));
  const manifest={status:'prepared_not_run',policy:baselinePolicy,policyHash:hash(baselinePolicy),models:baselineModels,reasoning:'medium',maxOutputTokens:baselineMaxOutputTokens,method:'Both models receive identical criteria-only prompts and full source text. No historical labels, role exceptions, or few-shot references enter either request. Expected judgments are separate scoring metadata. Freeze before running; do not tune on results.',caseCount:cases.length,maximaUSD:maxima,totalMaximumUSD:Object.values(maxima).reduce((a,b)=>a+b,0),existingReservationsUSD:reserved,remainingAuthorizedUSD:Math.max(0,1-reserved),cases,missing:prior.missing,scoring:'Report explicit-current-source negatives separately from the one historical positive with matching archived capture and other historical positive diagnostics. Do not present text-unverified historical labels as a clean accuracy benchmark. Keep abstentions, semantic disagreements and operational failures separate.'};
  await writeFile(resolve(root,'research/capability-baseline-prepared-2026-10-29.json'),JSON.stringify(manifest,null,2)+'\n');
  await writeFile(resolve(root,'research/capability-baseline-policy-2026-10-29.txt'),baselinePolicy+'\n');
  console.log(JSON.stringify({status:manifest.status,cases:cases.length,maximaUSD:maxima,totalMaximumUSD:manifest.totalMaximumUSD,remainingAuthorizedUSD:manifest.remainingAuthorizedUSD,labelEvidence:cases.reduce((acc:any,row)=>{acc[row.labelEvidence]=(acc[row.labelEvidence]??0)+1;return acc;},{})}));
}finally{await c.end()}
