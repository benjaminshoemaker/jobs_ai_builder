import { afterEach, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CatalogSchema } from './catalog.js';
vi.mock('./store.js', () => ({ loadJobs: vi.fn(), saveFeedback: vi.fn(), flaggedJobs: vi.fn() }));
import { loadJobs, saveFeedback } from './store.js';
import { boardPage } from './web.js';
import { POST } from '../app/api/feedback/route';
const fixture = CatalogSchema.parse(JSON.parse(await readFile(resolve(import.meta.dirname, '../catalog/jobs.json'), 'utf8')));
afterEach(() => vi.resetAllMocks());
it('renders complete employer content on a permanent role URL without JavaScript', async () => {
  vi.mocked(loadJobs).mockResolvedValue(fixture);
  const response = await boardPage('figma');
  const html = await response.text();
  expect(response.status).toBe(200);
  expect(html).toContain('id="server-role"');
  expect(html).toContain(fixture.find(job => job.id === 'figma')!.descriptionHtml);
  expect((await boardPage('unknown')).status).toBe(404);
});
it('fails explicitly rather than serving stale fixtures when the database fails', async () => {
  vi.mocked(loadJobs).mockRejectedValue(new Error('database offline'));
  const response = await boardPage();
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('Figma');
});
it('rejects cross-origin and oversized feedback before touching the database', async () => {
  expect((await POST(new Request('https://board.example/api/feedback', { method: 'POST', headers: { origin: 'https://other.example' }, body: '{}' }))).status).toBe(403);
  expect((await POST(new Request('https://board.example/api/feedback', { method: 'POST', headers: { origin: 'https://board.example' }, body: 'x'.repeat(4097) }))).status).toBe(400);
  expect(saveFeedback).not.toHaveBeenCalled();
});
it('uses durable visitor-scoped feedback with secure cookies and reports rate limits', async () => {
  vi.mocked(loadJobs).mockResolvedValue(fixture);
  vi.mocked(saveFeedback).mockRejectedValue(new Error('rate limit'));
  const response = await POST(new Request('https://board.example/api/feedback', { method: 'POST', headers: { origin: 'https://board.example', cookie: 'board_visitor=12345678-1234-1234-1234-123456789abc' }, body: JSON.stringify({ jobId: 'figma', active: true, reason: 'unavailable' }) }));
  expect(response.status).toBe(429);
  expect(saveFeedback).toHaveBeenCalledWith('12345678-1234-1234-1234-123456789abc', 'figma', true, 'unavailable');
  expect(response.headers.get('set-cookie')).toContain('; Secure');
});
