import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),isAdmin:vi.fn(),query:vi.fn()}));
vi.mock('./auth',()=>({auth:()=>({getSession:mocks.getSession}),isAdmin:mocks.isAdmin}));
vi.mock('./store',()=>({database:()=>({query:mocks.query})}));
import { GET } from '../app/admin/history/route';
beforeEach(()=>vi.resetAllMocks());
it('requires a session before reading private historical judgments',async()=>{
  mocks.getSession.mockResolvedValue({data:null});
  const response=await GET(new Request('https://board.example/admin/history'));
  expect(response.status).toBe(303);
  expect(mocks.query).not.toHaveBeenCalled();
});
it('denies a signed-in identity that fails the verified admin allowlist',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{email:'other@example.com'}}});
  mocks.isAdmin.mockReturnValue(false);
  expect((await GET(new Request('https://board.example/admin/history'))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
});
it('renders original judgments safely and binds the selected decision filter',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{email:'owner@example.com'}}});
  mocks.isAdmin.mockReturnValue(true);
  mocks.query.mockResolvedValueOnce({rows:[{id:'example',company:'<script>bad()</script>',title:'Builder',decision:'rejected',historical_label:'no',historical_reason:'User rejected this role',user_focus:null,provenance:{},evidence:[]}]}).mockResolvedValueOnce({rows:[{decision:'rejected',n:1}]});
  const response=await GET(new Request('https://board.example/admin/history?decision=rejected'));
  const html=await response.text();
  expect(response.status).toBe(200);
  expect(mocks.query.mock.calls[0][1]).toEqual(['rejected']);
  expect(html).toContain('User rejected this role');
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>bad()');
});
