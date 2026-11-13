import { readFile } from 'node:fs/promises';
import { z } from 'zod';
const https = z.string().url().refine(value => value.startsWith('https://'));
const CompensationSchema=z.object({currency:z.literal('USD'),period:z.enum(['year','hour']),kind:z.enum(['base','unspecified']),min:z.number().nonnegative(),max:z.number().nonnegative()}).refine(pay=>pay.max>=pay.min,'Salary maximum must not be below minimum');
export const JobSchema = z.object({
  originalPublishedAt:z.string().datetime({offset:true}).nullable().default(null),
  firstSeenAt:z.string().datetime({offset:true}).nullable().default(null),
  compensation:CompensationSchema.nullable().default(null),
  locationTags:z.array(z.string().min(1)).default([]),
  cities:z.array(z.string().min(1)).default([]),
  remoteScope:z.literal('US').nullable().default(null),
  id:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), company:z.string().min(1), title:z.string().min(1),
  logo:z.string().regex(/^\/logos\/[a-z0-9.-]+$/), url:https, status:z.enum(['sample','draft','published','closed']),
  checkedAt:z.string().datetime({offset:true}), location:z.string(), workplace:z.string().min(1),
  arrangement:z.enum(['Remote','Hybrid','Onsite','Unknown']), focus:z.string().min(1),
  gate:z.enum(['open','required','unclear']), gateLabel:z.string(), pay:z.string(), payDetail:z.string(),
  reason:z.string(), problem:z.string(), building:z.string(), delivery:z.string(), qualifications:z.string(),
  descriptionHtml:z.string().min(100).refine(html=>!/<\/?(?!p\b|ul\b|ol\b|li\b|strong\b|em\b|b\b|i\b|br\b|blockquote\b|hr\b|h4\b)[a-z]|<[a-z][^>]*\s[a-z-]+\s*=/i.test(html),'Descriptions must use sanitized, attribute-free formatting'),
}).refine(job=>['draft','closed'].includes(job.status)||(job.arrangement!=='Unknown'&&(job.arrangement==='Remote'||job.cities.length>0)), 'Visible roles require a confirmed work arrangement and explicit cities for office roles');
export type Job = z.infer<typeof JobSchema>;
export const CatalogSchema=z.array(JobSchema).superRefine((jobs,ctx)=>{
 const ids=new Set<string>(),urls=new Set<string>();
 jobs.forEach((job,index)=>{if(ids.has(job.id)||urls.has(job.url))ctx.addIssue({code:'custom',path:[index],message:'Duplicate job ID or employer URL'});ids.add(job.id);urls.add(job.url);});
});
export async function readCatalog(path:string){return CatalogSchema.parse(JSON.parse(await readFile(path,'utf8')));}
export function visibleJobs(jobs:Job[],now=Date.now()){
 const recency=(job:Job)=>Date.parse(job.originalPublishedAt??job.firstSeenAt??'')||0;
 return jobs.filter(job=>job.status==='sample'||(job.status==='published'&&Date.parse(job.checkedAt)<=now&&now-Date.parse(job.checkedAt)<=7*86400000))
  .sort((a,b)=>recency(b)-recency(a)||a.id.localeCompare(b.id));
}
