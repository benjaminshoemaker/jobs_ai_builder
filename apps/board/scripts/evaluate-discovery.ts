import {Client} from 'pg';
import {reviewMetrics} from '../src/review-evaluation.js';
if(!process.env.DATABASE_URL_UNPOOLED||process.env.VERCEL_ENV==='production')throw new Error('Preview database required');
const client=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await client.connect();
try{
  const {rows}=await client.query(`select a.classifier_version,a.calibration_version,a.model,a.result->>'fit' as prediction,r.decision from (select distinct on(candidate_id,source_hash,classifier_version,calibration_version,model) * from board_candidate_assessments order by candidate_id,source_hash,classifier_version,calibration_version,model,created_at desc,id desc) a join lateral(select decision,purpose from board_candidate_reviews where candidate_id=a.candidate_id and source_hash=a.source_hash order by created_at desc,id desc limit 1)r on r.purpose='evaluation'`);
  const groups=new Map<string,typeof rows>();for(const row of rows){const key=JSON.stringify([row.classifier_version,row.calibration_version,row.model]);groups.set(key,[...(groups.get(key)??[]),row]);}
  console.log(JSON.stringify({scope:'Reviewed held-out source versions only; no population-level accuracy or recall claim',results:[...groups.entries()].map(([key,values])=>({version:JSON.parse(key),...reviewMetrics(values)})),requests:0},null,2));
}finally{await client.end();}
