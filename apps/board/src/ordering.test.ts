import { expect, it } from 'vitest';
import { readCatalog, visibleJobs } from './catalog.js';
import { resolve } from 'node:path';
it('orders by original publication or first discovery, never by verification or approval', async () => {
  const base = (await readCatalog(resolve(import.meta.dirname, '../catalog/jobs.json')))[0];
  const jobs = [
    { ...base, id: 'rechecked', originalPublishedAt: '2026-10-01T00:00:00Z', firstSeenAt: '2026-10-28T00:00:00Z', checkedAt: '2026-10-29T00:00:00Z' },
    { ...base, id: 'new', originalPublishedAt: null, firstSeenAt: '2026-10-27T00:00:00Z' },
    { ...base, id: 'unknown', originalPublishedAt: null, firstSeenAt: null },
  ];
  expect(visibleJobs(jobs).map(job => job.id)).toEqual(['new', 'rechecked', 'unknown']);
});
