import {expect,it,vi} from 'vitest';
import {preparedAssessment,inferBuilder,reviewAssessment} from './pipeline-assessor.js';
import {initialDraft} from './pipeline-drafts.js';
import {visibleJobs} from './catalog.js';
import {observeEmployerRole} from './listing-maintenance.js';
import {runPipeline} from './pipeline.js';
const description='<p>Understand user problems and choose what to build. Personally build working features with Claude Code, ship them to real users and measure adoption. No prior software engineering career required.</p>';
it('limits the one-time top-100 mode to its named assessment run',async()=>{
  const db={query:vi.fn()};
  await expect(runPipeline(db as any,{phase:'assess',actor:'daily',initialTop100:true})).rejects.toThrow('one-time');
  await expect(runPipeline(db as any,{phase:'collect',actor:'initial-production-top-100',initialTop100:true})).rejects.toThrow('one-time');
  expect(db.query).not.toHaveBeenCalled();
});
it('sends the actual v12 policy and small contract; keeps metadata as explicit source reading cues',async()=>{
  const p=preparedAssessment('gpt-6-luna',{title:'Builder',source_id:'ashby:example',location:'US',snapshot:{descriptionHtml:description}});
  const send=vi.fn(async(_url:unknown,init:any)=>{expect(JSON.parse(init.body)).toEqual(p.request);expect(p.request.instructions).toContain('Distinguish owning the problem');expect(p.request.instructions).toContain('opening paragraphs');return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({decision:'yes',reason:'Owns problems and ships personally with AI.'})}]}]});});
  const result=await inferBuilder(p.request,'fixture-only',send as any);
  const display=reviewAssessment(description,result.decision);
  expect(display.fit).toBe('builder');expect(display.evidenceMode).toBe('source_reading_cues');expect(display.engineering).toBe('unclear');expect(display.focus).toEqual([]);
  expect(send).toHaveBeenCalledOnce();
});
it('never converts incomplete, refused, extra-field or invalid model output into a fit judgment',async()=>{
  const p=preparedAssessment('gpt-6-luna',{title:'Builder',source_id:'example',location:'US',snapshot:{descriptionHtml:description}});
  for(const payload of [{status:'incomplete'}, {status:'completed',output:[{content:[{type:'refusal',refusal:'No'}]}]}, {status:'completed',output:[{content:[{type:'output_text',text:'{"decision":"yes","reason":"x","extra":true}'}]}]}])await expect(inferBuilder(p.request,'fixture-only',async()=>Response.json(payload))).rejects.toThrow();
});
it('creates hidden drafts without inventing pay, remote eligibility, cities or a SWE gate',()=>{
  const now=Date.now(),job=initialDraft({id:'a'.repeat(32),source_id:'ashby:example',canonical_url:'https://jobs.ashbyhq.com/example/one',location:'Remote',first_seen_at:new Date(now-1000),last_seen_at:new Date(now),snapshot:{title:'Builder',descriptionHtml:description,workplaceType:'Remote'},focus:null,engineering_gate:null,note:''});
  expect(job.status).toBe('draft');expect(job.compensation).toBeNull();expect(job.remoteScope).toBeNull();expect(job.cities).toEqual([]);expect(job.gate).toBe('unclear');expect(visibleJobs([job])).toEqual([]);
});
it('rechecks exact Lever and BambooHR records and never closes them on a failed request',async()=>{
  const lever=[{id:'one',text:'Builder',hostedUrl:'https://jobs.lever.co/example/one',categories:{location:'US'},description,lists:[]}];
  const get=vi.fn(async()=>({status:200,text:'',data:lever}));
  expect((await observeEmployerRole('https://jobs.lever.co/example/one','Builder',get)).kind).toBe('open');
  const bamboo={result:{jobOpening:{jobOpeningStatus:'Open',jobOpeningShareUrl:'https://example.bamboohr.com/careers/1',jobOpeningName:'Builder',description,locationType:'2'}}};
  expect((await observeEmployerRole('https://example.bamboohr.com/careers/1','Builder',async()=>({status:200,text:'',data:bamboo}))).kind).toBe('open');
  const closed={result:{jobOpening:{...bamboo.result.jobOpening,jobOpeningStatus:'Closed'}}};
  expect((await observeEmployerRole('https://example.bamboohr.com/careers/1','Builder',async()=>({status:200,text:'',data:closed}))).kind).toBe('closed');
  expect((await observeEmployerRole('https://example.bamboohr.com/careers/1','Builder',async()=>({status:404,text:'',data:null}))).kind).toBe('unknown');
});
