/** Salary means an employer-published USD annual base range. A range matches if its upper end reaches the selected threshold. */
export function matchesSalary(job, minimum=0, includeUnknown=false) {
  if (!minimum) return true;
  const pay=job.compensation;
  if (!pay || pay.currency!=='USD' || pay.period!=='year' || pay.kind!=='base') return includeUnknown;
  return pay.max>=minimum;
}
export const locationKey=(city,arrangement)=>city.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'--'+arrangement.toLowerCase();
export function locationOptions(jobs) {
  const options=new Map();
  for(const job of jobs){
    if(!['Hybrid','Onsite'].includes(job.arrangement))continue;
    for(const city of new Set(job.cities||[])){
      const key=locationKey(city,job.arrangement),option=options.get(key)||{key,city,arrangement:job.arrangement,count:0};
      option.count++;options.set(key,option);
    }
  }
  return [...options.values()].sort((a,b)=>a.city.localeCompare(b.city)||a.arrangement.localeCompare(b.arrangement));
}
export function matchesLocation(job,selectedCities=[],includeRemote=true) {
  if(job.arrangement==='Remote')return includeRemote;
  return (job.cities||[]).some(city=>selectedCities.includes(locationKey(city,job.arrangement)));
}
export function matchesBaseFilters(job, filters) {
  return (filters.focus==='all'||job.focus===filters.focus)
    && (filters.gate==='all'||job.gate===filters.gate)
    && (!filters.query||[job.company,job.title,job.focus,job.problem,job.building].some(value=>value.toLowerCase().includes(filters.query.toLowerCase())))
    && matchesSalary(job,filters.salary,filters.unknownPay);
}
export function matchesJob(job,filters) {
  return matchesBaseFilters(job,filters)&&matchesLocation(job,filters.cities,filters.includeRemote);
}
