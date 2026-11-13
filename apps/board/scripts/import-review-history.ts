import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ReferenceSchema, historicalDecision, postingIdentity, roleParts, digest } from '../src/review-history.js';

if (!process.argv.includes('--apply')) throw new Error('Explicit --apply is required');
if (process.env.VERCEL_ENV === 'production') throw new Error('Historical import is restricted to the preview/development database');
if (!process.env.DATABASE_URL_UNPOOLED) throw new Error('DATABASE_URL_UNPOOLED is required');
const root = resolve(import.meta.dirname, '../../..');
async function artifact(path: string) { const text = await readFile(resolve(root,path),'utf8'); return { path, hash: digest(text), data: JSON.parse(text) }; }
const refs = await artifact('packages/core/src/prototype/references.json');
const references = z.array(ReferenceSchema).parse(refs.data);
const batch = await artifact('research/source-hidden-review-batch-1-labels-2026-10-27.json');
const fresh = await artifact('research/fresh-review-labels-2026-10-28.json');
const pilot = await artifact('research/discovery-pilot-2026-10-21.json');
const notes = await readFile(resolve(root,'INITIAL_NOTES.md'),'utf8');
// URLs explicitly recorded in the user's prior review table; no search-result identity substitution.
const recovered: Record<string,string> = {
  rwe: 'https://jobs.rwe.com/RWE/job/Austin-Sr-Product-Manager%2C-AI-Transformation-TX-78701/1415821833/',
  toast: 'https://careers.toasttab.com/jobs/gtm-engineer-sales-workflow-automation-revenue-intelligence-remote-united-states',
  extenteam: 'https://job-boards.greenhouse.io/extenteamcareers/jobs/5254865008',
};
for (const url of Object.values(recovered)) if (!notes.includes(url)) throw new Error('Recovered identity lacks supporting review notes');
const client = new Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await client.connect();
try {
  await client.query('begin');
  let evidenceCount = 0;
  const addEvidence = async (roleId: string, source: Awaited<ReturnType<typeof artifact>>, id: string, kind: string, record: unknown) => {
    const key=digest(JSON.stringify([roleId,source.path,source.hash,id,kind]));
    await client.query('insert into board_review_evidence(id,role_id,artifact_path,artifact_hash,source_record_id,evidence_kind,record) values ($1,$2,$3,$4,$5,$6,$7) on conflict do nothing',[key,roleId,source.path,source.hash,id,kind,record]); evidenceCount++;
  };
  for (const reference of references) {
    const url = reference.url ?? recovered[reference.id];
    const { company, title } = roleParts(reference.role);
    await client.query(`insert into board_review_roles(id,identity_key,company,title,canonical_url,historical_label,decision,user_focus,historical_reason,provenance)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict(id) do nothing`, [reference.id,postingIdentity(url,reference.id),company,title,url??null,reference.label,historicalDecision(reference.label),reference.focus?JSON.stringify(reference.focus):null,reference.reason,JSON.stringify({source:refs.path,hash:refs.hash,reasonKind:'compiled paraphrase of user judgment',reviewedAt:null,datePrecision:'unknown',reviewedFullDescriptionAvailable:false,calibrationOnly:true,identityRecovery:reference.url?null:url?'INITIAL_NOTES.md':null})]);
    await addEvidence(reference.id,refs,reference.id,'compiled_user_reference',reference);
    const original = pilot.data.user_reference_set.find((r: {id:string}) => r.id === reference.id);
    if (original) await addEvidence(reference.id,pilot,reference.id,'historical_user_reference',original);
    for (const candidate of pilot.data.candidates) {
      if (!candidate.url || postingIdentity(candidate.url,'') !== postingIdentity(url,reference.id)) continue;
      if (candidate.prior_user_label) await addEvidence(reference.id,pilot,String(candidate.id)+':prior','historical_user_reference',{ label:candidate.prior_user_label,company:candidate.company,title:candidate.title,url:candidate.url });
      if (candidate.user_review) await addEvidence(reference.id,pilot,String(candidate.id)+':review','recorded_user_review',candidate.user_review);
    }
    if (reference.id.startsWith('batch1_')) {
      const id=reference.id.slice(7).toUpperCase(); const label=batch.data.labels.find((r:{id:string})=>r.id===id);
      if (!label) throw new Error(`Missing original batch label: ${id}`);
      await addEvidence(reference.id,batch,id,'recorded_user_reply',label);
    }
    if (reference.id.startsWith('fresh_20261028_')) {
      const id=reference.id.slice(-3).toUpperCase(); const label=fresh.data.labels.find((r:{id:string})=>r.id===id);
      if (!label || label.label !== reference.label) throw new Error(`Fresh user label mismatch: ${id}`);
      await addEvidence(reference.id,fresh,id,'recorded_user_reply',label);
    }
  }
  await client.query('commit');
  const summary=await client.query('select decision,count(*)::int as roles from board_review_roles group by decision order by decision');
  console.log(JSON.stringify({references:references.length,evidenceRecordsProcessed:evidenceCount,decisions:summary.rows,published:0,notes:'Evidence copies are provenance, not independent additional reviews. Frozen predictions and unreviewed follow-up batches were not imported as user decisions.'}));
} catch(error) { await client.query('rollback'); throw error; }
finally { await client.end(); }
