// Public employer reads only. No model API calls or publication.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {plainDescription} from '../../packages/core/src/prototype/assessment.js';
import {buildBuilderPromptV10,builderPolicyV10} from '../../apps/board/src/builder-prompt.js';
const root=resolve(import.meta.dirname,'../..');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const checkedAt=new Date().toISOString();
const targets=[
  {company:'Artera',provider:'lever',slug:'artera-2',id:'eae88c70-fbf5-4525-890c-d3f9377418b0'},
  {company:'BioRender',provider:'cached_ashby',slug:'biorender-inc',id:'6e7f4b8d-f068-4d11-964d-da74b1c53b8c'},
  {company:'Fluidstack',provider:'ashby',slug:'fluidstack',id:'0337be3a-3844-4832-9078-b098bdefd736'},
  {company:'Alt',provider:'ashby',slug:'alt',id:'f049b9f7-26eb-4f92-8ca6-6ab9ae31c0f1'},
  {company:'Level AI',provider:'ashby',slug:'level-ai',id:'ba2b8d96-a353-4cbe-a3ef-0cb749781dcd'},
  {company:'Kettle',provider:'greenhouse',slug:'kettle',id:'8885210002'},
  {company:'PlanetScale',provider:'greenhouse',slug:'planetscale',id:'4463390009'},
  {company:'Ramp',provider:'ashby',slug:'ramp',id:'b68aca53-16c0-4ced-ab1d-e8beb2940b4f'},
  {company:'MongoDB',provider:'cached_greenhouse',slug:'mongodb',id:'8129885'},
  {company:'OnePay',provider:'ashby',slug:'oneapp',id:'fbc0f334-5613-41fc-b5d7-87f2e5a20bee'},
  {company:'HomeSmart Services',provider:'cached_bamboohr',slug:'homesmartservices',id:'1116'},
  {company:'Onos Health',provider:'ashby',slug:'onoshealth',id:'58d36bae-5153-471a-9c8c-2094339be001'},
];
const priorUrls=new Set<string>();
const normalize=(url:string)=>url.split('?')[0].replace(/\/$/,'');
const references=JSON.parse(await readFile(resolve(root,'packages/core/src/prototype/references.json'),'utf8'));
for(const r of references)if(r.url)priorUrls.add(normalize(r.url));
const requests:any[]=[];
const path=resolve(root,'research/v10-fresh-review-2026-10-29-sources.json');
try{await readFile(path);throw new Error('Batch already frozen; do not recollect or overwrite');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
const preflight={status:'selected_before_assessment',promptVersion:'builder-fit-v10',policyHash:hash(builderPolicyV10),targets,selection:'Purposive U.S. challenge batch: title-ranked unreviewed saved candidates plus employer-verified BioRender, MongoDB and HomeSmart leads. No prior model assessments used to select. Not representative discovery precision or recall. OnePay and MongoDB intentionally test title/mandate boundaries.',apiModelCalls:0,maximumNewEmployerRequests:9};
await writeFile(resolve(root,'research/v10-fresh-review-2026-10-29-selection.json'),JSON.stringify(preflight,null,2)+'\n');
async function get(url:string){
  if(requests.length>=9)throw new Error('Employer request bound exceeded');
  const record:any={url,startedAt:new Date().toISOString()};requests.push(record);
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});record.status=response.status;
  if(!response.ok)throw new Error('Employer HTTP '+response.status);
  return response.json();
}
const sources=[];
for(const [i,t] of targets.entries()){
  let job:any,descriptionHtml:string,url:string,title:string,location:any,compensation:any,sourceUrl:string,postedAt:string|null=null;
  if(t.provider.includes('ashby')){
    sourceUrl=`https://api.ashbyhq.com/posting-api/job-board/${t.slug}?includeCompensation=true`;
    const data=t.provider==='cached_ashby'?JSON.parse(await readFile('/tmp/builder-resolved-0.json','utf8')):await get(sourceUrl);
    job=data.jobs.find((j:any)=>j.id===t.id&&j.isListed===true);if(!job)throw new Error('Exact listed Ashby role absent: '+t.company);
    descriptionHtml=job.descriptionHtml;url=job.jobUrl;title=job.title;location={primary:job.location,secondary:job.secondaryLocations,workplaceType:job.workplaceType,isRemote:job.isRemote};compensation=job.compensation;postedAt=job.publishedAt;
  }else if(t.provider==='lever'){
    sourceUrl=`https://api.lever.co/v0/postings/${t.slug}/${t.id}?mode=json`;job=await get(sourceUrl);
    if(job.id!==t.id)throw new Error('Lever identity differs');
    descriptionHtml=[job.description||job.descriptionBody,job.additional,...(job.lists??[]).map((l:any)=>`<h3>${l.text}</h3>${l.content}`)].filter(Boolean).join('\n');url=job.hostedUrl;title=job.text;location={...job.categories,allLocations:job.categories?.allLocations,workplaceType:job.workplaceType};compensation=job.salaryRange??job.salaryDescription??null;postedAt=job.createdAt?new Date(job.createdAt).toISOString():null;
  }else if(t.provider.includes('greenhouse')){
    sourceUrl=`https://boards-api.greenhouse.io/v1/boards/${t.slug}/jobs/${t.id}`;job=t.provider==='cached_greenhouse'?JSON.parse(await readFile('/tmp/builder-fresh-probe-3.txt','utf8')):await get(sourceUrl);
    if(String(job.id)!==t.id)throw new Error('Greenhouse identity differs');
    descriptionHtml=job.content;url=job.absolute_url;title=job.title;location=job.location;compensation=job.pay_input_ranges??null;postedAt=job.first_published??null;
  }else{
    sourceUrl='https://homesmartservices.bamboohr.com/careers/1116/detail';job=JSON.parse(await readFile('/tmp/builder-resolved-1.json','utf8')).result.jobOpening;
    descriptionHtml=job.description;url=job.jobOpeningShareUrl;title=job.jobOpeningName;location={location:job.location,locationType:job.locationType};compensation=job.compensation;postedAt=job.datePosted;
  }
  if(!url||priorUrls.has(normalize(url)))throw new Error('Missing URL or previously reviewed exact posting: '+t.company);
  const description=plainDescription(descriptionHtml);if(description.length<1000)throw new Error('Incomplete employer description: '+t.company);
  sources.push({reviewId:`T${String(i+1).padStart(2,'0')}`,company:t.company,title,url,sourceUrl,provider:t.provider.replace('cached_',''),employerPostingId:t.id,checkedAt,postedAt,location,compensation,description,sourceHash:hash(descriptionHtml),normalizedHash:hash(description),promptHash:hash(buildBuilderPromptV10({company:t.company}).instructions)});
  console.log(JSON.stringify({reviewId:sources.at(-1)!.reviewId,company:t.company,title,characters:description.length}));
}
await writeFile(path,JSON.stringify({...preflight,status:'source_frozen_before_predictions',checkedAt,requests,cachedReads:['/tmp/builder-resolved-0.json','/tmp/builder-resolved-1.json','/tmp/builder-fresh-probe-3.txt'],probes:'Additional employer probes were public read-only requests: BioRender old slug 404, company careers page resolved biorender-inc; HomeSmart page/list/detail; OneDigital detail API 403 and excluded. No closure inferred from access failure.',sources},null,2)+'\n');
