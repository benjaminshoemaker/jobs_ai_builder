import sanitizeHtml from 'sanitize-html';
import { decode } from 'he';
export function safeEmployerHtml(html: string) {
  const decoded = /&lt;\/?(?:p|div|h[1-6]|ul|li)\b/i.test(html) ? decode(html) : html;
  return sanitizeHtml(decoded, { allowedTags: ['p','ul','ol','li','strong','em','b','i','br','blockquote','hr','h4'], allowedAttributes: {}, transformTags: { h1:'h4',h2:'h4',h3:'h4',h5:'h4',h6:'h4' } });
}
export function employerTarget(url: string) {
  const u = new URL(url);
  const ashby = u.hostname === 'jobs.ashbyhq.com' && u.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (ashby) return { kind:'ashby', id:ashby[2], endpoint:`https://api.ashbyhq.com/posting-api/job-board/${ashby[1]}?includeCompensation=true` };
  const lever=u.hostname==='jobs.lever.co'&&u.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if(lever)return {kind:'lever',id:lever[2],endpoint:`https://api.lever.co/v0/postings/${lever[1]}?mode=json`};
  const bamboo=u.hostname.match(/^([a-z0-9-]+)\.bamboohr\.com$/)&&u.pathname.match(/^\/careers\/(\d+)\/?$/);
  if(bamboo)return {kind:'bamboohr',id:bamboo[1],endpoint:`https://${u.hostname}/careers/${bamboo[1]}/detail`};
  const gh = /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/.test(u.hostname) && u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  if (gh) return { kind:'greenhouse', id:gh[2], endpoint:`https://boards-api${u.hostname.includes('.eu.')?'.eu':''}.greenhouse.io/v1/boards/${gh[1]}/jobs?content=true` };
  if (u.hostname === 'amperity.com' && u.searchParams.get('gh_jid')) return { kind:'greenhouse', id:u.searchParams.get('gh_jid')!, endpoint:'https://boards-api.greenhouse.io/v1/boards/amperity/jobs?content=true' };
  if (u.hostname === 'www.exiger.com' && u.searchParams.get('gh_jid')) return { kind:'greenhouse', id:u.searchParams.get('gh_jid')!, endpoint:'https://boards-api.greenhouse.io/v1/boards/exiger/jobs?content=true' };
  if(u.hostname==='www.mongodb.com'&&u.searchParams.get('gh_jid'))return {kind:'greenhouse',id:u.searchParams.get('gh_jid')!,endpoint:'https://boards-api.greenhouse.io/v1/boards/mongodb/jobs?content=true'};
  return { kind:'page', id:u.pathname, endpoint:url };
}
export function readEmployerFeed(payload: unknown, kind: string, id: string) {
  if(kind==='bamboohr'){
    const job=(payload as any)?.result?.jobOpening;
    if(!job||job.jobOpeningStatus!=='Open'||!String(job.jobOpeningShareUrl??'').match(new RegExp(`/careers/${id}(?:$|[?/#])`)))throw new Error('Exact open BambooHR posting not verified');
    const descriptionHtml=safeEmployerHtml(job.description??'');if(descriptionHtml.length<100)throw new Error('Incomplete employer text');
    return {title:String(job.jobOpeningName),descriptionHtml,text:decode(sanitizeHtml(descriptionHtml,{allowedTags:[],allowedAttributes:{}})),location:job.location,secondaryLocations:[],workplaceType:job.locationType==='2'?'Hybrid':null,isRemote:null,compensation:job.compensation??null,metadata:[],originalPublishedAt:job.datePosted??null,lastPublishedAt:null,canonicalUrl:String(job.jobOpeningShareUrl),applyUrl:String(job.jobOpeningShareUrl)};
  }
  if(kind==='lever'){
    if(!Array.isArray(payload)||payload.some(j=>typeof j?.id!=='string'))throw new Error('Incomplete Lever feed');
    const job=payload.find(j=>j.id===id);if(!job)return null;
    const descriptionHtml=safeEmployerHtml([job.description||job.descriptionBody,...(job.lists??[]).map((l:any)=>`<h4>${l.text??''}</h4>${l.content??''}`),job.additional].filter(Boolean).join('\n'));
    if(!job.text||descriptionHtml.length<100)throw new Error('Incomplete Lever description');
    return {title:String(job.text),descriptionHtml,text:decode(sanitizeHtml(descriptionHtml,{allowedTags:[],allowedAttributes:{}})),location:job.categories??null,secondaryLocations:[],workplaceType:job.workplaceType??null,isRemote:null,compensation:job.salaryRange??null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:String(job.hostedUrl),applyUrl:String(job.applyUrl??job.hostedUrl)};
  }
  const p = payload as { jobs?: Record<string,unknown>[] };
  if (!Array.isArray(p?.jobs) || p.jobs.some(job => !job || typeof job !== 'object' || !['string','number'].includes(typeof job.id))) throw new Error('Incomplete or malformed employer feed');
  const job = p.jobs.find(job => String(job.id) === id);
  if (job && kind === 'ashby' && typeof job.isListed !== 'boolean') throw new Error('Employer listing visibility is missing');
  if (!job || (kind === 'ashby' && job.isListed !== true)) return null;
  const title = String(job.title ?? '');
  const raw = String(kind === 'ashby' ? job.descriptionHtml ?? '' : job.content ?? '');
  const descriptionHtml = safeEmployerHtml(raw);
  const text = kind === 'ashby' && job.descriptionPlain ? String(job.descriptionPlain) : decode(sanitizeHtml(descriptionHtml,{allowedTags:[],allowedAttributes:{}}));
  if (!title || descriptionHtml.length < 100 || text.length < 100) throw new Error('Incomplete employer description');
  return { title, descriptionHtml, text, location:job.location, secondaryLocations:job.secondaryLocations??[], workplaceType:job.workplaceType??null, isRemote:job.isRemote??null, compensation:job.compensation??null, metadata:job.metadata??[], originalPublishedAt:kind==='greenhouse'?job.first_published??null:null, lastPublishedAt:kind==='ashby'?job.publishedAt??null:null, canonicalUrl:kind==='ashby'?job.jobUrl:job.absolute_url, applyUrl:kind==='ashby'?job.applyUrl:job.absolute_url };
}
