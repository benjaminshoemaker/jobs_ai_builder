import { expect, it } from 'vitest';
import { historicalDecision, postingIdentity, assertSeedSource } from './review-history.js';
it('retains accepted blends without turning uncertainty or negatives into approval', () => {
  expect(historicalDecision('engineering_first_blend')).toBe('approved');
  expect(historicalDecision('operations_builder')).toBe('approved');
  expect(historicalDecision('stretch')).toBe('uncertain');
  expect(historicalDecision('maybe')).toBe('uncertain');
  expect(historicalDecision('no')).toBe('rejected');
});
it('never seeds a rejection, uncertain role, failed source check, or stale snapshot', () => {
  const now=Date.parse('2026-10-29T12:00:00Z');
  const role={decision:'approved',outcome:'open',snapshot:{title:'Role'},content_hash:'hash',checked_at:new Date(now)};
  expect(()=>assertSeedSource(role,now)).not.toThrow();
  for(const patch of [{decision:'rejected'},{decision:'uncertain'},{outcome:'unknown'},{outcome:'not_listed'},{snapshot:null},{checked_at:new Date(now-2*86400000)},{checked_at:new Date(now+86400000)}])expect(()=>assertSeedSource({...role,...patch},now)).toThrow();
});
it('unifies Greenhouse URL aliases but preserves different roles and employers', () => {
  expect(postingIdentity('https://boards.greenhouse.io/figma/jobs/123?gh_jid=123','')).toBe(postingIdentity('https://job-boards.greenhouse.io/figma/jobs/123',''));
  expect(postingIdentity('https://jobs.ashbyhq.com/rillet/one','')).not.toBe(postingIdentity('https://jobs.ashbyhq.com/rillet/two',''));
  expect(postingIdentity(undefined,'missing')).toBe('reference:missing');
});
