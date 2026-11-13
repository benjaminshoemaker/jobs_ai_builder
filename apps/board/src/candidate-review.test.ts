import {expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {digest} from './review-history.js';
import {makeReviewQueue,makeDailyReviewQueue,reviewPurpose,signReviewToken,readReviewToken,selectionPolicy,type QueueItem,type ReviewToken} from './candidate-review.js';
import {highlightedPosting} from './review-highlights.js';
import {selectCalibrationFeedback} from './review-calibration.js';
import {reviewMetrics} from './review-evaluation.js';
import {candidateReviewPage} from './candidate-review-page.js';
const sourceHtml='<h4>Requirements</h4><p>No software engineering background required.</p><p>You personally build and ship internal tools with Claude Code.</p><p>Identify customer problems and own adoption and delivery.</p>';
const candidates=Array.from({length:100},(_,i)=>({id:digest('candidate'+i).slice(0,32),title:'Builder '+i,source_id:'ashby:company'+i,location:'US',location_hint:'us_indicated',score:i,current_hash:digest('source'+i),assessment_id:null,assessment:i%4===0?{fit:'exclude'}:i%4===1?{fit:'unclear'}:i%4===2?{fit:'builder'}:null,review_id:null,decision:null,has_text:true} as QueueItem));
it('mixes priority, uncertainty, real negative audits and exploration without inventing model predictions',()=>{
  const queue=makeReviewQueue(candidates);expect(queue).toHaveLength(25);expect(new Set(queue.map(row=>row.id)).size).toBe(25);
  expect(new Set(queue.map(row=>row.lane))).toEqual(new Set(['priority','uncertain','negative_audit','exploration','evaluation']));
  const negatives=makeReviewQueue(candidates,'negative_audit');expect(negatives.length).toBeGreaterThan(0);expect(negatives.every(row=>row.assessment?.fit==='exclude'&&reviewPurpose(row.id)==='calibration')).toBe(true);
  const unassessed=candidates.map(row=>({...row,assessment:null}));expect(makeReviewQueue(unassessed,'negative_audit')).toEqual([]);expect(makeReviewQueue(unassessed).every(row=>row.lane!=='negative_audit'&&row.lane!=='uncertain')).toBe(true);
});
it('surfaces newly assessed jobs first in the daily mixed queue without duplicating the backlog',()=>{
  const now=Date.parse('2026-11-12T16:00:00Z');
  const old=candidates[0],recent=candidates.find(row=>row.assessment?.fit==='builder')!;
  const items=[{...old,score:999,assessed_at:new Date(now-3*86400000)},{...recent,score:1,assessed_at:new Date(now-3600000)}];
  const queue=makeDailyReviewQueue(items,now);
  expect(queue.map(row=>row.id)).toEqual([recent.id,old.id]);
  expect(new Set(queue.map(row=>row.id)).size).toBe(queue.length);
  expect(makeDailyReviewQueue(items,now,1).map(row=>row.id)).toEqual([recent.id]);
});
it('puts model-positive jobs ahead of higher-scoring unassessed jobs and fresh model exclusions',()=>{
  const [yes,unassessed,no]=candidates.filter(row=>reviewPurpose(row.id)==='calibration').slice(0,3);
  const now=Date.parse('2026-11-12T16:00:00Z');
  const items=[
    {...yes,score:1,assessment:{fit:'builder'},assessed_at:new Date(now-3*86400000)},
    {...unassessed,score:100,assessment:null},
    {...no,score:1000,assessment:{fit:'exclude'},assessed_at:new Date(now-3600000)},
  ];
  expect(makeReviewQueue(items,'priority')[0].id).toBe(yes.id);
  expect(makeDailyReviewQueue(items,now)[0].id).toBe(yes.id);
  expect(makeDailyReviewQueue(items,now).some(row=>row.id===no.id)).toBe(true);
});
it('groups visible model-positive jobs first while retaining audit jobs later in the daily mix',()=>{
  const rows=candidates.filter(row=>reviewPurpose(row.id)==='calibration').slice(0,10);
  const items=rows.map((row,index)=>({...row,score:100-index,assessment:index<4?{fit:'builder'}:index<7?{fit:'exclude'}:null}));
  const queue=makeDailyReviewQueue(items,Date.parse('2026-11-12T16:00:00Z'),10);
  expect(queue.slice(0,4).map(row=>row.id)).toEqual(rows.slice(0,4).map(row=>row.id));
  expect(queue.some(row=>row.lane==='negative_audit')).toBe(true);
});
it('keeps evaluation selection independent of model labels and stable by candidate across source versions',()=>{
  const a=makeReviewQueue(candidates,'evaluation').map(row=>row.id),b=makeReviewQueue(candidates.map(row=>({...row,assessment:{fit:'exclude'},current_hash:digest('changed')})),'evaluation').map(row=>row.id);
  expect(a).toEqual(b);expect(a.every(id=>reviewPurpose(id)==='evaluation')).toBe(true);
});
it('binds feedback tokens to actor, source version, prediction, prior judgment and expiry',()=>{
  const now=Date.now(),secret='test-secret-that-is-long-enough-for-signing';
  const value:ReviewToken={id:candidates[0].id,hash:candidates[0].current_hash,actor:'owner',nonce:randomUUID(),assessmentId:null,reviewId:null,lane:'exploration',policy:selectionPolicy,issuedAt:now};
  const token=signReviewToken(value,secret);expect(readReviewToken(token,secret,'owner',now)).toEqual(value);
  expect(()=>readReviewToken(token,secret,'other',now)).toThrow();expect(()=>readReviewToken(token,secret,'owner',now+2*86400000)).toThrow();
  expect(()=>readReviewToken(token.replace(/^./,token[0]==='e'?'f':'e'),secret,'owner',now)).toThrow();
});
it('highlights all four builder cues safely while keeping qualifications separate',()=>{
  const result=highlightedPosting(sourceHtml+'<script>bad()</script><p onclick="bad()">Experience with A &amp; B is useful.</p>');
  for(const cue of ['problem','building','ai','delivery'] as const){expect(result.counts[cue]).toBeGreaterThan(0);expect(result.html).toContain('review-mark-'+cue);}
  expect(result.requirements).toBe(true);expect(result.html).toContain('id="background-requirements"');
  expect(result.html).toContain('No software engineering background required.');expect(result.html).toContain('&amp;');expect(result.html).not.toContain('<script>');expect(result.html).not.toContain('onclick');
});
it('numbers repeated cues so each passage has its own navigation target',()=>{
  const result=highlightedPosting('<p>Identify user needs. Define business problems.</p>');
  expect(result.counts.problem).toBe(2);
  expect(result.html).toContain('id="evidence-problem"');
  expect(result.html).toContain('id="evidence-problem-2"');
});
it('excludes evaluation feedback from calibration even if a record carries an incorrect purpose field',()=>{
  const evalId=candidates.find(row=>reviewPurpose(row.id)==='evaluation')!.id,calibId=candidates.find(row=>reviewPurpose(row.id)==='calibration')!.id;
  const rows=[{id:'evaluation',candidate_id:evalId,purpose:'calibration',decision:'yes'},{id:'valid',candidate_id:calibId,purpose:'calibration',decision:'no'}];
  expect(selectCalibrationFeedback(rows).map(row=>row.id)).toEqual(['valid']);
});
it('counts missed positives and abstentions instead of hiding them in overall accuracy',()=>{
  expect(reviewMetrics([{prediction:'exclude',decision:'yes'},{prediction:'builder',decision:'no'},{prediction:'unclear',decision:'no'},{prediction:'builder',decision:'maybe'}])).toMatchObject({falseNegative:1,falsePositive:1,abstained:1,maybe:1,precision:0,recall:0});
  expect(reviewMetrics([]).accuracy).toBeNull();
});
it('shows one selected full job, highlights and three clear decision actions; evaluation predictions remain hidden',async()=>{
  const row=candidates.find(row=>reviewPurpose(row.id)==='evaluation')!;
  const selected={...row,canonical_url:'https://jobs.ashbyhq.com/example/one',last_seen_at:new Date(),snapshot:{descriptionHtml:sourceHtml},assessment:{fit:'exclude',reason:'Hidden evaluation prediction'},signals:{}};
  const html=await candidateReviewPage({all:[row],eligible:[row],queue:makeReviewQueue([row]),selected,provider:'all',scope:'all',lane:'mixed',actor:'owner',secret:'fixture-secret',feedback:{calibration:0,evaluation:0}}).text();
  expect(html.match(/<article /g)).toHaveLength(1);expect(html).toContain('value="yes"');expect(html).toContain('value="no"');expect(html).toContain('value="maybe"');expect(html).toContain('<mark');expect(html).toContain('class="review-cue-nav" hidden');expect(html).toContain('data-cue-step="1"');expect(html).not.toContain('Hidden evaluation prediction');expect(html).not.toContain('Model suggests No');
  const missing=await candidateReviewPage({all:[row],eligible:[],queue:[],selected:{...selected,snapshot:null},provider:'all',scope:'all',lane:'mixed',actor:'owner',secret:'fixture-secret',feedback:{calibration:0,evaluation:0}}).text();expect(missing).not.toContain('aria-label="Builder fit decision"');
});
