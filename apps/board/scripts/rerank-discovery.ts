import {Client} from 'pg';
import {retrievalSignals} from '../src/broad-discovery.js';
if(!process.argv.includes('--apply')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit preview --apply required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
try{
  const {rows}=await client.query('select c.id,c.title,c.location,c.current_hash,v.snapshot from board_discovery_candidates c join board_discovery_versions v on v.candidate_id=c.id and v.content_hash=c.current_hash');
  await client.query('begin');
  for(let i=0;i<rows.length;i+=500){
    const batch=rows.slice(i,i+500).map(row=>{const r=retrievalSignals(row.title,row.snapshot.descriptionHtml,row.location);return {id:row.id,hash:row.current_hash,score:r.score,signals:r.signals,hint:r.locationHint};});
    await client.query(`update board_discovery_candidates c set score=x.score,signals=x.signals,location_hint=x.hint from jsonb_to_recordset($1::jsonb) as x(id text,hash text,score integer,signals jsonb,hint text) where c.id=x.id and c.current_hash=x.hash`,[JSON.stringify(batch)]);
  }
  await client.query('commit');console.log(JSON.stringify({reranked:rows.length,employerRequests:0,classification:'unassessed',freshnessChanged:false,published:0}));
}catch(error){await client.query('rollback');throw error;}finally{await client.end();}
