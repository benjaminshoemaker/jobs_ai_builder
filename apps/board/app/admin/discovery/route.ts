import {auth,isAdmin} from '../../../src/auth';
import {adminPage} from '../../../src/admin-page';
import {database} from '../../../src/store';
import {sameOrigin} from '../../../src/request';
import {candidateQueueData,candidateDetail,saveCandidateReview,CandidateReviewError} from '../../../src/candidate-review-store';
import {makeReviewQueue,makeDailyReviewQueue,readReviewToken,FeedbackSchema} from '../../../src/candidate-review';
import {automaticPublishCandidate} from '../../../src/automatic-publication';
import {candidateReviewPage} from '../../../src/candidate-review-page';
import {escapeHtml as esc} from '../../../src/web';
import type {PriorSwe} from '../../../src/prior-swe';
export const dynamic='force-dynamic';
export const maxDuration=90;
const sweValues=['open','required','unclear'] as const;
function filters(params:URLSearchParams){
  const explicit=params.has('swe_filter')||params.has('swe');
  return {provider:['ashby','greenhouse','lever'].includes(params.get('provider')??'')?params.get('provider')!:'all',scope:params.get('scope')==='all'?'all':'us_or_unknown',lane:['priority','uncertain','negative_audit','exploration','evaluation','reviewed'].includes(params.get('lane')??'')?params.get('lane')!:'mixed',swe:explicit?[...new Set(params.getAll('swe').filter((value):value is PriorSwe=>sweValues.includes(value as PriorSwe)))]:['open','unclear'] as PriorSwe[]};
}
function filterQuery(f:ReturnType<typeof filters>){const query=new URLSearchParams({provider:f.provider,scope:f.scope,lane:f.lane,swe_filter:'1'});for(const value of f.swe)query.append('swe',value);return query;}
export async function GET(request:Request){
  try{
    const {data}=await auth().getSession();if(!data?.user)return Response.redirect(new URL('/admin/login',request.url),303);
    if(!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const params=new URL(request.url).searchParams,f=filters(params),db=database();
    const result=await candidateQueueData(db,f.provider,f.scope,f.lane==='reviewed',true);
    const all=result.all.filter(row=>f.swe.includes(row.prior_swe??'unclear'));
    const eligible=result.eligible.filter(row=>f.swe.includes(row.prior_swe??'unclear'));
    const queue=f.lane==='mixed'?makeDailyReviewQueue(eligible):makeReviewQueue(eligible,f.lane),requested=params.get('candidate');
    const selectedId=requested&&result.all.some(row=>row.id===requested)?requested:queue[0]?.id;
    const selected=selectedId?await candidateDetail(db,selectedId):null;
    const counts=await db.query('select purpose,count(*)::int as n from board_candidate_reviews group by purpose');
    const feedback={calibration:0,evaluation:0};for(const row of counts.rows)feedback[row.purpose as keyof typeof feedback]=row.n;
    return candidateReviewPage({all,eligible,queue,selected,...f,actor:data.user.id,secret:process.env.NEON_AUTH_COOKIE_SECRET!,saved:params.get('saved'),published:params.get('published')==='yes',closed:params.get('closed')==='yes',feedback});
  }catch{return adminPage('<h1>Discovery temporarily unavailable</h1>',503);}
}
export async function POST(request:Request){
  if(!sameOrigin(request))return adminPage('<h1>Request rejected</h1>',403);
  try{
    const {data}=await auth().getSession();if(!data?.user||!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const formData=await request.formData(),form=Object.fromEntries(formData);let token;
    try{token=readReviewToken(String(form.token??''),process.env.NEON_AUTH_COOKIE_SECRET!,data.user.id);}catch{return adminPage('<h1>Review page expired</h1><p>Reload the job before saving.</p>',409);}
    const parsed=FeedbackSchema.safeParse({decision:form.decision,note:form.note??'',focus:form.focus??'',engineering:form.engineering??''});
    if(!parsed.success)return adminPage('<h1>Decision not saved</h1><p>Choose Yes, No or Maybe and keep the optional reason under 4,000 characters. Use Back to keep your edits.</p>',422);
    const client=await database().connect();let draftId:string|undefined;let publicationStatus:'published'|'held'|'closed'='held';let automaticError=false;
    try{
      try{await client.query('begin');await saveCandidateReview(client,token,parsed.data);await client.query('commit');}catch(error){await client.query('rollback');throw error;}
      if(parsed.data.decision==='yes'){
        draftId=(await client.query('select job_id from board_candidate_drafts where candidate_id=$1',[token.id])).rows[0]?.job_id;
        if(draftId)try{publicationStatus=(await automaticPublishCandidate(client,draftId,data.user.id,{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY})).status;}catch{automaticError=true;/* Fit and hidden draft were committed; show the held exception. */}
      }
    }finally{client.release();}
    if(draftId&&publicationStatus==='held')return Response.redirect(new URL('/admin/maintenance/'+draftId+'?saved=held'+(automaticError?'&auto=failed':''),request.url),303);
    const current=new URLSearchParams({provider:String(form.provider??''),scope:String(form.scope??''),lane:String(form.lane??'')});
    if(formData.has('swe_filter'))current.set('swe_filter','1');
    for(const value of formData.getAll('swe'))if(typeof value==='string')current.append('swe',value);
    const f=filters(current),query=filterQuery(f);
    query.set('saved',parsed.data.decision);
    if(publicationStatus==='published')query.set('published','yes');
    if(publicationStatus==='closed')query.set('closed','yes');
    if(f.lane==='reviewed')query.set('candidate',token.id);
    return Response.redirect(new URL('/admin/discovery?'+query+'#selected-title',request.url),303);
  }catch(error){if(error instanceof CandidateReviewError)return adminPage(`<h1>Decision not saved</h1><p>${esc(error.message)}</p><p><a href="/admin/discovery">Reload review queue</a></p>`,error.status);return adminPage('<h1>Decision could not be saved</h1><p>Check saved decisions before retrying.</p>',503);}
}
