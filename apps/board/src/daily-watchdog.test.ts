import {expect,it,vi} from 'vitest';
import {checkDailyHealth,dailyFailure,pacificHour,previewBackupProblem} from './daily-watchdog.js';

const now=Date.parse('2026-11-12T18:00:00Z');
function fixture(cycle='completed',digest='sent'){
  let alert:{state:string;recipient:string;subject:string;body:string;prepared_at:Date;provider_message_id:string|null}|undefined;
  const query=vi.fn(async(sql:string,params?:unknown[])=>{
    if(sql.startsWith('select state from board_daily_cycles'))return {rows:cycle?[{state:cycle}]:[]};
    if(sql.startsWith('select state from board_daily_digests'))return {rows:digest?[{state:digest}]:[]};
    if(sql.includes('pg_try_advisory_lock'))return {rows:[{locked:true}]};
    if(sql.startsWith('insert into board_daily_alerts')){
      alert??={state:'prepared',recipient:String(params?.[1]),subject:String(params?.[2]),body:String(params?.[3]),prepared_at:new Date(now-1000),provider_message_id:null};
      return {rows:[alert]};
    }
    if(sql.includes("set state='sent'")){alert!.state='sent';alert!.provider_message_id=String(params?.[1]);}
    return {rows:[]};
  });
  const mailer=vi.fn(async(_mail:{idempotencyKey:string;subject:string})=> 'mail-1');
  const options={recipient:'editor@example.test',from:'Board <digest@example.test>',origin:'https://preview.example.test',mailer,now};
  return {db:{query} as any,query,mailer,options};
}
it('uses the Pacific morning deadline across daylight-saving time',()=>{
  expect(pacificHour(Date.parse('2026-11-12T16:00:00Z'))).toBe(8);
  expect(pacificHour(Date.parse('2026-07-12T15:00:00Z'))).toBe(8);
});
it('does not alert before deadline or when both jobs succeeded',async()=>{
  const f=fixture();
  expect(await checkDailyHealth(f.db,{...f.options,now:Date.parse('2026-11-12T16:00:00Z')})).toMatchObject({state:'too_early'});
  expect(await checkDailyHealth(f.db,f.options)).toMatchObject({state:'healthy'});
  expect(f.mailer).not.toHaveBeenCalled();
});
it('sends one actionable alert for missing work and deduplicates retries',async()=>{
  const f=fixture('', 'failed');
  expect(dailyFailure(undefined,'failed')).toEqual(['Intake: missing','Review email: failed']);
  expect(await checkDailyHealth(f.db,f.options)).toMatchObject({state:'sent',messageId:'mail-1'});
  expect(await checkDailyHealth(f.db,f.options)).toMatchObject({state:'sent',messageId:'mail-1'});
  expect(f.mailer).toHaveBeenCalledOnce();
  expect(f.mailer.mock.calls[0][0]).toMatchObject({idempotencyKey:'builder-daily-alert-2026-11-12',subject:'Builder board needs attention · 2026-11-12'});
  expect(f.query.mock.calls.filter(([sql])=>String(sql).includes('pg_advisory_unlock'))).toHaveLength(2);
});
it('uses a separate, clearly labeled preview test alert',async()=>{
  const f=fixture();
  expect(await checkDailyHealth(f.db,{...f.options,test:true})).toMatchObject({state:'sent'});
  expect(f.mailer.mock.calls[0][0]).toMatchObject({idempotencyKey:'builder-daily-alert-preview-test-2026-11-12',subject:'TEST: Builder board daily alert · 2026-11-12'});
});
it('flags a failed, stale, or missing backup while accepting a recent success',async()=>{
  const fetcher=(run:unknown)=>vi.fn(async()=>({ok:true,json:async()=>({workflow_runs:run?[run]:[]})})) as unknown as typeof fetch;
  expect(await previewBackupProblem(now,fetcher({status:'completed',conclusion:'success',created_at:new Date(now-3600000).toISOString()}))).toBeNull();
  expect(await previewBackupProblem(now,fetcher({status:'completed',conclusion:'failure',created_at:new Date(now-3600000).toISOString()}))).toContain('failure');
  expect(await previewBackupProblem(now,fetcher({status:'completed',conclusion:'success',created_at:new Date(now-40*3600000).toISOString()}))).toContain('stale');
  expect(await previewBackupProblem(now,fetcher(null))).toContain('no workflow run');
});
it('includes a backup failure in the daily alert',async()=>{
  const f=fixture();
  expect(await checkDailyHealth(f.db,{...f.options,backupProblem:'Backup: latest run failure'})).toMatchObject({state:'sent'});
  expect(f.mailer.mock.calls[0][0].subject).toContain('needs attention');
});
