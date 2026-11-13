import {it,expect} from 'vitest';import {readFileSync} from 'node:fs';
import {JobSchema,visibleJobs} from './catalog.js';import {checkedListingFields,preparedListing,listingFieldsRequest} from './listing-fields.js';
const text='Own product discovery and identify user problems. Build and ship software with Claude Code. No prior software engineering experience required. Remote, United States. Base salary $140k - 160k per year.';
const snapshot={title:'AI Product Builder',descriptionHtml:'<p>'+text+'</p>',text,location:'Remote, United States',secondaryLocations:[],workplaceType:'Remote',isRemote:true,compensation:null,metadata:[],originalPublishedAt:null,lastPublishedAt:null,canonicalUrl:'https://example.com/job',applyUrl:'https://example.com/job'};
const fields={company:null,focus:'Product',gate:'open' as const,gateLabel:'No prior software engineering experience required',arrangement:'Remote' as const,location:'Remote, United States',cities:[],remoteUS:true,pay:{min:140000,max:160000,period:'year' as const,currency:'USD' as const,kind:'base' as const},payDetail:'Employer base salary range.',problem:'Own product discovery.',building:'Build and ship software with AI.',delivery:'Ship working software.',qualifications:'No previous SWE career required.',evidence:{company:[],focus:['Own product discovery'],gate:['No prior software engineering experience required.'],location:['Remote, United States'],pay:['Base salary $140k - 160k per year.'],problem:['Own product discovery and identify user problems.'],building:['Build and ship software with Claude Code.'],delivery:['Build and ship software with Claude Code.'],qualifications:['No prior software engineering experience required.']}};
const job=JobSchema.parse({...JSON.parse(readFileSync(new URL('../catalog/jobs.json',import.meta.url),'utf8'))[0],status:'draft'});
it('prepares editable fields with exact source support while retaining draft status and recency',()=>{
 const prepared=preparedListing(job,checkedListingFields(fields,snapshot));expect(prepared.record.status).toBe('draft');expect(prepared.record.firstSeenAt).toBe(job.firstSeenAt);expect(prepared.record.compensation).toEqual({currency:'USD',period:'year',kind:'base',min:140000,max:160000});expect(prepared.record.remoteScope).toBe('US');expect(prepared.issues).toEqual([]);expect(visibleJobs([prepared.record])).toEqual([]);
 expect(listingFieldsRequest(snapshot,'Example').store).toBe(false);
});
it('rejects invented evidence, unproved numeric amounts and unsupported base-pay claims',()=>{
 expect(()=>checkedListingFields({...fields,evidence:{...fields.evidence,gate:['Five years required.']}},snapshot)).toThrow('does not match');
 expect(()=>checkedListingFields({...fields,pay:{...fields.pay,max:200000}},snapshot)).toThrow('amounts');
 const noBase={...snapshot,descriptionHtml:snapshot.descriptionHtml.replace('Base salary','Salary')};expect(()=>checkedListingFields({...fields,evidence:{...fields.evidence,pay:['Salary $140k - 160k per year.']}},noBase)).toThrow('Base-pay');
 expect(()=>checkedListingFields({...fields,evidence:{...fields.evidence,location:[]}},snapshot)).toThrow('Missing source');
 expect(()=>checkedListingFields({...fields,evidence:{...fields.evidence,building:[]}},snapshot)).toThrow('Missing source evidence for building');
});
it('keeps unknown pay, arrangement and remote eligibility explicit in hidden drafts',()=>{
 const unknown={...fields,arrangement:null,remoteUS:null,focus:null,pay:{min:null,max:null,currency:null,period:null,kind:'unspecified' as const},evidence:{...fields.evidence,focus:[],location:[],pay:[]}};
 const prepared=preparedListing(job,checkedListingFields(unknown,snapshot));expect(prepared.record.arrangement).toBe('Unknown');expect(prepared.record.compensation).toBeNull();expect(prepared.record.remoteScope).toBeNull();expect(prepared.issues).toContain('Confirm the work arrangement');expect(()=>JobSchema.parse({...prepared.record,status:'published'})).toThrow();
});
