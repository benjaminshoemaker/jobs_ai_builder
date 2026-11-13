import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach,beforeEach,expect,it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { makeServer } from './server.js';
import { readCatalog,visibleJobs,CatalogSchema } from './catalog.js';
let dir:string,base:string,server:ReturnType<typeof makeServer>;
const now=Date.parse('2026-10-29T01:00:00Z');
const fixture=await readCatalog(resolve(import.meta.dirname,'../catalog/jobs.json'));
beforeEach(async()=>{dir=await mkdtemp(resolve(tmpdir(),'builder-board-'));await writeFile(resolve(dir,'jobs.json'),JSON.stringify(fixture));server=makeServer({catalog:resolve(dir,'jobs.json'),dataDir:dir,now:()=>now});await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;});
afterEach(async()=>{await new Promise<void>(done=>server.close(()=>done()));await rm(dir,{recursive:true,force:true});});
it('serves the approved board, shareable roles, assets, and honest sample inventory',async()=>{
 const home=await fetch(base);expect(home.status).toBe(200);expect(await home.text()).not.toContain('Choose a visual direction');
 const payload=await (await fetch(base+'/api/jobs')).json() as {jobs:unknown[];notice:string};expect(payload.jobs).toHaveLength(6);expect(payload.notice).toContain('sample');
 const role=await fetch(base+'/roles/figma');expect(await role.text()).toContain('Product Builder, AI Insights at Figma');
 expect((await fetch(base+'/roles/missing')).status).toBe(404);
 expect((await fetch(base+'/app.js')).status).toBe(200);
 expect((await fetch(base+'/catalog/jobs.json')).status).toBe(404);
});
it('keeps feedback per visitor, supports undo, and persists across server instances',async()=>{
 const initial=await fetch(base+'/api/feedback');const cookie=initial.headers.get('set-cookie')!.split(';')[0];
 const post=(active:boolean)=>fetch(base+'/api/feedback',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({jobId:'figma',active})});
 expect((await post(true)).status).toBe(200);
 expect(((await (await fetch(base+'/api/feedback',{headers:{Cookie:cookie}})).json()) as {urls:string[]}).urls).toEqual([fixture.find(j=>j.id==='figma')!.url]);
 expect(((await (await fetch(base+'/api/feedback')).json()) as {urls:string[]}).urls).toEqual([]);
 await new Promise<void>(done=>server.close(()=>done()));server=makeServer({catalog:resolve(dir,'jobs.json'),dataDir:dir,now:()=>now});await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 expect(((await (await fetch(base+'/api/feedback',{headers:{Cookie:cookie}})).json()) as {urls:string[]}).urls).toHaveLength(1);
 expect((await post(false)).status).toBe(200);expect(((await (await fetch(base+'/api/feedback',{headers:{Cookie:cookie}})).json()) as {urls:string[]}).urls).toEqual([]);
});
it('rejects cross-origin writes, malformed bodies, and unknown roles',async()=>{
 expect((await fetch(base+'/api/feedback',{method:'POST',headers:{Origin:base},body:'not-json'})).status).toBe(400);
 expect((await fetch(base+'/api/feedback',{method:'POST',headers:{Origin:base},body:'x'.repeat(5000)})).status).toBe(400);
 expect((await fetch(base+'/api/feedback',{method:'POST',headers:{Origin:'https://elsewhere.example'},body:'{}'})).status).toBe(403);
 expect((await fetch(base+'/api/feedback',{method:'POST',headers:{Origin:base},body:JSON.stringify({jobId:'missing',active:true})})).status).toBe(404);
});
it('withholds drafts, closed, future-dated, and stale published postings',()=>{
 const job=fixture[0];const fresh={...job,status:'published' as const,checkedAt:new Date(now).toISOString()};
 expect(visibleJobs([fresh],now)).toHaveLength(1);
 for(const status of ['draft','closed'] as const)expect(visibleJobs([{...fresh,status}],now)).toEqual([]);
 expect(visibleJobs([{...fresh,checkedAt:new Date(now-8*86400000).toISOString()}],now)).toEqual([]);
 expect(visibleJobs([{...fresh,checkedAt:new Date(now+1).toISOString()}],now)).toEqual([]);
});
it('rejects duplicate identities and executable description markup',()=>{
 expect(()=>CatalogSchema.parse([fixture[0],fixture[0]])).toThrow();
 for(const html of ['<script>alert(1)</script>','<p onclick="x()">unsafe</p>'])expect(()=>CatalogSchema.parse([{...fixture[0],descriptionHtml:html.repeat(20)}])).toThrow();
});

it('requires city data for visible physical roles without inferring headquarters',()=>{
 expect(()=>CatalogSchema.parse([{...fixture[0],cities:[]}])).toThrow('explicit cities');
 expect(()=>CatalogSchema.parse([{...fixture[0],cities:[],status:'draft'}])).not.toThrow();
});
