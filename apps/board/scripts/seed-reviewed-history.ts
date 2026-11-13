import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JobSchema } from '../src/catalog.js';
import { postingIdentity, assertSeedSource } from '../src/review-history.js';

const apply=process.argv.includes('--apply');
if(!apply&&!process.argv.includes('--prepare'))throw new Error('Choose --prepare or --apply');
if(process.env.VERCEL_ENV==='production')throw new Error('Preview/development only');
if(!process.env.DATABASE_URL_UNPOOLED)throw new Error('DATABASE_URL_UNPOOLED is required');
const folder=resolve(import.meta.dirname,'../catalog');
const fields=JSON.parse(await readFile(resolve(folder,'history-seed-fields.json'),'utf8'));
const manifestPath=resolve(folder,'history-seed-versions-2026-10-29.json');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
try {
  const checks=await client.query(`select r.*,c.id as check_id,c.checked_at,c.outcome,c.content_hash,c.snapshot from board_review_roles r join lateral(select * from board_review_checks where role_id=r.id order by checked_at desc limit 1)c on true`);
  const selected=fields.map((field: {id:string})=>{
    const role=checks.rows.find(row=>row.id===field.id);
    if(!role)throw new Error(`Missing role: ${field.id}`);
    assertSeedSource(role);
    return {field,role};
  });
  if(!apply){await writeFile(manifestPath,JSON.stringify(selected.map(({role}:{role:typeof checks.rows[0]})=>({id:role.id,checkId:role.check_id,contentHash:role.content_hash})),null,2)+'\n');console.log(`Prepared ${selected.length} exact source versions for review`);}
  else {
    const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
    await client.query('begin');
    const locked=(await client.query("select pg_try_advisory_xact_lock(hashtext('board-listing-maintenance')) as locked")).rows[0].locked;
    if(!locked)throw new Error('Maintenance is active; initial seeding cannot run concurrently');
    const existing=(await client.query('select j.id,j.record,(s.job_id is not null) as maintained from board_jobs j left join board_maintenance_state s on s.job_id=j.id')).rows;
    for(const {field,role} of selected){
      const version=manifest.find((entry:{id:string})=>entry.id===role.id);
      if(!version||version.checkId!==role.check_id||version.contentHash!==role.content_hash)throw new Error('Source version changed after seed preparation');
      const prior=existing.find(row=>postingIdentity(row.record.url,'')===postingIdentity(role.canonical_url,role.id));
      if(prior?.maintained)throw new Error('Role has entered maintenance; reconcile it editorially instead of rerunning initial seeding');
      const pay=field.pay;
      const compensation=pay?{currency:'USD',min:pay[0],max:pay[1],period:pay[2],kind:pay[3]}:null;
      const format=(n:number)=>'$'+n.toLocaleString('en-US');
      const payText=field.payText??(pay?`${format(pay[0])}${pay[0]===pay[1]?'':'–'+format(pay[1])}${pay[2]==='hour'?' / hour':' base'}`:'Not published');
      const date=role.snapshot.originalPublishedAt;const originalPublishedAt=typeof date==='string'&&Number.isFinite(Date.parse(date))?new Date(date).toISOString():null;
      const record=JobSchema.parse({id:prior?.id??'reviewed-'+role.id.replaceAll('_','-'),company:role.company,title:role.snapshot.title.trim(),url:role.canonical_url,logo:prior?.record.logo??'/logos/company-placeholder.svg',status:'published',checkedAt:new Date(role.checked_at).toISOString(),location:field.cities.length?field.cities.join(' / '):field.remoteScope==='US'?'United States':'See employer restrictions',workplace:field.workplace,arrangement:field.arrangement,cities:field.cities,remoteScope:field.remoteScope??null,focus:field.focus,gate:field.gate,gateLabel:field.gateLabel,pay:payText,payDetail:field.payDetail??(pay?'Employer-published base compensation. See the full posting for benefits and any additional compensation.':'Employer has not published a compensation range in the captured posting.'),compensation,reason:field.reason,problem:field.reason,building:'Direct building is part of the current role mandate; see the employer responsibilities below for the specific artifacts and tools.',delivery:'The current role connects building to use, adoption, or delivery outcomes.',qualifications:field.gateLabel,descriptionHtml:role.snapshot.descriptionHtml,originalPublishedAt,firstSeenAt:null});
      await client.query('insert into board_jobs(id,record) values ($1,$2) on conflict(id) do update set record=excluded.record,updated_at=now()',[record.id,record]);
      await client.query(`insert into board_publication_provenance(job_id,reference_id,check_id,source_content_hash,reconciliation) values ($1,$2,$3,$4,$5) on conflict(job_id) do update set check_id=excluded.check_id,source_content_hash=excluded.source_content_hash,reconciliation=excluded.reconciliation,published_at=now()`,[record.id,role.id,role.check_id,role.content_hash,JSON.stringify({historicalApproval:role.historical_label,currentReconciliation:'Assistant checked current builder mandate, qualifications and public fields against the recorded positive example',fullHistoricalTextComparison:'Not proof of the exact original reviewed version; historical source evidence is retained separately',focusOrigin:role.user_focus?'user focus mapped to display label':'assistant interpretation; user did not supply a focus label',fieldManifest:'apps/board/catalog/history-seed-fields.json',sourceVersionManifest:'apps/board/catalog/history-seed-versions-2026-10-29.json'})]);
    }
    await client.query('commit');console.log(JSON.stringify({seeded:selected.length,publicLaunch:false,scheduledCollection:false}));
  }
}catch(error){await client.query('rollback');throw error;}
finally{await client.end();}
