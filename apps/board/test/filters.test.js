import {expect,it} from 'vitest';
import {matchesSalary,matchesLocation,matchesJob,locationOptions,locationKey} from '../public/filters.js';
const job={company:'Example',title:'Builder',focus:'Product',gate:'open',arrangement:'Hybrid',problem:'Own outcomes',building:'Ship tools',location:'San Francisco, CA',workplace:'Hybrid in San Francisco',cities:['San Francisco, CA'],remoteScope:null,compensation:{currency:'USD',period:'year',kind:'base',min:110000,max:150000}};
it('uses published annual USD base range maximum, including boundaries',()=>{
 expect(matchesSalary(job,150000)).toBe(true);expect(matchesSalary(job,150001)).toBe(false);expect(matchesSalary(job,0)).toBe(true);
});
it('does not mix unknown, unspecified, hourly or non-USD compensation into a base-pay filter',()=>{
 for(const compensation of [null,{...job.compensation,kind:'unspecified'},{...job.compensation,period:'hour'},{...job.compensation,currency:'EUR'}]){
 expect(matchesSalary({...job,compensation},100000)).toBe(false);expect(matchesSalary({...job,compensation},100000,true)).toBe(true);
 }
});
it('builds deduplicated city and arrangement choices from the eligible jobs',()=>{
 const other={...job,arrangement:'Onsite'},remote={...job,arrangement:'Remote',cities:['San Francisco, CA']};
 const options=locationOptions([job,job,other,remote]);
 expect(options).toHaveLength(2);expect(options.find(o=>o.arrangement==='Hybrid').count).toBe(2);expect(options.find(o=>o.arrangement==='Onsite').count).toBe(1);
});
it('selects city/arrangement combinations with OR semantics and supports multiple job cities',()=>{
 const sf=locationKey('San Francisco, CA','Hybrid'),ny=locationKey('New York, NY','Hybrid');
 expect(matchesLocation(job,[sf],false)).toBe(true);expect(matchesLocation(job,[locationKey('San Francisco, CA','Onsite')],false)).toBe(false);
 expect(matchesLocation({...job,cities:['New York, NY','San Francisco, CA']},[ny],false)).toBe(true);expect(matchesLocation(job,[],false)).toBe(false);
});
it('remote checkbox independently includes or excludes remote roles',()=>{
 const remote={...job,arrangement:'Remote',cities:[]};
 expect(matchesLocation(remote,[],true)).toBe(true);expect(matchesLocation(remote,[locationKey('San Francisco, CA','Hybrid')],false)).toBe(false);
});
it('combines selected cities and salary with the existing filters',()=>{
 const f={focus:'all',gate:'all',query:'tools',salary:150000,unknownPay:false,cities:[locationKey('San Francisco, CA','Hybrid')],includeRemote:false};
 expect(matchesJob(job,f)).toBe(true);expect(matchesJob(job,{...f,salary:200000})).toBe(false);expect(matchesJob(job,{...f,cities:[]})).toBe(false);expect(matchesJob(job,{...f,focus:'Design'})).toBe(false);
 expect(locationOptions([job].filter(j=>matchesJob(j,{...f,salary:200000})))).toEqual([]);
});
