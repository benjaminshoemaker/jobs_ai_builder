import {Client} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {SourceSchema,publicApiRobots,discoveryUrlIdentity,sourceFromUrl,sourceEndpoint,selectDiscoverySources,parseDiscoveryFeed,type DiscoverySource} from '../src/broad-discovery.js';

const live=process.argv.includes('--live'),prepare=process.argv.includes('--prepare');
if(!live&&!prepare)throw new Error('Choose --prepare (offline registry only) or --live (bounded employer collection)');
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Configured preview/development database required');
const number=(flag:string,fallback:number,max:number)=>{const i=process.argv.indexOf(flag),value=i<0?fallback:Number(process.argv[i+1]);if(!Number.isInteger(value)||value<1||value>max)throw new Error(`Invalid ${flag}`);return value;};
const maxBoards=number('--boards',300,450),maxRequests=number('--max-requests',320,500);
const root=resolve(import.meta.dirname,'../../..'),directory=JSON.parse(await readFile(resolve(root,'apps/board/catalog/discovery-directory.json'),'utf8'));
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();let locked=false;const runId=randomUUID();let requests=0;
try{
  locked=(await client.query("select pg_try_advisory_lock(hashtext('board-broad-discovery')) as locked")).rows[0].locked;if(!locked)throw new Error('Broad discovery is already running');
  const sources=new Map<string,DiscoverySource>();
  const add=(provider:string,slug:string,provenance:unknown)=>{const parsed=SourceSchema.safeParse({provider,slug});if(!parsed.success||/(?:^|[-_])(?:test|sandbox|demo|internal)(?:$|[-_])|internal$/i.test(slug))return;const id=provider+':'+slug.toLowerCase();sources.set(id,{id,...parsed.data,provenance});};
  for(const [provider,slugs] of Object.entries(directory.providers))for(const slug of slugs as string[])add(provider,slug,{origin:'public_directory',upstream:directory.upstream,commit:directory.commit,asOf:directory.asOf,license:directory.license});
  // Previous research expands employer discovery; these URLs do not become user labels.
  for(const name of (await readdir(resolve(root,'research'))).filter(name=>name.endsWith('.json'))){const body=await readFile(resolve(root,'research',name),'utf8');for(const url of body.match(/https?:[^"\s<>]+/g)??[]){const source=sourceFromUrl(url);if(source)add(source.provider,source.slug,{origin:'prior_discovery',path:'research/'+name});}}
  const references=JSON.parse(await readFile(resolve(root,'packages/core/src/prototype/references.json'),'utf8'));
  for(const ref of references){const source=sourceFromUrl(ref.url??'');if(source)add(source.provider,source.slug,{origin:'reviewed_history',referenceId:ref.id});}
  for(const slug of ['amperity','exiger','kettle'])add('greenhouse',slug,{origin:'prior_discovery',path:'BOARD_SOURCING.md / employer links verified during research'});
  await client.query('begin');
  const values=[...sources.values()];for(let i=0;i<values.length;i+=1000)await client.query(`insert into board_discovery_sources(id,provider,slug,provenance) select id,provider,slug,provenance from jsonb_to_recordset($1::jsonb) as x(id text,provider text,slug text,provenance jsonb) on conflict(id) do update set provenance=excluded.provenance,slug=excluded.slug`,[JSON.stringify(values.slice(i,i+1000))]);
  await client.query('commit');
  const {rows:all}=await client.query('select * from board_discovery_sources');const selected=selectDiscoverySources(all,maxBoards,'broad-2026-10-29');
  if(!live){console.log(JSON.stringify({registered:values.length,plannedBoards:selected.length,providers:selected.reduce((a:Record<string,number>,s)=>({...a,[s.provider]:(a[s.provider]??0)+1}),{}),employerRequests:0,scheduled:false}));}
  else{
    const daily=(await client.query("select count(*)::int as n from board_discovery_requests where attempted_at>now()-interval '24 hours'")).rows[0].n;
    const budget=Math.min(maxRequests,500-daily);if(budget<1)throw new Error('Rolling 24-hour broad-discovery request budget exhausted');
    await client.query("update board_discovery_runs set status='interrupted',finished_at=now() where status='running'");
    await client.query("insert into board_discovery_runs(id,status,max_requests) values($1,'running',$2)",[runId,budget]);
    const knownRows=(await client.query('select identity_key,canonical_url from board_review_roles')).rows;
    const known=new Set(knownRows.flatMap(row=>[row.identity_key,...(row.canonical_url?[discoveryUrlIdentity(row.canonical_url)]:[])]));
    const hostTimes=new Map<string,number>(),hostDelays=new Map<string,number>(),robotResponses=new Map<string,{status:number;body:string}>();
    const get=async(endpoint:string)=>{
      if(requests>=budget)throw new Error('Run request budget exhausted');
      const host=new URL(endpoint).host,wait=(hostDelays.get(host)??1000)-(Date.now()-(hostTimes.get(host)??0));if(wait>0)await new Promise(resolve=>setTimeout(resolve,wait));
      await client.query('insert into board_discovery_requests(run_id,sequence,endpoint) values($1,$2,$3)',[runId,++requests,endpoint]);hostTimes.set(host,Date.now());
      const r=await fetch(endpoint,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json,text/plain','User-Agent':'JobsAIBuilderDiscovery/0.1'}});const body=await r.text();return {status:r.status,body};
    };
    // Evaluate current rules for the exact documented API path, once per host.
    for(const host of ['api.ashbyhq.com','boards-api.greenhouse.io','api.lever.co']){
      try{robotResponses.set(host,await get('https://'+host+'/robots.txt'));}catch{robotResponses.set(host,{status:503,body:''});}
    }
    const totals={boards:0,ok:0,errors:0,skipped:0,postings:0,knownReviewed:0,shortlisted:0,deferredByCap:0,malformed:0};
    for(const source of selected){
      if(requests>=budget)break;
      const endpoint=sourceEndpoint(source);let outcome='error',note='Employer request or parsing failed; no closure or fit inferred',counts:Record<string,number>={};
      const robotResponse=robotResponses.get(new URL(endpoint).host)!;const policy=publicApiRobots(endpoint,robotResponse.status,robotResponse.body);hostDelays.set(new URL(endpoint).host,policy.delay);
      if(!policy.allowed){outcome='skipped';note='API host robots check was restrictive, unavailable or ambiguous';totals.skipped++;}
      else try{
        const r=await get(endpoint);if(r.status!==200)throw new Error('Unavailable employer feed');
        const parsed=parseDiscoveryFeed(JSON.parse(r.body),source);totals.postings+=parsed.total;totals.malformed+=parsed.malformed;
        const reviewed=parsed.records.filter(record=>(known.has(record.identity)||known.has(record.canonicalIdentity)));totals.knownReviewed+=reviewed.length;
        const potentials=parsed.records.filter(record=>record.retain&&!(known.has(record.identity)||known.has(record.canonicalIdentity))).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
        const shortlist:typeof potentials=[];let bytes=0;const byteAllowance=Math.floor(64*1024*1024/selected.length);
        for(const record of potentials){const size=Buffer.byteLength(JSON.stringify(record.snapshot));if(shortlist.length<25&&bytes+size<=byteAllowance){shortlist.push(record);bytes+=size;}}
        totals.deferredByCap+=potentials.length-shortlist.length;
        await client.query('begin');
        for(let i=0;i<potentials.length;i+=500){
          const batch=potentials.slice(i,i+500).map(record=>({id:record.id,identity:record.identity,employerId:record.employerId,url:record.url,title:record.title,location:record.location,score:record.score,signals:record.signals,locationHint:record.locationHint,hash:record.hash}));
          await client.query(`insert into board_discovery_candidates(id,identity_key,source_id,employer_posting_id,canonical_url,title,location,score,signals,location_hint,current_hash,last_run_id) select id,identity,$2,"employerId",url,title,location,score,signals,"locationHint",hash,$3 from jsonb_to_recordset($1::jsonb) as x(id text,identity text,"employerId" text,url text,title text,location text,score integer,signals jsonb,"locationHint" text,hash text) on conflict(identity_key) do update set title=excluded.title,location=excluded.location,score=excluded.score,signals=excluded.signals,location_hint=excluded.location_hint,current_hash=excluded.current_hash,last_seen_at=now(),last_run_id=excluded.last_run_id`,[JSON.stringify(batch),source.id,runId]);
        }
        if(shortlist.length)await client.query(`insert into board_discovery_versions(candidate_id,content_hash,snapshot) select id,hash,snapshot from jsonb_to_recordset($1::jsonb) as x(id text,hash text,snapshot jsonb) on conflict do nothing`,[JSON.stringify(shortlist.map(record=>({id:record.id,hash:record.hash,snapshot:record.snapshot})))]);
        await client.query('commit');
        totals.shortlisted+=shortlist.length;totals.ok++;outcome='ok';note='Public employer feed read; retrieval signals are not category judgments';counts={postings:parsed.total,malformed:parsed.malformed,unlisted:parsed.unlisted,knownReviewed:reviewed.length,potentials:potentials.length,potentialMetadata:potentials.length,fullTextRetained:shortlist.length,deferredFullText:potentials.length-shortlist.length};
      }catch{await client.query('rollback');totals.errors++;}
      await client.query('insert into board_discovery_results(run_id,source_id,outcome,counts,note) values($1,$2,$3,$4,$5)',[runId,source.id,outcome,counts,note]);
      if(outcome!=='skipped')await client.query('update board_discovery_sources set last_checked_at=now() where id=$1',[source.id]);totals.boards++;
      if(totals.boards%25===0)console.log(JSON.stringify({progress:totals.boards,postings:totals.postings,potentialsRetained:totals.shortlisted,requests}));
    }
    const summary={...totals,requests,plannedBoards:selected.length,deferredBoards:selected.length-totals.boards,classification:'unassessed; retrieval signals only',published:0,scheduled:false};
    await client.query("update board_discovery_runs set status='completed',finished_at=now(),summary=$2 where id=$1",[runId,summary]);console.log(JSON.stringify({runId,...summary},null,2));
  }
}catch(error){await client.query('rollback');await client.query("update board_discovery_runs set status='failed',finished_at=now(),summary=$2 where id=$1 and status='running'",[runId,{reason:'Discovery stopped; completed source results retained',requests}]);throw error;}
finally{if(locked)await client.query("select pg_advisory_unlock(hashtext('board-broad-discovery'))");await client.end();}
