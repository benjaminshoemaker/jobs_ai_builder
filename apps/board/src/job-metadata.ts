import type {Job} from './catalog.js';

export function jobPostingData(job:Job){
  // Google's datePosted means the employer's original date, not our first sighting.
  if(!job.originalPublishedAt)return null;
  const locations=job.cities.map(city=>{
    const match=/^(.+),\s*([A-Z]{2})$/.exec(city);
    return match?{'@type':'Place',address:{'@type':'PostalAddress',addressLocality:match[1],addressRegion:match[2],addressCountry:'US'}}:null;
  }).filter((value):value is NonNullable<typeof value>=>!!value);
  const remote=job.arrangement==='Remote'&&job.remoteScope==='US';
  if(!locations.length&&!remote)return null;
  return {'@context':'https://schema.org','@type':'JobPosting',title:job.title,description:job.descriptionHtml,datePosted:job.originalPublishedAt,hiringOrganization:{'@type':'Organization',name:job.company},...(locations.length?{jobLocation:locations}:{}),...(remote?{jobLocationType:'TELECOMMUTE',applicantLocationRequirements:{'@type':'Country',name:'USA'}}:{})};
}
export function safeJsonLd(value:unknown){return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');}
