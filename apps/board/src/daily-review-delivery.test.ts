import {expect,it,vi} from 'vitest';
import {deliverDailyReview,digestDate,resendMailer} from './daily-review-delivery.js';

const now=Date.parse('2026-11-11T17:00:00Z');
function fixture(){
  const row:{review_date:string;recipient:string;subject:string;body:string;idempotency_key:string;state:string;provider_message_id:string|null;prepared_at:Date}={review_date:'2026-11-11',recipient:'editor@example.com',subject:'Builder roles',body:'Review today',idempotency_key:'builder-review-2026-11-11',state:'prepared',provider_message_id:null,prepared_at:new Date(now-1000)};
  const query=vi.fn(async(sql:string,parameters?:unknown[])=>{
    if(sql.includes('pg_try_advisory_lock'))return {rows:[{locked:true}]};
    if(sql.startsWith('select * from board_daily_digests'))return {rows:[row]};
    if(sql.includes("set state='sent'")){row.state='sent';row.provider_message_id=String(parameters?.[1]);}
    if(sql.includes("set state='unknown'"))row.state='unknown';
    if(sql.includes("set state='failed'"))row.state='failed';
    return {rows:[]};
  });
  return {row,query,db:{query} as any};
}
it('uses Pacific calendar dates across daylight-saving offsets',()=>{
  expect(digestDate(Date.parse('2026-01-01T07:30:00Z'))).toBe('2025-12-31');
  expect(digestDate(Date.parse('2026-07-01T07:30:00Z'))).toBe('2026-07-01');
});
it('records one provider send and does not send again',async()=>{
  const {db,query}=fixture(),mail=vi.fn(async(_mail:{idempotencyKey:string})=> 'email-1');
  expect(await deliverDailyReview(db,'2026-11-11','Board <board@example.com>',mail,now)).toEqual({state:'sent',messageId:'email-1'});
  expect(await deliverDailyReview(db,'2026-11-11','Board <board@example.com>',mail,now)).toEqual({state:'sent',messageId:'email-1'});
  expect(mail).toHaveBeenCalledOnce();
  expect(mail.mock.calls[0][0].idempotencyKey).toBe('builder-review-2026-11-11');
  expect(query.mock.calls.filter(([sql])=>String(sql).includes('pg_advisory_unlock'))).toHaveLength(2);
});
it('leaves a failed send retryable with the same payload',async()=>{
  const {db,row}=fixture();const mail=vi.fn().mockRejectedValueOnce(new Error('temporary')).mockResolvedValueOnce('email-2');
  await expect(deliverDailyReview(db,'2026-11-11','Board <board@example.com>',mail,now)).rejects.toThrow('temporary');
  expect(row.state).toBe('failed');
  expect(await deliverDailyReview(db,'2026-11-11','Board <board@example.com>',mail,now)).toEqual({state:'sent',messageId:'email-2'});
  expect(mail.mock.calls[0][0]).toEqual(mail.mock.calls[1][0]);
});
it('requires manual reconciliation after the provider idempotency window',async()=>{
  const {db,row}=fixture();const mail=vi.fn();
  expect(await deliverDailyReview(db,'2026-11-11','Board <board@example.com>',mail,now+24*60*60*1000)).toEqual({state:'unknown'});
  expect(row.state).toBe('unknown');expect(mail).not.toHaveBeenCalled();
});
it('sends the frozen digest to Resend with its idempotency key',async()=>{
  const prior=globalThis.fetch,request=vi.fn(async(_url:unknown,_init:unknown)=>Response.json({id:'resend-1'}));
  globalThis.fetch=request as typeof fetch;
  try{
    expect(await resendMailer('fixture-secret')({from:'Builder Roles <digest@example.com>',to:'editor@example.com',subject:'Today',text:'Review today',idempotencyKey:'builder-review-2026-11-11'})).toBe('resend-1');
    expect(request.mock.calls[0][0]).toBe('https://api.resend.com/emails');
    const init=request.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({'Idempotency-Key':'builder-review-2026-11-11'});
    expect(JSON.parse(String(init.body))).toMatchObject({from:'Builder Roles <digest@example.com>',to:['editor@example.com'],subject:'Today',text:'Review today'});
  }finally{globalThis.fetch=prior;}
});
