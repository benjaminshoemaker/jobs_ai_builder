import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { employerTarget, readEmployerFeed, safeEmployerHtml } from '../src/employer-recheck.js';
import { digest } from '../src/review-history.js';
import { readCatalog } from '../src/catalog.js';
import { resolve } from 'node:path';
if (!process.argv.includes('--live')) throw new Error('Explicit --live is required');
if (process.env.VERCEL_ENV === 'production') throw new Error('Preview/development rechecks only');
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
const run=randomUUID(), limit=40;let requests=0;
const cache=new Map<string,Promise<{status:number;data:unknown;text:string;finalUrl:string}>>();
async function get(endpoint:string) {
  if (!cache.has(endpoint)) cache.set(endpoint,(async()=>{
    if(requests>=limit)throw new Error('Run request budget exhausted');
    requests++;await client.query('insert into board_history_requests(run_id,sequence,endpoint) values ($1,$2,$3)',[run,requests,endpoint]);
    const r=await fetch(endpoint,{signal:AbortSignal.timeout(20000),redirect:'manual',headers:{Accept:'application/json,text/html'}});
    const text=await r.text();let data:unknown;try{data=JSON.parse(text);}catch{data=null;}
    return {status:r.status,data,text,finalUrl:r.url};
  })());
  return cache.get(endpoint)!;
}
try {
  const prior=await client.query("select count(*)::int as n from board_history_recheck_runs where started_at > now()-interval '24 hours'");
  if(prior.rows[0].n>=2)throw new Error('Two history-recheck runs per 24 hours maximum');
  await client.query('insert into board_history_recheck_runs(id,max_requests) values ($1,$2)',[run,limit]);
  const {rows:roles}=await client.query("select * from board_review_roles where decision='approved' order by id");
  const samples=await readCatalog(resolve(import.meta.dirname,'../catalog/jobs.json'));
  const summary:unknown[]=[];
  for(const role of roles){
    let outcome='unknown',note='Employer identity or current availability requires verification';let snapshot:ReturnType<typeof readEmployerFeed>|null=null;
    if(role.canonical_url)try{
      const target=employerTarget(role.canonical_url);const r=await get(target.endpoint);
      if(r.status!==200)note=`Employer source returned HTTP ${r.status}; availability unknown`;
      else if(target.kind!=='page'){
        snapshot=readEmployerFeed(r.data,target.kind,target.id);
        outcome=snapshot?'open':'not_listed';note=snapshot?'Exact employer posting ID is listed in the current public feed':'Exact posting is absent from a successful employer feed; withheld pending closure confirmation';
      }else{
        const scripts=[...r.text.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
        const flatten=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.flatMap(flatten):v&&typeof v==='object'?[v as Record<string,unknown>,...flatten((v as Record<string,unknown>)['@graph'])]:[];
        const postings=scripts.flatMap(m=>{try{return flatten(JSON.parse(m[1]));}catch{return [];}}).filter(p=>p['@type']==='JobPosting');
        const exact=postings.find(p=>String(p.title??'').trim().toLowerCase()===role.title.trim().toLowerCase());
        if(exact&&typeof exact.description==='string'){
          const html=safeEmployerHtml(exact.description);
          const expiry=exact.validThrough?Date.parse(String(exact.validThrough)):NaN;
          if(Number.isFinite(expiry)&&expiry<Date.now()){outcome='not_listed';note='Employer structured posting has an explicit past expiry';}
          else if(html.length>=100){snapshot={title:String(exact.title),descriptionHtml:html,text:safeEmployerHtml(html).replace(/<[^>]+>/g,' '),location:exact.jobLocation,secondaryLocations:[],workplaceType:exact.jobLocationType??null,isRemote:exact.jobLocationType==='TELECOMMUTE',compensation:exact.baseSalary??null,metadata:[],originalPublishedAt:exact.datePosted??null,lastPublishedAt:null,canonicalUrl:role.canonical_url,applyUrl:role.canonical_url};outcome='open';note='Exact reviewed title has a current employer JobPosting record; title match alone is not a new role approval';}
        }else note='Employer page requires manual verification; HTTP 200 alone does not establish an open role';
      }
    }catch{note='Employer request or parsing failed; availability unknown';}
    const comparison=samples.find(sample=>sample.url===role.canonical_url);
    const historicalComparison=snapshot&&comparison?(digest(snapshot.descriptionHtml)===digest(comparison.descriptionHtml)?'identical':'changed'):'not_available';
    await client.query('insert into board_review_checks(id,role_id,outcome,canonical_url,content_hash,snapshot,note,historical_comparison) values ($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),role.id,outcome,snapshot?.canonicalUrl??role.canonical_url,snapshot?digest(JSON.stringify(snapshot)):null,snapshot?JSON.stringify(snapshot):null,note,historicalComparison]);
    summary.push({id:role.id,title:role.title,status:outcome,comparison:historicalComparison});
  }
  console.log(JSON.stringify({run,requests,summary},null,2));
}finally{await client.end();}
