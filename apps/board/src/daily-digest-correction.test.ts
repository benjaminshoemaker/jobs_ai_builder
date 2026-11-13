import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({queue:vi.fn(),send:vi.fn()}));
vi.mock('./candidate-review-store.js',()=>({candidateQueueData:m.queue}));
vi.mock('./daily-notice.js',()=>({sendRecordedNotice:m.send}));
import {needsDigestCorrection,sendDailyDigestCorrection} from './daily-digest-correction.js';

const sent='2026-11-12T09:07:55Z',finished='2026-11-12T14:48:44Z';
beforeEach(()=>vi.resetAllMocks());
it('only corrects a digest sent before the morning intake finished',()=>{
  expect(needsDigestCorrection({state:'completed',finished_at:finished},{state:'sent',sent_at:sent})).toBe(true);
  expect(needsDigestCorrection({state:'completed',finished_at:sent},{state:'sent',sent_at:finished})).toBe(false);
  expect(needsDigestCorrection({state:'failed',finished_at:finished},{state:'sent',sent_at:sent})).toBe(false);
  expect(needsDigestCorrection({state:'completed',finished_at:finished},{state:'prepared',sent_at:sent})).toBe(false);
});
it('prepares one updated, stable-link notice when the earlier digest was premature',async()=>{
  const db={query:vi.fn(async(sql:string)=>sql.startsWith('select state,finished_at')?{rows:[{state:'completed',finished_at:finished}]}:{rows:[{state:'sent',sent_at:sent}]})} as any;
  m.queue.mockResolvedValue({eligible:[]});m.send.mockResolvedValue({state:'sent',messageId:'mail-1'});
  const options={recipient:'editor@example.test',from:'Builder <digest@example.test>',origin:'https://stable.example.test',mailer:vi.fn(),now:Date.parse('2026-11-12T20:00:00Z')};
  expect(await sendDailyDigestCorrection(db,options)).toMatchObject({state:'sent'});
  expect(m.send).toHaveBeenCalledWith(db,expect.objectContaining({key:'builder-digest-correction-2026-11-12',subject:'Updated builder roles: 0 new likely matches',body:expect.stringContaining('https://stable.example.test/admin/discovery')}));
});
it('does not prepare a correction for an ordinary morning delivery',async()=>{
  const db={query:vi.fn(async(sql:string)=>sql.startsWith('select state,finished_at')?{rows:[{state:'completed',finished_at:sent}]}:{rows:[{state:'sent',sent_at:finished}]})} as any;
  expect(await sendDailyDigestCorrection(db,{recipient:'editor@example.test',from:'Builder <digest@example.test>',origin:'https://stable.example.test',mailer:vi.fn(),now:Date.parse('2026-11-12T20:00:00Z')})).toMatchObject({state:'not_needed'});
  expect(m.queue).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();
});
