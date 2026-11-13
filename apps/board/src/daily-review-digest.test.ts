import {expect,it} from 'vitest';
import {dailyReviewDigest} from './daily-review-digest.js';
import {reviewPurpose,type QueueItem} from './candidate-review.js';
const now=Date.parse('2026-11-11T16:00:00Z');
const item=(id:string,seen:string):QueueItem=>({id,title:'Product Builder',source_id:'ashby:example',location:'Remote US',location_hint:'us_indicated',score:80,current_hash:'hash',first_seen_at:seen,source_checked_at:seen,assessment_id:null,assessed_at:seen,assessment:{fit:'builder'},review_id:null,decision:null,has_text:true});
it('uses the reviewable new cohort and reports the older backlog separately',()=>{
  const digest=dailyReviewDigest([item('new','2026-11-11T01:00:00Z'),item('old','2026-11-01T01:00:00Z')],'https://board.example',now,'completed');
  expect(digest.newCount).toBe(1);
  expect(digest.newAssessedCount).toBe(1);
  expect(digest.backlogCount).toBe(2);
  expect(digest.top.map(x=>x.id)).toEqual(['new','old']);
  expect(digest.text).toContain('Latest intake status: completed');
  expect(digest.link).toBe('https://board.example/admin/discovery');
});
it('keeps a daily review suggestion even on a quiet collection day',()=>{
  const digest=dailyReviewDigest([item('old','2026-11-01T01:00:00Z')],'https://board.example',now,'completed');
  expect(digest.newCount).toBe(0);
  expect(digest.top.map(x=>x.id)).toEqual(['old']);
});
it('features newly assessed jobs ahead of the older backlog',()=>{
  const [oldId,freshId]=Array.from({length:20},(_,i)=>`candidate-${i}`).filter(id=>reviewPurpose(id)==='calibration');
  const old=item(oldId,'2026-10-01T01:00:00Z');old.score=100;
  const fresh=item(freshId,'2026-11-11T01:00:00Z');fresh.score=1;
  const digest=dailyReviewDigest([old,fresh],'https://board.example',now,'completed');
  expect(digest.top.map(x=>x.id)).toEqual([freshId,oldId]);
});
it('counts predicted exclusions as assessments without advertising them as likely matches',()=>{
  const positive=item('positive','2026-11-11T01:00:00Z');
  const negative={...item('negative','2026-11-11T01:00:00Z'),assessment:{fit:'exclude'}};
  const digest=dailyReviewDigest([positive,negative],'https://board.example',now,'completed');
  expect(digest.newCount).toBe(1);
  expect(digest.newAssessedCount).toBe(2);
  expect(digest.subject).toBe('Builder roles: 1 new likely matches');
  expect(digest.text).toContain('1 new likely builder matches from 2 newly assessed jobs');
});
