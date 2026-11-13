import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),admin:vi.fn(),connect:vi.fn(),query:vi.fn(),release:vi.fn(),run:vi.fn()}));
vi.mock('./auth',()=>({auth:()=>({getSession:m.session}),isAdmin:m.admin}));
vi.mock('./store',()=>({database:()=>({connect:m.connect,query:m.query})}));
vi.mock('./pipeline',()=>({runPipeline:m.run}));
import {GET,POST} from '../app/admin/pipeline/route';
const request=(phase='stage',origin='https://preview.test')=>new Request('https://preview.test/admin/pipeline',{method:'POST',headers:{origin},body:new URLSearchParams({phase})});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('VERCEL_ENV','preview');m.connect.mockResolvedValue({query:m.query,release:m.release});});
it('rejects anonymous, unauthorized, cross-origin and production execution',async()=>{
  m.session.mockResolvedValue({data:null});expect((await GET(new Request('https://preview.test/admin/pipeline'))).status).toBe(303);expect((await POST(request())).status).toBe(403);
  m.session.mockResolvedValue({data:{user:{id:'owner'}}});m.admin.mockReturnValue(false);expect((await POST(request())).status).toBe(403);
  m.admin.mockReturnValue(true);expect((await POST(request('stage','https://evil.test'))).status).toBe(403);
  vi.stubEnv('VERCEL_ENV','production');expect((await POST(request())).status).toBe(403);expect(m.run).not.toHaveBeenCalled();
});
it('bounds execution to one job and never exposes fixture injection or model retries',async()=>{
  m.session.mockResolvedValue({data:{user:{id:'owner'}}});m.admin.mockReturnValue(true);
  expect((await POST(request())).status).toBe(303);expect(m.run.mock.calls[0][1]).toEqual({phase:'stage',actor:'owner',limit:1});expect(m.run.mock.calls[0][2]).not.toHaveProperty('fixtureInfer');
  expect((await POST(request('retry_safe'))).status).toBe(303);expect(m.query.mock.calls[0][0]).toContain("kind<>'assess'");expect(m.release).toHaveBeenCalledTimes(2);
});
it('renders real queue rows with numeric attempts and escapes source content',async()=>{
  m.session.mockResolvedValue({data:{user:{id:'owner'}}});m.admin.mockReturnValue(true);
  m.query.mockResolvedValueOnce({rows:[{phase:'collect',status:'completed',started_at:new Date(),summary:{processed:1}}]}).mockResolvedValueOnce({rows:[{kind:'collect',state:'succeeded',attempts:1,title:'<unsafe>',result:{postings:3}}]});
  const response=await GET(new Request('https://preview.test/admin/pipeline'));expect(response.status).toBe(200);const html=await response.text();expect(html).toContain('attempt 1');expect(html).toContain('&lt;unsafe&gt;');
});
