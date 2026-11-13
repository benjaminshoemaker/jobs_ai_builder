import {expect,it} from 'vitest';
import {parseDiscoveryFeed,selectDiscoverySources,selectDailyDiscoverySources,sourceEndpoint,sourceFromUrl,discoveryUrlIdentity,publicApiRobots,retrievalSignals,type DiscoverySource} from './broad-discovery.js';
const source:DiscoverySource={id:'ashby:example',provider:'ashby',slug:'example',provenance:{origin:'public_directory'}};
const body='<p>You identify business problems and personally build and ship internal tools with Claude Code. Own the workflows end to end and measure adoption.</p>';
it('uses fixed public API hosts and validates untrusted directory slugs',()=>{
  expect(sourceEndpoint(source)).toContain('https://api.ashbyhq.com/posting-api/job-board/example');
  expect(()=>sourceEndpoint({...source,slug:'../private?token=secret'})).toThrow();
  expect(sourceFromUrl('https://jobs.ashbyhq.com/example/id')).toEqual({provider:'ashby',slug:'example'});
  expect(sourceFromUrl('https://jobs.ashbyhq.com.evil.example/company/id')).toBeNull();
});
it('retains operations and engineering builders without declaring keyword matches approved',()=>{
  for(const title of ['Operations Manager','Product Builder','Staff Software Engineer','Designer']){
    const result=retrievalSignals(title,body,'Remote');expect(result.retain).toBe(true);expect(result.signals.fit).toBe('unassessed');
  }
  expect(retrievalSignals('Accountant','<p>Prepare accounts for a retailer.</p>','NY').retain).toBe(false);
  expect(retrievalSignals('Engineering Manager, Product Engineering',body,'NY').signals.explicitBuilder).toBe(false);
  expect(retrievalSignals('Builder Talent Pool',body,'NY').signals.evergreenHint).toBe(true);
});
it('keeps exact posting identities distinct even when custom career URLs share a path',()=>{
  const parsed=parseDiscoveryFeed({jobs:[{id:'one',title:'Builder',isListed:true,descriptionHtml:body,jobUrl:'https://company.example/careers?gh_jid=111'},{id:'two',title:'Builder',isListed:true,descriptionHtml:body,jobUrl:'https://company.example/careers?gh_jid=222'},{id:'hidden',isListed:false},{title:'bad'}]},source);
  expect(parsed.records).toHaveLength(2);expect(parsed.unlisted).toBe(1);expect(parsed.malformed).toBe(1);
  expect(parsed.records[0].identity).not.toBe(parsed.records[1].identity);
  expect(discoveryUrlIdentity('https://company.example/careers?gh_jid=111&tracking=yes')).not.toBe(discoveryUrlIdentity('https://company.example/careers?gh_jid=222'));
});
it('rejects malformed feeds instead of treating failures as successful empty results',()=>{
  expect(()=>parseDiscoveryFeed({error:'Unavailable'},source)).toThrow();
  expect(parseDiscoveryFeed({jobs:[]},source).total).toBe(0);
});
it('uses fresh source rotation and a provider mix rather than alphabetic ordering',()=>{
  const sources=Array.from({length:60},(_,i)=>({...source,id:`${i%3===0?'lever':i%3===1?'greenhouse':'ashby'}:company${i}`,provider:(i%3===0?'lever':i%3===1?'greenhouse':'ashby') as DiscoverySource['provider'],slug:'company'+i}));
  const selected=selectDiscoverySources(sources,30,'fixed');expect(new Set(selected.map(s=>s.provider)).size).toBe(3);expect(new Set(selected.map(s=>s.id)).size).toBe(30);
  expect(selected).toEqual(selectDiscoverySources(sources,30,'fixed'));
  const checked={...sources.find(s=>s.provider==='ashby')!,last_checked_at:new Date()};
  const next=selectDiscoverySources([checked,...sources.filter(s=>s.id!==checked.id)],3,'fixed');expect(next.map(s=>s.id)).not.toContain(checked.id);
});
it('reserves daily slots for known employers and new directory exploration',()=>{
  const known=Array.from({length:12},(_,i):DiscoverySource=>({...source,id:`ashby:known${i}`,slug:`known${i}`,provenance:{origin:'reviewed_history'},last_checked_at:new Date('2026-11-01')}));
  const directory=Array.from({length:50},(_,i):DiscoverySource=>({...source,id:`greenhouse:directory${i}`,provider:'greenhouse',slug:`directory${i}`}));
  const selected=selectDailyDiscoverySources([...known,...directory],10,'today');
  expect(selected.filter(s=>(s.provenance as {origin:string}).origin==='reviewed_history')).toHaveLength(6);
  expect(selected.filter(s=>(s.provenance as {origin:string}).origin==='public_directory')).toHaveLength(4);
  expect(new Set(selected.map(s=>s.id)).size).toBe(10);
});
it('respects robot path rules and delays, and distinguishes unavailable robots from server errors',()=>{
  const endpoint=sourceEndpoint(source);
  expect(publicApiRobots(endpoint,200,'User-agent: *\nDisallow: /posting-api/').allowed).toBe(false);
  expect(publicApiRobots(endpoint,200,'User-agent: *\nDisallow: /embed/\nCrawl-delay: 2')).toEqual({allowed:true,delay:2000});
  expect(publicApiRobots(endpoint,403,'').allowed).toBe(true);
  expect(publicApiRobots(endpoint,401,'').allowed).toBe(true);
  expect(publicApiRobots(endpoint,503,'').allowed).toBe(false);
  expect(publicApiRobots(endpoint,429,'').allowed).toBe(false);
});

it('keeps foreign location hints separate from builder fit and permits explicit U.S. eligibility',()=>{
 for(const location of ['Estonia - Remote','Tallinn','Remote in Chile','Kochi, Kerala','Gurugram','Hyderabad','Turkey','Mexico City, Mexico','Brazil; Argentina'])expect(retrievalSignals('AI Builder',body,location).locationHint).toBe('non_us_indicated');
 expect(retrievalSignals('AI Builder',body,'Remote, US or Canada').locationHint).toBe('us_indicated');
 expect(retrievalSignals('AI Builder',body,'Remote').locationHint).toBe('unknown');
 expect(retrievalSignals('AI Builder',body,'Albuquerque, New Mexico').locationHint).toBe('unknown');
});
