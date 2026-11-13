import {beforeEach,expect,it,vi} from 'vitest';
import {JobSchema} from './catalog.js';
import {automaticPublicationIssues,automaticPublishCandidate} from './automatic-publication.js';
import {recordVersion} from './editorial-review.js';
import {editorialPage} from './editorial-page.js';

const mocks=vi.hoisted(()=>({load:vi.fn(),commit:vi.fn()}));
vi.mock('./editorial-store',()=>({loadReview:mocks.load,commitReview:mocks.commit}));
const source={title:'AI Builder',descriptionHtml:'<p>Own user problems and ship useful tools with AI. No prior software engineering background required. Remote in the United States.</p>',text:'Own user problems and ship useful tools with AI.',location:'Remote, United States',secondaryLocations:[],workplaceType:'Remote',isRemote:true,compensation:null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:'https://jobs.ashbyhq.com/example/one',applyUrl:'https://jobs.ashbyhq.com/example/one'};
const record=JobSchema.parse({id:'candidate-abc',company:'Example',title:'AI Builder',logo:'/logos/company-placeholder.svg',url:source.canonicalUrl,status:'draft',checkedAt:new Date().toISOString(),location:'Remote, United States',workplace:'Remote, United States',arrangement:'Remote',cities:[],remoteScope:'US',focus:'Product',gate:'open',gateLabel:'No prior SWE experience required',pay:'Not disclosed',payDetail:'No salary in source.',reason:'Own user problems and ship with AI.',problem:'Own user problems.',building:'Ship tools with AI.',delivery:'Ships to users.',qualifications:'No prior SWE experience required.',descriptionHtml:source.descriptionHtml});
const row=()=>({id:record.id,record,decision:'approved',reference_id:record.id,check_id:'11111111-1111-4111-8111-111111111111',disposition:'needs_review',checked_at:new Date(),outcome:'needs_review',snapshot:source,note:'Verified open',changed_fields:[],preparation_status:'succeeded',preparation_result:{issues:[],fields:{problem:'Own user problems.',building:'Ship tools with AI.',qualifications:'No prior SWE experience required.',evidence:{company:[],focus:[],gate:[],location:[],pay:[],problem:['Own user problems'],building:['ship useful tools with AI'],delivery:[],qualifications:['No prior software engineering background required']}}}});
const db={query:vi.fn()};
beforeEach(()=>{vi.resetAllMocks();mocks.load.mockResolvedValue(row());db.query.mockResolvedValue({rows:[]});});

it('publishes only after a fresh open check and verified complete fields',async()=>{
 const recheck=vi.fn().mockResolvedValue('needs_review'),prepare=vi.fn().mockResolvedValue({status:'succeeded'});
 expect(await automaticPublishCandidate(db as never,record.id,'owner',{recheck,prepare})).toEqual({status:'published',issues:[]});
 expect(recheck).toHaveBeenCalledOnce();expect(prepare).toHaveBeenCalledOnce();expect(mocks.commit).toHaveBeenCalledOnce();
 expect(mocks.commit.mock.calls[0][2]).toMatchObject({action:'approve',recordVersion:recordVersion(record)});
 expect(db.query.mock.calls.map(call=>call[0])).toEqual(['begin','commit']);
});
it('holds a changed posting without preparing or publishing',async()=>{
 mocks.load.mockResolvedValueOnce(row()).mockResolvedValueOnce({...row(),changed_fields:['description']});
 const prepare=vi.fn();
 const result=await automaticPublishCandidate(db as never,record.id,'owner',{recheck:vi.fn().mockResolvedValue('needs_review'),prepare});
 expect(result.status).toBe('held');expect(result.issues.join(' ')).toContain('changed');expect(prepare).not.toHaveBeenCalled();expect(mocks.commit).not.toHaveBeenCalled();
});
it('reports a confirmed employer closure without opening the publication path',async()=>{
 const prepare=vi.fn();
 expect(await automaticPublishCandidate(db as never,record.id,'owner',{recheck:vi.fn().mockResolvedValue('closed'),prepare})).toEqual({status:'closed',issues:['The employer has closed the posting.']});
 expect(prepare).not.toHaveBeenCalled();expect(mocks.commit).not.toHaveBeenCalled();
});
it('holds unsupported location, missing summaries and failed preparation',async()=>{
 expect(automaticPublicationIssues({...row(),record:{...record,remoteScope:null}})).toContain('U.S. remote hiring eligibility is not confirmed.');
 expect(automaticPublicationIssues({...row(),record:{...record,arrangement:'Hybrid',cities:['London'],location:'London, UK',remoteScope:null}})).toContain('A U.S. office city and location are not confirmed.');
 expect(automaticPublicationIssues({...row(),preparation_result:{issues:[],fields:{problem:'',building:'',qualifications:''}}})).toContain('The problem, personal building, or qualifications summary lacks source support.');
 const result=await automaticPublishCandidate(db as never,record.id,'owner',{recheck:vi.fn().mockResolvedValue('needs_review'),prepare:vi.fn().mockResolvedValue({status:'failed'})});
 expect(result.status).toBe('held');expect(mocks.commit).not.toHaveBeenCalled();
});
it('shows the precise hold reason before optional source diagnostics',async()=>{
 const html=await editorialPage({...row(),record:{...record,remoteScope:null}}).text();
 expect(html).toContain('Why this role is still hidden');
 expect(html).toContain('U.S. remote hiring eligibility is not confirmed.');
 expect(html).toContain('<summary>Employer text and source metadata</summary>');
 expect(html).toContain('<summary>Manually resolve listing fields</summary>');
 expect(automaticPublicationIssues({...row(),changed_fields:['new_role','location']})).toContain('A fresh employer check is required before this older draft can be published.');
});
