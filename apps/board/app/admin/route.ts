import { auth, isAdmin } from '../../src/auth';
import { adminPage } from '../../src/admin-page';
import { database } from '../../src/store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { data } = await auth().getSession();
    if (!data?.user) return Response.redirect(new URL('/admin/login', request.url), 303);
    if (!isAdmin(data.user)) return adminPage('<h1>Editorial access is restricted</h1><p>A verified, authorized administrator account is required.</p>', 403);
    const {rows}=await database().query("select count(*) filter(where record->>'status'='draft')::int as held from board_jobs");
    const held=Number(rows[0].held);
    return adminPage(`<h1>Admin home</h1><p class="admin-intro">Your regular task is to review jobs. A Yes publishes a role to this protected board when its employer and listing checks pass; jobs that need help stay hidden.</p><section><h2>What to do</h2><div class="admin-task-grid"><a class="admin-task-card" href="/admin/discovery"><strong>Review jobs</strong><span>Read one employer posting at a time and decide Yes, No, or Maybe. Start here each day.</span></a><a class="admin-task-card" href="/admin/maintenance"><strong>Resolve listing issues${held?` · ${held}`:''}</strong><span>Handle hidden drafts or changed postings only when the automatic checks need your attention.</span></a></div></section><section><h2>Check and revisit</h2><div class="admin-task-grid"><a class="admin-task-card" href="/admin/daily"><strong>Today’s overview</strong><span>See newly assessed jobs, the email digest, and the latest daily run.</span></a><a class="admin-task-card" href="/admin/discovery?lane=reviewed"><strong>Saved decisions</strong><span>Revisit or change your Yes, No, and Maybe decisions on current job versions.</span></a><a class="admin-task-card" href="/admin/history"><strong>Reference roles</strong><span>Browse the earlier examples used to define this category.</span></a><a class="admin-task-card" href="/admin/pipeline"><strong>System status</strong><span>Inspect collection, assessment, retries, and blocked processing steps.</span></a></div></section><form method="post" action="/admin/logout" class="admin-signout"><button type="submit">Sign out</button></form>`,200,'home');
  } catch { return adminPage('<h1>Administration temporarily unavailable</h1>', 503); }
}
