import { createServer, type IncomingMessage } from 'node:http';
import { readFile,appendFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { readCatalog,visibleJobs } from './catalog.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const uuid=/^[a-f0-9-]{36}$/;
async function body(req:IncomingMessage){let value='';for await(const chunk of req){value+=chunk.toString();if(Buffer.byteLength(value)>4096)throw new Error('Body too large');}return JSON.parse(value);}
export function makeServer(options:{catalog?:string;dataDir?:string;now?:()=>number}={}){
 const catalog=options.catalog??resolve(root,'catalog/jobs.json');
 const dataDir=options.dataDir??resolve(root,'../../data/board');
 const now=options.now??Date.now;
 const rates=new Map<string,{count:number;until:number}>();
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  const json=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
   const url=new URL(req.url??'/','http://localhost');
   if(req.method!=='GET'&&req.method!=='POST'){json(405,{error:'Method not allowed'});return;}
   if(url.pathname==='/api/jobs'&&req.method==='GET'){
    const jobs=visibleJobs(await readCatalog(catalog),now());
    json(200,{jobs,notice:jobs.some(job=>job.status==='sample')?'Preview inventory includes dated sample postings. Check company sites for current availability.':''});return;
   }
   if(url.pathname==='/api/feedback'){
    const origin=req.headers.origin;
    if(req.method==='POST'&&(!origin||new URL(origin).host!==req.headers.host)){json(403,{error:'Same-origin requests required'});return;}
    const cookie=req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('board_visitor='))?.slice(14);
    const visitor=cookie&&uuid.test(cookie)?cookie:randomUUID();
    if(visitor!==cookie)res.setHeader('Set-Cookie',`board_visitor=${visitor}; HttpOnly; SameSite=Strict; Path=/`);
    const file=resolve(dataDir,'feedback.jsonl');
    if(req.method==='GET'){
     let text='';try{text=await readFile(file,'utf8');}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
     const state=new Map<string,boolean>();
     for(const line of text.split('\n').filter(Boolean)){const event=JSON.parse(line);if(event.visitor===visitor)state.set(event.jobId,event.active);}
     const jobs=await readCatalog(catalog);json(200,{urls:jobs.filter(job=>state.get(job.id)).map(job=>job.url)});return;
    }
    let input;try{input=await body(req);}catch{json(400,{error:'Invalid or oversized request body'});return;}
    if(!input||typeof input.jobId!=='string'||typeof input.active!=='boolean'){json(400,{error:'Invalid feedback'});return;}
    const job=visibleJobs(await readCatalog(catalog),now()).find(job=>job.id===input.jobId);
    if(!job){json(404,{error:'Role not found'});return;}
    for(const [key,rate] of rates)if(rate.until<now())rates.delete(key);
    const rate=rates.get(visitor)??{count:0,until:now()+60000};
    if(rate.count>=30||rates.size>10000){json(429,{error:'Please try again later'});return;}
    rate.count++;rates.set(visitor,rate);
    await mkdir(dataDir,{recursive:true});await appendFile(file,JSON.stringify({visitor,jobId:job.id,active:input.active,createdAt:new Date(now()).toISOString()})+'\n');
    json(200,{saved:true,active:input.active});return;
   }
   if(req.method!=='GET'){json(404,{error:'Not found'});return;}
   if(url.pathname==='/'||/^\/roles\/[a-z0-9-]+$/.test(url.pathname)){
    let title='Builder roles',description='Curated roles for people who think, build, and ship with AI.';
    if(url.pathname!=='/'){
     const job=visibleJobs(await readCatalog(catalog),now()).find(job=>job.id===url.pathname.slice(7));
     if(!job){res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end('<h1>Role unavailable</h1><p>This role is closed, awaiting review, or no longer freshly verified.</p><a href="/">Browse current roles</a>');return;}
     title=`${job.title} at ${job.company} · Builder roles`;description=job.reason;
    }
    const html=(await readFile(resolve(root,'public/index.html'),'utf8')).replace('<title>Builder roles</title>',`<title>${escape(title)}</title>`).replace('<!--SERVER_META-->',`<meta name="description" content="${escape(description)}">`);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache'});res.end(html);return;
   }
   const assets=new Map([['/app.js','text/javascript'],['/filters.js','text/javascript'],['/styles.css','text/css'],['/tokens.css','text/css']]);
   const type=assets.get(url.pathname)??(/^\/logos\/[a-z0-9.-]+\.(png|svg)$/.test(url.pathname)?(url.pathname.endsWith('.svg')?'image/svg+xml':'image/png'):null);
   if(!type){json(404,{error:'Not found'});return;}
   const content=await readFile(resolve(root,'public','.'+url.pathname));res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(content);
  }catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){json(404,{error:'Not found'});return;}json(500,{error:'Unable to complete request'});}
 });
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const port=Number(process.env.PORT??8780);const server=makeServer();server.listen(port,'127.0.0.1',()=>console.log(`Builder roles: http://127.0.0.1:${port}`));
}
