import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {collectBoard, reserveApiRequests, prioritize} from '../../packages/core/src/index.js';
const cutoff='2026-10-28T07:00:00.000Z'; // End of Oct 27, Pacific; last screening records have day precision.
const boards=['ashby:vanta','ashby:oath','ashby:alt','ashby:within.ai','ashby:rillet','ashby:trm-labs','ashby:faros-ai','ashby:veho-tech-inc','ashby:g2','ashby:sevenai','ashby:sekai','ashby:openart','ashby:legionhealth','ashby:CloudZero','greenhouse:figma','greenhouse:babylist','greenhouse:axiad','greenhouse:apolloio','greenhouse:earnin','greenhouse:opensesame'];
const canonical=(url:string)=>{try{const u=new URL(url);return u.hostname.replace(/^(?:job-)?boards\.greenhouse\.io$/,'greenhouse.io')+u.pathname.replace(/\/$/,'');}catch{return url;}};
if(!process.argv.includes('--live'))throw new Error('Use --live to authorize 20 employer-feed requests.');
const known=new Set<string>();
for(const file of ['packages/core/src/prototype/references.json','research/source-hidden-pool-2026-10-27.json','research/source-hidden-key-2026-10-27.json']){
 const raw=await readFile(file,'utf8');for(const m of raw.matchAll(/https?:[^"\s]+/g))known.add(canonical(m[0]));
}
const collectedAt=new Date().toISOString(); const stats:unknown[]=[];const candidates:any[]=[];
for(const board of boards){
 await reserveApiRequests({dataDir:'data',provider:'prototype',now:collectedAt,requestCount:1,requestLimit:500,reason:`Fresh review employer board ${board}`});
 try{
  const jobs=await collectBoard(board as any,collectedAt);
  const unseen=jobs.filter(j=>!known.has(canonical(j.url)));
  // Ashby publishedAt is last published, not proof of first creation. Greenhouse updated_at is NOT a publication date.
  const eligible=unseen.filter(j=>j.postedAt&&Date.parse(j.postedAt)>Date.parse(cutoff)&&Date.parse(j.postedAt)<=Date.parse(collectedAt));
  candidates.push(...eligible.map(j=>({...j,board,dateBasis:board.startsWith('ashby:')?'last_published_may_include_reposts':'first_published'})));
  stats.push({board,total:jobs.length,unseen:unseen.length,afterCutoff:eligible.length,dateUnknown:unseen.filter(j=>!j.postedAt).length});
 }catch(e){stats.push({board,error:e instanceof Error?e.message:String(e)});}
}
const ranked=prioritize(candidates);
await writeFile('/tmp/jobs-builder-fresh-review.json',JSON.stringify({cutoff,collectedAt,requests:boards.length,stats,candidates:ranked},null,2));
await mkdir('research',{recursive:true});
await writeFile('research/fresh-review-collection-2026-10-28.json',JSON.stringify({cutoff,cutoffPrecision:'last screening date only; conservatively start following Pacific day',collectedAt,requests:boards.length,stats,candidates:ranked.map(({description,...j})=>j)},null,2)+'\n');
console.log(JSON.stringify({cutoff,collectedAt,stats,candidates:ranked.map(j=>({title:j.title,company:j.company,url:j.url,location:j.location,postedAt:j.postedAt,chars:j.description.length}))},null,2));
