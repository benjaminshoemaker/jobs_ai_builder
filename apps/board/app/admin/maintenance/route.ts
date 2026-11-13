import { auth, isAdmin } from '../../../src/auth';
import { adminPage } from '../../../src/admin-page';
import { database } from '../../../src/store';
import { escapeHtml as esc } from '../../../src/web';
import { safeEmployerHtml } from '../../../src/employer-recheck';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { data } = await auth().getSession();
    if (!data?.user) return Response.redirect(new URL('/admin/login', request.url), 303);
    if (!isAdmin(data.user)) return adminPage('<h1>Editorial access is restricted</h1>', 403);

    const { rows } = await database().query(`select j.id,j.record,s.disposition,s.failures,s.next_check_at,c.checked_at,c.note,e.action as editorial_action,e.note as editorial_note,e.created_at as editorial_at,coalesce(held.changed_fields,c.changed_fields) as changed_fields,coalesce(c.snapshot,held.snapshot) as snapshot from board_maintenance_state s join board_jobs j on j.id=s.job_id join board_maintenance_checks c on c.id=s.check_id left join lateral(select snapshot,changed_fields from board_maintenance_checks where job_id=j.id and outcome='needs_review' order by checked_at desc limit 1) held on j.record->>'status'='draft' left join lateral(select action,note,created_at from board_editorial_reviews where job_id=j.id order by created_at desc limit 1) e on true order by case when j.record->>'status'='draft' then 0 when s.disposition in ('retry','closure_pending') then 1 else 2 end,c.checked_at desc,j.id`);
    const runs = await database().query('select started_at,finished_at,status,summary from board_maintenance_runs order by started_at desc limit 5');
    const held = rows.filter((role) => role.record.status === 'draft');
    const routine = rows.filter((role) => role.record.status !== 'draft');
    const dates = (value: string | Date) => esc(new Date(value).toISOString());
    const notices = new URL(request.url).searchParams.get('saved');
    const heldCards = held.map((role) => `<article class="admin-task-card"><h2>${esc(role.record.company)} · ${esc(role.record.title)}</h2><p>${esc(role.note || 'The employer posting changed and needs a decision before this listing appears on the board.')}</p><p><strong>Status:</strong> held from board · ${esc(role.disposition.replaceAll('_', ' '))} · Checked ${dates(role.checked_at)}</p>${role.changed_fields?.length ? `<p><strong>Changed fields:</strong> ${esc(role.changed_fields.join(', '))}</p>` : ''}<p><a class="admin-task-link" href="/admin/maintenance/${esc(role.id)}">Open listing issue →</a> · <a href="${esc(role.record.url)}" target="_blank" rel="noopener noreferrer">Employer posting</a></p>${role.snapshot ? `<details><summary>Compare employer text and fields</summary><div class="employer-copy"><h3>Previously approved text</h3>${safeEmployerHtml(role.record.descriptionHtml)}<h3>Current employer text</h3>${safeEmployerHtml(role.snapshot.descriptionHtml)}<h3>Current source fields</h3><pre>${esc(JSON.stringify({ title: role.snapshot.title, location: role.snapshot.location, secondaryLocations: role.snapshot.secondaryLocations, workplaceType: role.snapshot.workplaceType, isRemote: role.snapshot.isRemote, compensation: role.snapshot.compensation, metadata: role.snapshot.metadata }, null, 2))}</pre></div></details>` : ''}</article>`).join('');
    const routineCards = routine.map((role) => `<details class="posting-section"><summary>${esc(role.record.company)} · ${esc(role.record.title)} — ${esc(role.disposition.replaceAll('_', ' '))}</summary><div class="employer-copy"><p>${esc(role.note)}</p>${role.editorial_action ? `<p><strong>Last editorial decision:</strong> ${esc(role.editorial_action)} · ${dates(role.editorial_at)}<br>${esc(role.editorial_note)}</p>` : ''}<p>Checked ${dates(role.checked_at)}. ${role.disposition === 'closed' ? 'Withdrawn from board.' : `Next eligible check: ${dates(role.next_check_at)}.`}</p><p><a href="${esc(role.record.url)}" target="_blank" rel="noopener noreferrer">Employer posting</a></p></div></details>`).join('');

    return adminPage(`<h1>Listing issues</h1><p>Handle listings held after an employer posting changed. These are separate from new jobs in <a href="/admin/discovery">Review jobs</a>.</p>${notices === 'approve' ? '<p class="admin-notice">Updated role approved and republished.</p>' : notices === 'withdraw' ? '<p class="admin-notice">Listing withdrawn. Historical judgment preserved.</p>' : ''}<h2>Needs a decision (${held.length})</h2>${heldCards || '<p>No listings are waiting for a decision.</p>'}<details class="posting-section"><summary>Other listing checks (${routine.length})</summary>${routineCards || '<p>No other checks yet.</p>'}</details><details class="posting-section"><summary>Recent maintenance runs</summary>${runs.rows.map((run) => `<details><summary>${dates(run.started_at)} · ${esc(run.status)}</summary><pre>${esc(JSON.stringify(run.summary, null, 2))}</pre></details>`).join('') || '<p>No runs yet.</p>'}</details>`, 200, 'issues');
  } catch {
    return adminPage('<h1>Listing issues temporarily unavailable</h1>', 503, 'issues');
  }
}
