import { loadJobs } from '../../../src/store';
import {publicBoardEnabled} from '../../../src/public-launch';
export const dynamic = 'force-dynamic';
export async function GET() {
  if(!publicBoardEnabled())return Response.json({error:'Board unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
  try {
    const jobs = await loadJobs();
    return Response.json({ jobs, notice: jobs.some(job => job.status === 'sample') ? 'Preview inventory includes dated sample postings. Check company sites for current availability.' : '' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Roles temporarily unavailable' }, { status: 503 }); }
}
