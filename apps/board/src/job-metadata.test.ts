import {expect,it} from 'vitest';
import {readCatalog} from './catalog.js';
import {jobPostingData,safeJsonLd} from './job-metadata.js';

const catalog=await readCatalog('catalog/jobs.json');
const example=catalog[0]!;
it('uses only an employer publication date for structured job data',()=>{
  expect(jobPostingData({...example,originalPublishedAt:null})).toBeNull();
  const dated={...example,originalPublishedAt:'2026-11-01T00:00:00.000Z',arrangement:'Remote' as const,remoteScope:'US' as const,cities:[]};
  const data=jobPostingData(dated);
  expect(data?.datePosted).toBe('2026-11-01T00:00:00.000Z');
  expect(data?.jobLocationType).toBe('TELECOMMUTE');
  expect(data).not.toHaveProperty('baseSalary');
});
it('does not claim unsupported remote eligibility or physical geography',()=>{
  const dated={...example,originalPublishedAt:'2026-11-01T00:00:00.000Z',arrangement:'Remote' as const,remoteScope:null,cities:[]};
  expect(jobPostingData(dated)).toBeNull();
  expect(jobPostingData({...dated,arrangement:'Hybrid',cities:['New York, NY']})?.jobLocation).toEqual([{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:'New York',addressRegion:'NY',addressCountry:'US'}}]);
});
it('escapes employer text inside a JSON script element',()=>{
  expect(safeJsonLd({description:'</script><script>alert(1)</script>'})).not.toContain('</script>');
});
