import {z} from 'zod';
import {decode} from 'he';
import robotsParser from 'robots-parser';
import {safeEmployerHtml,readEmployerFeed} from './employer-recheck.js';
import {digest,postingIdentity} from './review-history.js';
export const SourceSchema=z.object({provider:z.enum(['ashby','greenhouse','lever']),slug:z.string().regex(/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/)});
export type DiscoverySource=z.infer<typeof SourceSchema>&{id:string;provenance:unknown;last_checked_at?:string|Date|null};
export function publicApiRobots(endpoint:string,status:number,body:string){
  // RFC 9309 §2.3.1.3: a robots 4xx is unavailable, not an access rule for the API.
  // Actual API authentication errors still fail the request; no access controls are bypassed.
  if(status>=400&&status<500&&status!==429)return {allowed:true,delay:1000};
  if(status!==200||/<html/i.test(body))return {allowed:false,delay:1000};
  const parser=robotsParser(new URL('/robots.txt',endpoint).href,body),delay=Math.max(1,parser.getCrawlDelay('JobsAIBuilderDiscovery')??0)*1000;
  return {allowed:parser.isAllowed(endpoint,'JobsAIBuilderDiscovery')!==false&&delay<=60000,delay};
}
export function discoveryUrlIdentity(url:string){const u=new URL(url);const gh=u.searchParams.get('gh_jid');return gh&&/^\d+$/.test(gh)?`greenhouse-custom:${u.hostname}:${gh}`:postingIdentity(url,'');}
export function sourceEndpoint(source:DiscoverySource){
  SourceSchema.parse(source);
  return source.provider==='ashby'?`https://api.ashbyhq.com/posting-api/job-board/${source.slug}?includeCompensation=true`:source.provider==='greenhouse'?`https://boards-api.greenhouse.io/v1/boards/${source.slug}/jobs?content=true`:`https://api.lever.co/v0/postings/${source.slug}?mode=json`;
}
export function sourceFromUrl(url:string):{provider:DiscoverySource['provider'];slug:string}|null{
  try{const u=new URL(url),parts=u.pathname.split('/').filter(Boolean);let provider:DiscoverySource['provider'];
    if(u.hostname==='jobs.ashbyhq.com')provider='ashby';
    else if(['boards.greenhouse.io','job-boards.greenhouse.io'].includes(u.hostname))provider='greenhouse';
    else if(u.hostname==='jobs.lever.co')provider='lever';else return null;
    return SourceSchema.parse({provider,slug:parts[0]});
  }catch{return null;}
}
const clean=(html:string)=>decode(safeEmployerHtml(html).replace(/<\/(?:p|li|h4|ul|ol)>|<br\s*\/?\s*>/g,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').trim();
export function retrievalSignals(title:string,html:string,location:string){
  const body=clean(html),all=title+'\n'+body;
  const namedTool=/Claude\s*Code|Cursor|\bCodex\b|\bLovable\b|\bv0\b|\bReplit\b|\bBolt\.new\b/i;
  const ai=/\bAI\b|\bLLMs?\b|artificial intelligence|generative|agentic/i.test(all)||namedTool.test(all);
  const build=/\b(?:build|building|built|ship|shipping|prototype|prototyping|implement|develop)\b.{0,110}\b(?:software|code|tools|products|features|applications|apps|agents|workflows|automations?|prototypes)\b/i.test(body);
  const ownership=/\b(?:own|identify|define|prioriti[sz]e|discover)\b.{0,100}\b(?:problems?|opportunities|outcomes|needs|solutions|products|workflows)\b|end.to.end|from (?:idea|concept).{0,45}(?:launch|production|use)|0.to.1/i.test(body);
  const explicitBuilder=/\bbuilder\b|\bproduct engineer\b|\bdesign engineer\b|\bcreative technologist\b|\bprototyper\b/i.test(title);
  const direct=/\b(?:you|yourself|personally)\b.{0,90}\b(?:build|ship|prototype|code)\b/i.test(body);
  const evidence=body.split(/\n|(?<=[.!?])\s+/).filter(s=>namedTool.test(s)||/personally|yourself|end.to.end|build and ship|no.{0,20}engineering/i.test(s)).slice(0,5).map(s=>s.slice(0,350));
  const foreignLocation=/(?<!New )\bMexico\b|\b(?:India|Bengaluru|Gurugram|Gurgaon|Hyderabad|Pune|Mumbai|New Delhi|Noida|Chennai|Kolkata|London|United Kingdom|Germany|Berlin|France|Paris|Canada|Toronto|Australia|Singapore|Budapest|Estonia|Tallinn|Chile|Turkey|Kochi|Kerala|Brazil|Argentina)\b/i.test(location);
  const locationHint=/\b(?:United States|USA|US|U\.S\.)\b/i.test(location)?'us_indicated' as const:foreignLocation?'non_us_indicated' as const:'unknown' as const;
  return {retain:(ai&&build)||(explicitBuilder&&ai),score:(explicitBuilder?45:0)+(namedTool.test(all)?25:0)+(ownership?15:0)+(direct?10:0)+(build?5:0)+(locationHint==='us_indicated'?3:0),signals:{ai,build,ownership,direct,explicitBuilder,namedAiTool:namedTool.test(all),evergreenHint:/talent pool|general application|expression of interest|future opportunities|talent community/i.test(title),evidence,method:'permissive-retrieval-v2',fit:'unassessed'},locationHint};
}
export function parseDiscoveryFeed(payload:unknown,source:DiscoverySource){
  const jobs=source.provider==='lever'?z.array(z.record(z.unknown())).parse(payload):z.object({jobs:z.array(z.record(z.unknown()))}).parse(payload).jobs;
  let malformed=0,unlisted=0;
  const records=jobs.flatMap(job=>{
    if(!['string','number'].includes(typeof job.id)){malformed++;return [];}
    if(source.provider==='ashby'&&job.isListed!==true){if(job.isListed===false)unlisted++;else malformed++;return [];}
    try{
      const id=String(job.id);let snapshot:Record<string,unknown>;
      if(source.provider==='lever'){
        const title=z.string().min(1).parse(job.text),url=z.string().url().parse(job.hostedUrl);
        const lists=Array.isArray(job.lists)?job.lists as {text?:string;content?:string}[]:[];
        const descriptionHtml=safeEmployerHtml([job.description,...lists.map(list=>`<h4>${list.text??''}</h4>${list.content??''}`),job.additional].filter(v=>typeof v==='string').join('\n'));
        if(clean(descriptionHtml).length<100)throw new Error('Incomplete description');
        snapshot={title,descriptionHtml,location:job.categories??null,secondaryLocations:[],workplaceType:job.workplaceType??null,isRemote:null,compensation:job.salaryRange??null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:url,applyUrl:job.applyUrl??url};
      }else snapshot=readEmployerFeed({jobs:[job]},source.provider,id)!;
      const url=z.string().url().refine(s=>s.startsWith('https://')).parse(snapshot.canonicalUrl);
      const location=typeof snapshot.location==='string'?snapshot.location:source.provider==='greenhouse'?String((snapshot.location as {name?:string})?.name??''):String((snapshot.location as {location?:string})?.location??'');
      const secondary=Array.isArray(snapshot.secondaryLocations)?snapshot.secondaryLocations.map(item=>String(item?.location??'')).filter(Boolean):[];
      const displayLocation=[location,...secondary].filter(Boolean).join('; ');
      const retrieval=retrievalSignals(String(snapshot.title),String(snapshot.descriptionHtml),displayLocation);
      const identity=`${source.provider}:${source.slug.toLowerCase()}:${id}`;
      return [{id:digest(identity).slice(0,32),identity,canonicalIdentity:discoveryUrlIdentity(url),employerId:id,url,title:String(snapshot.title),location:displayLocation,snapshot,hash:digest(JSON.stringify(snapshot)),...retrieval}];
    }catch{malformed++;return [];}
  });
  return {total:jobs.length,malformed,unlisted,records};
}
export function selectDiscoverySources(sources:DiscoverySource[],size:number,seed:string){
  const score=(s:DiscoverySource)=>[s.last_checked_at?1:0,(s.provenance as {origin?:string})?.origin==='reviewed_history'?0:(s.provenance as {origin?:string})?.origin==='prior_discovery'?1:2,s.last_checked_at?new Date(s.last_checked_at).toISOString():'',digest(seed+s.id)] as const;
  const compare=(a:DiscoverySource,b:DiscoverySource)=>{const x=score(a),y=score(b);return x[0]-y[0]||x[1]-y[1]||x[2].localeCompare(y[2])||x[3].localeCompare(y[3]);};
  const groups={ashby:sources.filter(s=>s.provider==='ashby').sort(compare),greenhouse:sources.filter(s=>s.provider==='greenhouse').sort(compare),lever:sources.filter(s=>s.provider==='lever').sort(compare)};
  const selected:DiscoverySource[]=[];
  // Broad Ashby/Greenhouse coverage with an exploratory Lever lane; no alphabetic or volume-only sampling.
  const rotation=['ashby','greenhouse','ashby','greenhouse','ashby','greenhouse','ashby','greenhouse','lever','ashby'] as const;
  while(selected.length<size&&Object.values(groups).some(list=>list.length))for(const provider of rotation){const next=groups[provider].shift();if(next)selected.push(next);if(selected.length>=size)break;}
  return selected;
}
export function selectDailyDiscoverySources(sources:DiscoverySource[],size:number,seed:string){
  const known=sources.filter(s=>(s.provenance as {origin?:string})?.origin!=='public_directory');
  const exploratory=sources.filter(s=>(s.provenance as {origin?:string})?.origin==='public_directory');
  const knownSize=Math.ceil(size*0.6);
  const first=selectDiscoverySources(known,knownSize,seed);
  const second=selectDiscoverySources(exploratory,size-first.length,seed);
  const chosen=new Set([...first,...second].map(s=>s.id));
  return [...first,...second,...selectDiscoverySources(sources.filter(s=>!chosen.has(s.id)),size-first.length-second.length,seed)];
}
