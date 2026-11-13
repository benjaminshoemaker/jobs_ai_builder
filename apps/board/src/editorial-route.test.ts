import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),isAdmin:vi.fn(),connect:vi.fn(),loadReview:vi.fn(),commitReview:vi.fn(),saveDraftForm:vi.fn(),prepareListing:vi.fn(),recheckListing:vi.fn(),query:vi.fn(),release:vi.fn()}));
vi.mock('./listing-preparation',()=>({prepareListing:mocks.prepareListing}));
vi.mock('./editorial-actions',()=>({recheckListing:mocks.recheckListing}));
vi.mock('./auth',()=>({auth:()=>({getSession:mocks.getSession}),isAdmin:mocks.isAdmin}));
vi.mock('./store',()=>({database:()=>({connect:mocks.connect})}));
vi.mock('./editorial-store',()=>({loadReview:mocks.loadReview,commitReview:mocks.commitReview,saveDraftForm:mocks.saveDraftForm}));
import {GET,POST} from '../app/admin/maintenance/[id]/route';
import {ReviewError} from './editorial-review.js';
const context={params:Promise.resolve({id:'role'})};
const body={action:'withdraw',checkId:'11111111-1111-4111-8111-111111111111',recordVersion:'a'.repeat(64),sourceHash:'b'.repeat(64),note:'Withdraw pending reconciliation'};
const request=(origin='https://example.test')=>new Request('https://example.test/admin/maintenance/role',{method:'POST',headers:{origin},body:new URLSearchParams(body)});
beforeEach(()=>{vi.resetAllMocks();mocks.connect.mockResolvedValue({query:mocks.query,release:mocks.release});});
it('requires a verified admin for reading or posting and rejects cross-origin writes',async()=>{
  mocks.getSession.mockResolvedValue({data:null});
  expect((await GET(new Request('https://example.test/admin/maintenance/role'),context)).status).toBe(303);
  expect((await POST(request(),context)).status).toBe(403);
  mocks.getSession.mockResolvedValue({data:{user:{id:'other'}}});mocks.isAdmin.mockReturnValue(false);
  expect((await POST(request(),context)).status).toBe(403);
  mocks.isAdmin.mockReturnValue(true);
  expect((await POST(request('https://evil.test'),context)).status).toBe(403);
  expect(mocks.connect).not.toHaveBeenCalled();
});
it('commits a successful decision before redirecting and records the provider actor ID',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  const response=await POST(request(),context);
  expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('saved=withdraw');
  expect(mocks.query.mock.calls.map(call=>call[0])).toEqual(['begin','commit']);
  expect(mocks.commitReview.mock.calls[0][4]).toBe('owner');expect(mocks.release).toHaveBeenCalledOnce();
});
it('rolls back stale submissions and releases the connection',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  mocks.commitReview.mockRejectedValue(new ReviewError('Newer source available.'));
  expect((await POST(request(),context)).status).toBe(409);
  expect(mocks.query.mock.calls.map(call=>call[0])).toEqual(['begin','rollback']);expect(mocks.release).toHaveBeenCalledOnce();
});
it('prepares and rechecks only for the signed-in admin, without publishing',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  const post=(action:string)=>new Request('https://example.test/admin/maintenance/role',{method:'POST',headers:{origin:'https://example.test'},body:new URLSearchParams({action})});
  expect((await POST(post('prepare'),context)).status).toBe(303);
  expect(mocks.prepareListing).toHaveBeenCalledOnce();expect(mocks.prepareListing.mock.calls[0].slice(1,3)).toEqual(['role','owner']);
  expect(mocks.commitReview).not.toHaveBeenCalled();expect(mocks.release).toHaveBeenCalledOnce();
  expect((await POST(post('recheck'),context)).status).toBe(303);
  expect(mocks.recheckListing).toHaveBeenCalledOnce();expect(mocks.commitReview).not.toHaveBeenCalled();
});
it('saves editable fields as a hidden draft without an approval event',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  const response=await POST(new Request('https://example.test/admin/maintenance/role',{method:'POST',headers:{origin:'https://example.test'},body:new URLSearchParams({...body,action:'save'})}),context);
  expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('saved=draft');
  expect(mocks.query.mock.calls.map(call=>call[0])).toEqual(['begin','commit']);
  expect(mocks.saveDraftForm).toHaveBeenCalledOnce();expect(mocks.commitReview).not.toHaveBeenCalled();
});
