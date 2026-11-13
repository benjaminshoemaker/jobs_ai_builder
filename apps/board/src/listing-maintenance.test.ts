import { expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JobSchema } from './catalog.js';
import { changedFields,maintenancePlan,observeEmployerRole,type EmployerSnapshot } from './listing-maintenance.js';
const now=Date.parse('2026-10-29T12:00:00Z');
const job=JobSchema.parse({...JSON.parse(readFileSync(new URL('../catalog/jobs.json',import.meta.url),'utf8'))[0],status:'published',checkedAt:new Date(now-86400000).toISOString()});
const snapshot:EmployerSnapshot={title:job.title,descriptionHtml:job.descriptionHtml,text:'Not authoritative for comparison',location:{name:'New York'},secondaryLocations:[],workplaceType:'OnSite',isRemote:false,compensation:null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:job.url,applyUrl:job.url};
it('refreshes unchanged source text without overwriting reconciled fields or posting recency',()=>{
  const after={...snapshot,descriptionHtml:snapshot.descriptionHtml.replace('<p>','<p><br>'),lastPublishedAt:'2026-10-29',applyUrl:job.url+'?track=1'};
  expect(changedFields(snapshot,after)).toEqual([]);
  const plan=maintenancePlan(job,snapshot,{kind:'open',snapshot:after,note:'verified'},3,now);
  expect(plan.outcome).toBe('refreshed');expect(plan.failures).toBe(0);
  expect(plan.record).toEqual({...job,checkedAt:new Date(now).toISOString()});
});
it('holds changed qualifications and pay without publishing replacement text or losing the prior record',()=>{
  const after={...snapshot,descriptionHtml:snapshot.descriptionHtml+'<p>Ten years of software engineering required.</p>',compensation:{salary:100}};
  const plan=maintenancePlan(job,snapshot,{kind:'open',snapshot:after,note:'changed'},0,now);
  expect(plan.outcome).toBe('needs_review');expect(plan.changed).toEqual(['description','compensation']);
  expect(plan.record).toEqual({...job,status:'draft'});
  expect(maintenancePlan({...job,status:'draft'},snapshot,{kind:'open',snapshot,note:'reverted'},0,now).outcome).toBe('needs_review');
});
it('does not refresh or close on failure or unconfirmed absence, and backs off up to a day',()=>{
  for(const kind of ['unknown','missing'] as const){
    const plan=maintenancePlan(job,snapshot,{kind,note:'failed'},0,now);
    expect(plan.record).toEqual(job);expect(Date.parse(plan.nextCheckAt)-now).toBe(2*3600000);
    const later=maintenancePlan(job,snapshot,{kind,note:'failed again'},20,now);
    expect(Date.parse(later.nextCheckAt)-now).toBe(24*3600000);
  }
  expect(maintenancePlan(job,snapshot,{kind:'closed',note:'confirmed'},0,now).record.status).toBe('closed');
});
it('requires a successful complete feed plus authoritative 404 for a missing posting closure',async()=>{
  const get=vi.fn().mockResolvedValueOnce({status:200,data:{jobs:[]},text:''}).mockResolvedValueOnce({status:404,data:null,text:''});
  expect((await observeEmployerRole('https://boards.greenhouse.io/example/jobs/123','Builder',get,now)).kind).toBe('closed');
  expect(get.mock.calls[1][0]).toBe('https://boards-api.greenhouse.io/v1/boards/example/jobs/123');
  const failed=vi.fn().mockResolvedValue({status:404,data:null,text:''});
  expect((await observeEmployerRole('https://boards.greenhouse.io/example/jobs/123','Builder',failed,now)).kind).toBe('unknown');expect(failed).toHaveBeenCalledTimes(1);
});
it('distinguishes feed absence, malformed payloads, explicit unlisting and request errors',async()=>{
  const url='https://jobs.ashbyhq.com/example/123';
  const absent=vi.fn().mockResolvedValueOnce({status:200,data:{jobs:[]},text:''}).mockResolvedValueOnce({status:200,data:null,text:'Site shell'});
  expect((await observeEmployerRole(url,'Builder',absent,now)).kind).toBe('missing');
  const malformed=vi.fn().mockResolvedValue({status:200,data:{jobs:[{title:'Incomplete'}]},text:''});
  expect((await observeEmployerRole(url,'Builder',malformed,now)).kind).toBe('unknown');expect(malformed).toHaveBeenCalledTimes(1);
  const unlisted=vi.fn().mockResolvedValue({status:200,data:{jobs:[{id:'123',isListed:false}]},text:''});
  expect((await observeEmployerRole(url,'Builder',unlisted,now)).kind).toBe('closed');
  expect((await observeEmployerRole(url,'Builder',async()=>{throw new Error('timeout');},now)).kind).toBe('unknown');
});
it('does not infer custom-page availability from a shell, redirect or bare 404',async()=>{
  for(const status of [200,301,404,503])expect((await observeEmployerRole('https://careers.example/role','Builder',async()=>({status,text:'Apply',data:null}),now)).kind).toBe('unknown');
  const text='<script type="application/ld+json">'+JSON.stringify({'@type':'JobPosting',title:'Builder',description:'<p>'+('Ship useful software with AI. '.repeat(6))+'</p>',validThrough:'2026-01-01'})+'</script>';
  expect((await observeEmployerRole('https://careers.example/role','Builder',async()=>({status:200,text,data:null}),now)).kind).toBe('closed');
  expect((await observeEmployerRole('https://careers.example/role','Builder',async()=>({status:200,text:text.replace('2026-01-01','2026-10-29'),data:null}),now)).kind).toBe('open');
});
