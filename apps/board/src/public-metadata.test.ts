import {expect,it,vi} from 'vitest';
import {GET as sitemap} from '../app/sitemap.xml/route.js';
import {GET as robots} from '../app/robots.txt/route.js';
import {GET as jobs} from '../app/api/jobs/route.js';
import {GET as feedback,POST as saveFeedback} from '../app/api/feedback/route.js';
import {visibleJobs,readCatalog} from './catalog.js';
import {boardPage} from './web.js';
import {publicBoardEnabled} from './public-launch.js';

it('lists only currently visible role URLs in the sitemap',async()=>{
  const previous=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
  try{
    const result=await sitemap(new Request('https://board.example/sitemap.xml'));
    const xml=await result.text(),catalog=await readCatalog('catalog/jobs.json');
    expect(result.status).toBe(200);
    expect((xml.match(/<url>/g)??[]).length).toBe(visibleJobs(catalog).length+1);
    for(const job of catalog.filter(job=>job.status==='closed'||job.status==='draft'))expect(xml).not.toContain(`/roles/${job.id}`);
  }finally{if(previous)process.env.DATABASE_URL=previous;}
});
it('keeps previews and unlaunched deployments out of search crawling',async()=>{
  vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('BOARD_PUBLIC_LAUNCH_ENABLED','true');
  try{expect(await (await robots(new Request('https://preview.example/robots.txt'))).text()).toContain('Disallow: /');}
  finally{vi.unstubAllEnvs();}
});
it('does not expose public routes from an unlaunched Production deployment',async()=>{
  vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('BOARD_PUBLIC_LAUNCH_ENABLED','false');
  try{
    expect(publicBoardEnabled()).toBe(false);
    expect((await boardPage()).status).toBe(503);
    expect((await boardPage('figma')).status).toBe(503);
    expect((await jobs()).status).toBe(503);
    expect((await sitemap(new Request('https://board.example/sitemap.xml'))).status).toBe(503);
    expect((await feedback(new Request('https://board.example/api/feedback'))).status).toBe(503);
    expect((await saveFeedback(new Request('https://board.example/api/feedback',{method:'POST'}))).status).toBe(503);
    expect(await (await robots(new Request('https://board.example/robots.txt'))).text()).toContain('Disallow: /');
    vi.stubEnv('BOARD_PUBLIC_LAUNCH_ENABLED','true');
    expect(publicBoardEnabled()).toBe(true);
  }finally{vi.unstubAllEnvs();}
});
