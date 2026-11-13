import { decode } from 'he';
import { JobSchema, type Job } from './catalog.js';
import { safeEmployerHtml, readEmployerFeed, employerTarget } from './employer-recheck.js';
import { digest } from './review-history.js';

export type EmployerSnapshot=NonNullable<ReturnType<typeof readEmployerFeed>>;
export type Observation=
  | {kind:'open';snapshot:EmployerSnapshot;note:string}
  | {kind:'missing';note:string}
  | {kind:'closed';note:string}
  | {kind:'unknown';note:string};
export type SourceResponse={status:number;text:string;data:unknown};
export type SourceGet=(endpoint:string)=>Promise<SourceResponse>;
const text=(value:string)=>decode(safeEmployerHtml(value).replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
function stable(value:unknown):unknown {
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,stable(v)]));
  return value??null;
}
function comparable(snapshot:EmployerSnapshot) {
  // Repost timestamps, tracking URLs and provider formatting do not change role fit.
  return {title:text(snapshot.title),description:text(snapshot.descriptionHtml),location:stable(snapshot.location),secondaryLocations:stable(snapshot.secondaryLocations),workplaceType:snapshot.workplaceType,isRemote:snapshot.isRemote,compensation:stable(snapshot.compensation),metadata:stable(snapshot.metadata)};
}
export function changedFields(before:EmployerSnapshot,after:EmployerSnapshot) {
  const a=comparable(before),b=comparable(after);
  return (Object.keys(a) as (keyof typeof a)[]).filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));
}
export function observationHash(snapshot:EmployerSnapshot){return digest(JSON.stringify(comparable(snapshot)));}

export async function observeEmployerRole(url:string,title:string,get:SourceGet,now=Date.now()):Promise<Observation> {
  try {
    const target=employerTarget(url),response=await get(target.endpoint);
    if(response.status!==200)return {kind:'unknown',note:`Source returned HTTP ${response.status}; no closure inferred`};
    if(target.kind!=='page') {
      if(target.kind==='bamboohr'){
        const job=(response.data as any)?.result?.jobOpening;
        if(job?.jobOpeningStatus==='Closed'&&String(job.jobOpeningShareUrl??'').match(new RegExp(`/careers/${target.id}(?:$|[?/#])`)))return {kind:'closed',note:'Exact BambooHR posting is explicitly Closed'};
      }
      const snapshot=readEmployerFeed(response.data,target.kind,target.id);
      if(snapshot)return {kind:'open',snapshot,note:'Exact posting ID is present in a complete employer feed'};
      const jobs=Array.isArray(response.data)?response.data:(response.data as {jobs?:Record<string,unknown>[]}).jobs??[];
      const job=jobs.find((job:any)=>String(job.id)===target.id);
      if(target.kind==='ashby'&&job?.isListed===false)return {kind:'closed',note:'Employer feed explicitly marks the exact posting as unlisted'};
      // A valid feed plus a second authoritative missing-posting signal is required.
      const confirmation=target.kind==='greenhouse'?target.endpoint.replace(/\/jobs\?.*$/,`/jobs/${target.id}`):url;
      const detail=await get(confirmation);
      if(detail.status===404||detail.status===410)return {kind:'closed',note:`Exact posting absent from a complete feed and ${target.kind==='greenhouse'?'employer posting API':'canonical employer posting'} returned HTTP ${detail.status}`};
      return {kind:'missing',note:'Posting absent from a complete feed; closure is unconfirmed'};
    }
    const flatten=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.flatMap(flatten):value&&typeof value==='object'?[value as Record<string,unknown>,...flatten((value as Record<string,unknown>)['@graph'])]:[];
    const postings=[...response.text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match=>{try{return flatten(JSON.parse(match[1]));}catch{return [];}}).filter(p=>p['@type']==='JobPosting');
    const exact=postings.find(p=>String(p.title??'').trim().toLowerCase()===title.trim().toLowerCase());
    if(exact&&typeof exact.description==='string'){
      const expiryValue=String(exact.validThrough??'');
      // A date-only expiry includes that calendar day; do not withdraw at its start.
      const expiry=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(expiryValue)?expiryValue+'T23:59:59.999Z':expiryValue);
      if(Number.isFinite(expiry)&&expiry<now)return {kind:'closed',note:'Exact employer JobPosting has an explicit past expiry'};
      const descriptionHtml=safeEmployerHtml(exact.description);
      if(text(descriptionHtml).length>=100)return {kind:'open',note:'Exact employer JobPosting title and full text verified',snapshot:{title:String(exact.title),descriptionHtml,text:text(descriptionHtml),location:exact.jobLocation,secondaryLocations:[],workplaceType:exact.jobLocationType??null,isRemote:exact.jobLocationType==='TELECOMMUTE',compensation:exact.baseSalary??null,metadata:[],originalPublishedAt:exact.datePosted??null,lastPublishedAt:null,canonicalUrl:url,applyUrl:url}};
    }
    return {kind:'unknown',note:'Employer page needs manual verification; HTTP 200 or a page title alone is insufficient'};
  }catch{return {kind:'unknown',note:'Source request, budget, or parsing failed; no closure inferred'};}
}

export function maintenancePlan(job:Job,baseline:EmployerSnapshot,observation:Observation,failures:number,now=Date.now()) {
  const checkedAt=new Date(now).toISOString();
  if(observation.kind==='unknown'||observation.kind==='missing'){
    const count=failures+1;
    return {outcome:observation.kind==='missing'?'closure_pending' as const:'retry' as const,record:job,changed:[] as string[],failures:count,nextCheckAt:new Date(now+Math.min(24,2**Math.min(count,5))*3600000).toISOString()};
  }
  if(observation.kind==='closed')return {outcome:'closed' as const,record:JobSchema.parse({...job,status:'closed'}),changed:[] as string[],failures:0,nextCheckAt:checkedAt};
  const changed=changedFields(baseline,observation.snapshot);
  if(changed.length||job.status==='draft')return {outcome:'needs_review' as const,record:JobSchema.parse({...job,status:'draft'}),changed,failures:0,nextCheckAt:new Date(now+86400000).toISOString()};
  return {outcome:'refreshed' as const,record:JobSchema.parse({...job,checkedAt}),changed,failures:0,nextCheckAt:new Date(now+86400000).toISOString()};
}
