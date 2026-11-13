// Local browser regression fixture. Every POST is rolled back; no real user session is impersonated.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {candidateQueueData,candidateDetail,saveCandidateReview} from '../src/candidate-review-store.js';
import {makeReviewQueue,readReviewToken} from '../src/candidate-review.js';
import {candidateReviewPage} from '../src/candidate-review-page.js';
if(!process.argv.includes('--rollback-browser-test')||process.env.VERCEL||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit local rollback-only browser test required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
const secret='local-rollback-layout-fixture-secret',seen=new Set<string>();
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/','http://127.0.0.1');
    if(['/admin.css','/tokens.css','/styles.css','/review.js'].includes(url.pathname)){res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile('./public'+url.pathname));return;}
    if(url.pathname==='/favicon.ico'){res.writeHead(404);res.end();return;}
    if(req.method==='POST'){
      let body='';for await(const part of req)body+=part;const form=Object.fromEntries(new URLSearchParams(body));
      const token=readReviewToken(form.token,secret,'layout-fixture');await client.query('begin');
      try{await saveCandidateReview(client,token,{decision:form.decision,note:form.note??'',focus:form.focus??'',engineering:form.engineering??''});}finally{await client.query('rollback');}
      seen.add(token.id);console.log('Browser POST verified and rolled back:',form.decision);res.writeHead(303,{Location:'/?saved='+form.decision+'#selected-title'});res.end();return;
    }
    const data=await candidateQueueData(client,'all','us_or_unknown'),eligible=data.eligible.filter(row=>!seen.has(row.id)),queue=makeReviewQueue(eligible),requested=url.searchParams.get('candidate');
    const selected=await candidateDetail(client,requested&&data.all.some(row=>row.id===requested)?requested:queue[0].id);
    const response=candidateReviewPage({...data,eligible,queue,selected,provider:'all',scope:'us_or_unknown',lane:'mixed',actor:'layout-fixture',secret,saved:url.searchParams.get('saved'),feedback:{calibration:0,evaluation:0}});
    res.setHeader('Content-Type','text/html');res.end(await response.text());
  }catch{await client.query('rollback');res.writeHead(500);res.end('Fixture test failed');}
});
server.listen(0,'127.0.0.1',()=>console.log('Rollback-only browser fixture: http://127.0.0.1:'+(server.address() as {port:number}).port));
