import {createHash} from 'node:crypto';
type Lead = {id: string; source_id: string; score: number; provider: string};
// Alternate priority leads with deterministic samples from the lower score bands.
// Employer diversity avoids letting a single large feed dominate the trial.
export function assessmentSample<T extends Lead>(rows: T[], limit: number): T[] {
  const ranked = [...rows].sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  const hash = (id: string) => createHash('sha256').update('luna-trial-v1'+id).digest('hex');
  const random = (pool: T[]) => [...pool].sort((a,b) => hash(a.id).localeCompare(hash(b.id)));
  const cut = Math.ceil(ranked.length/3), pools = [ranked.slice(0,cut), random(ranked.slice(cut,cut*2)), random(ranked.slice(cut*2))];
  const selected: T[] = [], employers = new Set<string>(), providers = new Map<string,number>();
  while (selected.length < limit) {
    let added = false;
    for (const pool of pools) {
      const available = pool.filter(row => !selected.some(item => item.id === row.id));
      available.sort((a,b) => Number(employers.has(a.source_id))-Number(employers.has(b.source_id)) || (providers.get(a.provider)??0)-(providers.get(b.provider)??0));
      const row = available[0];
      if (row) {selected.push(row); employers.add(row.source_id); providers.set(row.provider,(providers.get(row.provider)??0)+1); added=true;}
      if (selected.length === limit) break;
    }
    if (!added) break;
  }
  return selected;
}

export function topAssessments<T extends Lead>(rows:T[],limit:number):T[]{
  return [...rows].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,limit);
}
