import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({query:vi.fn(),start:vi.fn()}));
vi.mock('./store',()=>({database:()=>({query:m.query})}));
vi.mock('workflow/api',()=>({start:m.start}));
import {GET} from '../app/api/internal/daily/route';
const req=(action='intake',secret='correct')=>new Request(`https://preview.test/api/internal/daily?action=${action}`,{headers:{Authorization:`Bearer ${secret}`}});
beforeEach(()=>{vi.resetAllMocks();vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-12T18:00:00Z'));vi.stubEnv('CRON_SECRET','correct');vi.stubEnv('BOARD_DAILY_RUNS_ENABLED','true');vi.stubEnv('VERCEL_ENV','preview');vi.stubEnv('BOARD_CANONICAL_ORIGIN','');});
afterEach(()=>vi.useRealTimers());
it('rejects unauthenticated daily triggers',async()=>{
  expect((await GET(req('intake','wrong'))).status).toBe(401);
  expect(m.query).not.toHaveBeenCalled();expect(m.start).not.toHaveBeenCalled();
});
it('does not restart a completed cycle after a deployment change',async()=>{
  m.query.mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{state:'completed'}]});
  const response=await GET(req());expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({started:false,state:'completed'});
  expect(m.start).not.toHaveBeenCalled();
});
it('refuses an intake that requires recovery',async()=>{
  m.query.mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{state:'failed'}]});
  expect((await GET(req())).status).toBe(503);expect(m.start).not.toHaveBeenCalled();
});
it('claims the cycle before starting a workflow and prevents another claim',async()=>{
  m.query.mockResolvedValueOnce({rows:[{review_date:'2026-11-11'}]})
    .mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{state:'queued'}]});
  m.start.mockResolvedValue({runId:'run-one'});
  expect(await (await GET(req())).json()).toMatchObject({started:true,runId:'run-one'});
  expect(m.query.mock.calls[0]?.[0]).toContain('on conflict do nothing');
  expect(m.start).toHaveBeenCalledTimes(1);
  expect(await (await GET(req())).json()).toMatchObject({started:false,state:'queued'});
  expect(m.start).toHaveBeenCalledTimes(1);
});
it('uses the actual preview origin for the daily email link',async()=>{
  vi.stubEnv('BOARD_DAILY_REVIEW_TO','ben@example.test');
  vi.stubEnv('BOARD_DAILY_REVIEW_FROM','Builder Roles <digest@example.test>');
  vi.stubEnv('RESEND_API_KEY','fixture-key');
  m.start.mockResolvedValue({runId:'mail-one'});
  expect(await (await GET(req('digest'))).json()).toMatchObject({started:true,runId:'mail-one'});
  expect(m.start.mock.calls[0]?.[1]).toEqual([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),'https://preview.test']);
});
it('uses the stable configured origin for future review emails',async()=>{
  vi.stubEnv('BOARD_CANONICAL_ORIGIN','https://jobs-ai-builder-editorial-preview.vercel.app');
  vi.stubEnv('BOARD_DAILY_REVIEW_TO','ben@example.test');
  vi.stubEnv('BOARD_DAILY_REVIEW_FROM','Builder Roles <digest@example.test>');
  vi.stubEnv('RESEND_API_KEY','fixture-key');
  m.start.mockResolvedValue({runId:'mail-stable'});
  expect(await (await GET(req('digest'))).json()).toMatchObject({started:true,runId:'mail-stable'});
  expect(m.start.mock.calls[0]?.[1]).toEqual([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),'https://jobs-ai-builder-editorial-preview.vercel.app']);
});
it('does not let an early delivery test occupy the morning digest slot',async()=>{
  vi.setSystemTime(new Date('2026-11-12T15:59:00Z'));
  expect((await GET(req('digest'))).status).toBe(425);
  expect(m.start).not.toHaveBeenCalled();
});
