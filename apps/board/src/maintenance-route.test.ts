import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),isAdmin:vi.fn(),query:vi.fn()}));
vi.mock('./auth',()=>({auth:()=>({getSession:mocks.getSession}),isAdmin:mocks.isAdmin}));
vi.mock('./store',()=>({database:()=>({query:mocks.query})}));
import {GET} from '../app/admin/maintenance/route';
beforeEach(()=>vi.resetAllMocks());
it('protects maintenance evidence with session and verified admin authorization',async()=>{
  mocks.getSession.mockResolvedValue({data:null});
  expect((await GET(new Request('https://example.test/admin/maintenance'))).status).toBe(303);
  mocks.getSession.mockResolvedValue({data:{user:{email:'other@example.test'}}});mocks.isAdmin.mockReturnValue(false);
  expect((await GET(new Request('https://example.test/admin/maintenance'))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
});
it('renders held source differences with both versions and escaped source fields',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{email:'owner@example.test'}}});mocks.isAdmin.mockReturnValue(true);
  mocks.query.mockResolvedValueOnce({rows:[{id:'role',record:{company:'Example',title:'AI Builder',status:'draft',url:'https://example.test/job',descriptionHtml:'<p>Previous approved text</p>'},disposition:'needs_review',failures:0,next_check_at:'2026-10-30T12:00:00Z',checked_at:'2026-10-29T12:00:00Z',note:'Source differs',changed_fields:['compensation'],snapshot:{title:'AI Builder',descriptionHtml:'<p>Current employer text</p><script>bad()</script>',location:'<script>location</script>',compensation:{min:60000,max:110000}}}]}).mockResolvedValueOnce({rows:[]});
  const response=await GET(new Request('https://example.test/admin/maintenance'));
  const html=await response.text();
  expect(response.status).toBe(200);expect(html).toContain('held from board');
  expect(html).toContain('Previous approved text');expect(html).toContain('Current employer text');
  expect(html).toContain('&lt;script&gt;location&lt;/script&gt;');expect(html).not.toContain('<script>bad()');
});
