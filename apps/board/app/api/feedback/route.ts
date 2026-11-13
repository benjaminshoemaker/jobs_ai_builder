import { randomUUID } from 'node:crypto';
import { flaggedJobs, saveFeedback, loadJobs } from '../../../src/store';
import { sameOrigin } from '../../../src/request';
import {publicBoardEnabled} from '../../../src/public-launch';
export const dynamic = 'force-dynamic';
function visitor(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith('board_visitor='))?.slice(14);
  return cookie && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(cookie) ? cookie : randomUUID();
}
function reply(request: Request, id: string, body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': `board_visitor=${id}; HttpOnly; SameSite=Strict; Path=/${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}` } });
}
export async function GET(request: Request) {
  if(!publicBoardEnabled())return Response.json({error:'Board unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  const id = visitor(request);
  try {
    const flagged = await flaggedJobs(id);
    const jobs = await loadJobs();
    return reply(request, id, { urls: jobs.filter(job => flagged.includes(job.id)).map(job => job.url) });
  } catch { return reply(request, id, { error: 'Feedback temporarily unavailable' }, 503); }
}
export async function POST(request: Request) {
  if(!publicBoardEnabled())return Response.json({error:'Board unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  const id = visitor(request);
  if (!sameOrigin(request)) return reply(request, id, { error: 'Same-origin requests required' }, 403);
  try {
    if (Number(request.headers.get('content-length')) > 4096) return reply(request, id, { error: 'Body too large' }, 400);
    const reader = request.body?.getReader();
    if (!reader) return reply(request, id, { error: 'Invalid feedback' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 4096) { await reader.cancel(); return reply(request, id, { error: 'Body too large' }, 400); } chunks.push(part.value); }
    let input;
    try { input = JSON.parse(Buffer.concat(chunks).toString()); } catch { return reply(request, id, { error: 'Invalid feedback' }, 400); }
    if (!input || typeof input.jobId !== 'string' || typeof input.active !== 'boolean' || (input.reason !== undefined && !['not_builder', 'unavailable'].includes(input.reason))) return reply(request, id, { error: 'Invalid feedback' }, 400);
    if (!(await loadJobs()).some(job => job.id === input.jobId)) return reply(request, id, { error: 'Role not found' }, 404);
    await saveFeedback(id, input.jobId, input.active, input.reason ?? 'not_builder');
    return reply(request, id, { saved: true, active: input.active });
  } catch (error) {
    if (error instanceof Error && error.message.includes('rate limit')) return reply(request, id, { error: 'Please try again later' }, 429);
    return reply(request, id, { error: 'Feedback temporarily unavailable' }, 503);
  }
}
