import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {signReviewToken,selectionPolicy} from './candidate-review.js';
import {digest} from './review-history.js';
const mocks=vi.hoisted(()=>({getSession:vi.fn(),isAdmin:vi.fn(),query:vi.fn(),connect:vi.fn(),release:vi.fn(),save:vi.fn(),autoPublish:vi.fn()}));
vi.mock('./automatic-publication',()=>({automaticPublishCandidate:mocks.autoPublish}));
vi.mock('./auth',()=>({auth:()=>({getSession:mocks.getSession}),isAdmin:mocks.isAdmin}));
vi.mock('./store',()=>({database:()=>({query:mocks.query,connect:mocks.connect})}));
vi.mock('./candidate-review-store',async importOriginal=>({...await importOriginal<typeof import('./candidate-review-store')>(),saveCandidateReview:mocks.save}));
import {GET,POST} from '../app/admin/discovery/route';
import {CandidateReviewError} from './candidate-review-store.js';
const secret='fixture-secret-at-least-32-characters';
const token=()=>signReviewToken({id:digest('id').slice(0,32),hash:digest('source'),nonce:randomUUID(),actor:'owner',reviewId:null,assessmentId:null,lane:'priority',policy:selectionPolicy,issuedAt:Date.now()},secret);
const request=(origin='https://example.test')=>new Request('https://example.test/admin/discovery',{method:'POST',headers:{origin},body:new URLSearchParams({token:token(),decision:'yes'})});
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NEON_AUTH_COOKIE_SECRET',secret);mocks.connect.mockResolvedValue({query:mocks.query,release:mocks.release});mocks.autoPublish.mockResolvedValue({status:'held',issues:['Needs attention']});});afterEach(()=>vi.unstubAllEnvs());
it('requires verified admin access and same-origin writes',async()=>{
  mocks.getSession.mockResolvedValue({data:null});expect((await GET(new Request('https://example.test/admin/discovery'))).status).toBe(303);expect((await POST(request())).status).toBe(403);
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(false);expect((await GET(new Request('https://example.test/admin/discovery'))).status).toBe(403);
  mocks.isAdmin.mockReturnValue(true);expect((await POST(request('https://untrusted.test'))).status).toBe(403);expect(mocks.connect).not.toHaveBeenCalled();
});
it('renders a selected source safely and labels unassessed retrieval accurately',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  const row={id:digest('candidate').slice(0,32),title:'<Builder>',source_id:'ashby:example',location:'Remote',location_hint:'unknown',score:80,current_hash:digest('source'),canonical_url:'https://jobs.ashbyhq.com/example/one',last_seen_at:new Date(),signals:{},has_text:true,review_id:null,assessment_id:null,assessment:null};
  mocks.query.mockResolvedValueOnce({rows:[row]}).mockResolvedValueOnce({rows:[{...row,snapshot:{descriptionHtml:'<p>Build software with AI tools.</p><script>bad()</script>'}}]}).mockResolvedValueOnce({rows:[]});
  const response=await GET(new Request('https://example.test/admin/discovery?provider=unknown'));
  const html=await response.text();expect(response.status).toBe(200);expect(html).toContain('0 model-assessed');expect(html).toContain('&lt;Builder&gt;');expect(html).not.toContain('<script>bad()');expect(mocks.query.mock.calls[0][1]).toEqual(['all','us_or_unknown']);
});
it('saves a decision transactionally and advances to the next suggested job',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);
  mocks.query.mockResolvedValue({rows:[]});
  const response=await POST(request());expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('saved=yes');expect(response.headers.get('location')).toContain('#selected-title');
  expect(mocks.query.mock.calls.map(call=>call[0])).toEqual(['begin','commit','select job_id from board_candidate_drafts where candidate_id=$1']);expect(mocks.release).toHaveBeenCalled();expect(mocks.save).toHaveBeenCalled();
});
it('rolls back changed-source conflicts without saving a replacement decision',async()=>{
  mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);mocks.save.mockRejectedValue(new CandidateReviewError('Source changed'));
  expect((await POST(request())).status).toBe(409);expect(mocks.query.mock.calls.map(call=>call[0])).toEqual(['begin','rollback']);
});

it('keeps a blocked automatic publication hidden and opens its exception',async()=>{
 mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);mocks.query.mockResolvedValue({rows:[{job_id:'candidate-draft'}]});
 const response=await POST(request());expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('/admin/maintenance/candidate-draft?saved=held');expect(mocks.autoPublish).toHaveBeenCalledOnce();
});
it('advances to the next role when automatic publication succeeds',async()=>{
 mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);mocks.query.mockResolvedValue({rows:[{job_id:'candidate-draft'}]});mocks.autoPublish.mockResolvedValue({status:'published',issues:[]});
 const response=await POST(request());expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('published=yes');expect(response.headers.get('location')).toContain('/admin/discovery?');
});
it('reports a closed employer posting without opening an unavailable draft page',async()=>{
 mocks.getSession.mockResolvedValue({data:{user:{id:'owner'}}});mocks.isAdmin.mockReturnValue(true);mocks.query.mockResolvedValue({rows:[{job_id:'candidate-draft'}]});mocks.autoPublish.mockResolvedValue({status:'closed',issues:['The employer has closed the posting.']});
 const response=await POST(request());expect(response.status).toBe(303);expect(response.headers.get('location')).toContain('closed=yes');expect(response.headers.get('location')).toContain('/admin/discovery?');
});
