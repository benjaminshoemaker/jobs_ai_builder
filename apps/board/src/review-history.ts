import { createHash } from 'node:crypto';
import { z } from 'zod';
export const ReferenceSchema = z.object({ id: z.string(), role: z.string(), label: z.enum(['yes','no','maybe','stretch','engineering_first_blend','operations_builder']), reason: z.string(), url: z.string().url().optional(), focus: z.array(z.string()).optional() });
export type Reference = z.infer<typeof ReferenceSchema>;
export function historicalDecision(label: Reference['label']) {
  return label === 'no' ? 'rejected' : label === 'maybe' || label === 'stretch' ? 'uncertain' : 'approved';
}
export function postingIdentity(url: string | undefined, fallback: string) {
  if (!url) return `reference:${fallback}`;
  const u = new URL(url);
  const ashby = u.hostname === 'jobs.ashbyhq.com' && u.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (ashby) return `ashby:${ashby[1].toLowerCase()}:${ashby[2]}`;
  const greenhouse = /^(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io$/.test(u.hostname) && u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  if (greenhouse) return `greenhouse:${greenhouse[1].toLowerCase()}:${greenhouse[2]}`;
  u.hash = ''; u.search = ''; u.pathname = u.pathname.replace(/\/$/, '');
  return u.toString();
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function assertSeedSource(role: {decision:string;outcome:string;snapshot:unknown;content_hash:string|null;checked_at:Date|string}, now=Date.now()) {
  const checkedAt=new Date(role.checked_at).getTime();
  if(role.decision!=='approved'||role.outcome!=='open'||!role.snapshot||!role.content_hash)throw new Error('A current, approved employer snapshot is required');
  if(!Number.isFinite(checkedAt)||checkedAt>now||now-checkedAt>86400000)throw new Error('Recheck source before seeding');
}
export function roleParts(role: string) {
  const [company, ...title] = role.split(' — ');
  if (!company || !title.length) throw new Error('A reference must identify company and role separately');
  return { company, title: title.join(' — ') };
}
