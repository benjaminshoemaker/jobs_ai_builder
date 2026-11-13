import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {JobSchema} from './catalog.js';
import {approvedRecord,checkReviewVersion,recordVersion,type ReviewRow} from './editorial-review.js';
import {observationHash} from './listing-maintenance.js';
import {editorialPage} from './editorial-page.js';
const now=Date.parse('2026-10-29T12:00:00Z');
const job=JobSchema.parse({...JSON.parse(readFileSync(new URL('../catalog/jobs.json',import.meta.url),'utf8'))[0],status:'draft'});
const row:ReviewRow={id:job.id,record:job,decision:'approved',reference_id:'example',check_id:randomUUID(),disposition:'needs_review',checked_at:new Date(now-3600000),outcome:'needs_review',note:'Source changed',changed_fields:['description'],snapshot:{title:'Updated builder title',descriptionHtml:job.descriptionHtml+'<p>New scope</p>',text:'',location:null,secondaryLocations:[],workplaceType:null,isRemote:null,compensation:null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:job.url,applyUrl:job.url}};
const action={action:'approve' as const,checkId:row.check_id,recordVersion:recordVersion(job),sourceHash:observationHash(row.snapshot!),note:'Reconciled'};
const fields={workplace:'Onsite in Chandler, AZ',location:'Chandler, AZ',cities:'Chandler, AZ',arrangement:'Onsite',remoteScope:'',focus:'Operations',gate:'open',gateLabel:'No SWE background required',payMin:'60000',payMax:'110000',payPeriod:'year',payKind:'unspecified',payText:'Employer pay range',payDetail:'Pay type unspecified.',reason:job.reason,problem:job.problem,building:job.building,delivery:job.delivery,qualifications:job.qualifications,confirmed:'yes'};
it('binds approval to the exact listing, latest check and source version',()=>{
  expect(()=>checkReviewVersion(row,action,now)).not.toThrow();
  for(const patch of [{checkId:randomUUID()},{recordVersion:'a'.repeat(64)},{sourceHash:'b'.repeat(64)}])expect(()=>checkReviewVersion(row,{...action,...patch},now)).toThrow('changed');
  for(const patch of [{record:{...job,status:'published' as const}},{decision:'rejected'}])expect(()=>checkReviewVersion({...row,...patch},action,now)).toThrow('no longer');
});
it('blocks approval after a failed, missing, stale or future source check but permits withdrawal',()=>{
  for(const patch of [{disposition:'retry',outcome:'retry'},{checked_at:new Date(now-2*86400000)},{checked_at:new Date(now+86400000)}]){
    expect(()=>checkReviewVersion({...row,...patch},action,now)).toThrow('successful source check');
    expect(()=>checkReviewVersion({...row,...patch},{...action,action:'withdraw'},now)).not.toThrow();
  }
});
it('publishes current employer text and reconciled metadata while retaining source check time and recency',()=>{
  const record=approvedRecord(row,fields);
  expect(record.status).toBe('published');expect(record.title).toBe('Updated builder title');
  expect(record.descriptionHtml).toContain('New scope');expect(record.checkedAt).toBe(new Date(row.checked_at).toISOString());
  expect(record.originalPublishedAt).toBe(job.originalPublishedAt);expect(record.firstSeenAt).toBe(job.firstSeenAt);
  expect(record.cities).toEqual(['Chandler, AZ']);expect(record.pay).toBe('$60,000–$110,000 / year');
  expect(record.compensation?.kind).toBe('unspecified');
});
it('requires attestation, explicit remote eligibility and internally valid pay ranges',()=>{
  for(const patch of [{confirmed:''},{cities:''},{payMax:''},{payMax:'50000'},{payMin:'NaN'},{arrangement:'Remote',remoteScope:''}])expect(()=>approvedRecord(row,{...fields,...patch})).toThrow();
  const unknown=approvedRecord(row,{...fields,payMin:'',payMax:'',payText:'Conflicting ranges; see employer posting'});
  expect(unknown.compensation).toBeNull();expect(unknown.pay).toContain('Conflicting');
});
it('renders editable fields and version tokens without allowing source scripts to execute',async()=>{
  const html=await editorialPage({...row,snapshot:{...row.snapshot!,descriptionHtml:row.snapshot!.descriptionHtml+'<script>bad()</script>'}},now).text();
  expect(html).toContain('name="checkId"');expect(html).toContain('name="payMin"');
  expect(html).toContain('Approve &amp; publish');expect(html).toContain('Withdraw listing');
  expect(html).not.toContain('<script>bad()');
});
it('saves source-bound display preparation as a hidden draft without inventing remote eligibility',async()=>{
  const {reconciledDraft}=await import('./editorial-review.js');
  const names=['location','workplace','arrangement','cities','remoteScope','focus','gate','gateLabel','pay','payDetail','compensation','reason','problem','building','delivery','qualifications'] as const;
  const display=Object.fromEntries(names.map(k=>[k,job[k]]));
  const prepared=reconciledDraft(row,action,{...display,arrangement:'Remote',remoteScope:null,cities:[],pay:'Not disclosed',compensation:null},now);
  expect(prepared.status).toBe('draft');expect(prepared.remoteScope).toBeNull();expect(prepared.compensation).toBeNull();expect(prepared.firstSeenAt).toBe(job.firstSeenAt);
  expect(()=>reconciledDraft(row,action,{...display,status:'published'},now)).toThrow('Invalid draft');
  expect(()=>reconciledDraft(row,{...action,sourceHash:'0'.repeat(64)},display,now)).toThrow('changed');
});
