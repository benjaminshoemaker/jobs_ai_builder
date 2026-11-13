import type { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { JobSchema, type Job } from './catalog.js';
import { digest } from './review-history.js';
import { maintenancePlan, observationHash, type EmployerSnapshot, type Observation } from './listing-maintenance.js';

// Caller owns the transaction. The row lock and expected version protect concurrent editor changes.
export async function applyObservation(client:Client,input:{runId:string;job:Job;baseline:EmployerSnapshot;observation:Observation;now:number}) {
  const {rows}=await client.query(`select j.record,r.decision,s.failures,c.snapshot from board_jobs j join board_publication_provenance p on p.job_id=j.id join board_review_roles r on r.id=p.reference_id join board_review_checks c on c.id=p.check_id left join board_maintenance_state s on s.job_id=j.id where j.id=$1 for update of j,r,p`,[input.job.id]);
  const current=rows[0],checkId=randomUUID(),checkedAt=new Date(input.now).toISOString();
  const superseded=!current||current.decision!=='approved'||digest(JSON.stringify(JobSchema.parse(current.record)))!==digest(JSON.stringify(input.job))||observationHash(current.snapshot)!==observationHash(input.baseline)||!['published','draft'].includes(current.record.status);
  const plan=superseded?null:maintenancePlan(JobSchema.parse(current.record),input.baseline,input.observation,current.failures??0,input.now);
  const snapshot=input.observation.kind==='open'?input.observation.snapshot:null;
  await client.query(`insert into board_maintenance_checks(id,run_id,job_id,checked_at,outcome,note,changed_fields,observed_hash,snapshot,previous_record) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[checkId,input.runId,input.job.id,checkedAt,plan?.outcome??'superseded',superseded?'Editorial decision or catalog record changed during the request; result not applied':input.observation.note,JSON.stringify(plan?.changed??[]),snapshot?observationHash(snapshot):null,snapshot,input.job]);
  if(!plan)return 'superseded';
  await client.query('update board_jobs set record=$2,updated_at=now() where id=$1',[input.job.id,plan.record]);
  await client.query(`insert into board_maintenance_state(job_id,check_id,disposition,failures,next_check_at) values($1,$2,$3,$4,$5) on conflict(job_id) do update set check_id=excluded.check_id,disposition=excluded.disposition,failures=excluded.failures,next_check_at=excluded.next_check_at`,[input.job.id,checkId,plan.outcome,plan.failures,plan.nextCheckAt]);
  return plan.outcome;
}
