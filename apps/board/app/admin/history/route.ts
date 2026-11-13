import { auth, isAdmin } from '../../../src/auth';
import { adminPage } from '../../../src/admin-page';
import { database } from '../../../src/store';
import { escapeHtml as esc } from '../../../src/web';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const {data}=await auth().getSession();
    if(!data?.user)return Response.redirect(new URL('/admin/login',request.url),303);
    if(!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const filter=new URL(request.url).searchParams.get('decision')??'all';
    const decision=['approved','rejected','uncertain'].includes(filter)?filter:'all';
    const {rows}=await database().query(`select r.*, c.outcome,c.checked_at,c.note,c.historical_comparison,c.snapshot,
      (select jsonb_agg(jsonb_build_object('path',e.artifact_path,'kind',e.evidence_kind,'record',e.record) order by e.artifact_path,e.source_record_id) from board_review_evidence e where e.role_id=r.id) as evidence
      from board_review_roles r left join lateral (select * from board_review_checks where role_id=r.id order by checked_at desc limit 1) c on true
      where ($1='all' or r.decision=$1) order by r.company,r.title`,[decision]);
    const totals=await database().query('select decision,count(*)::int as n from board_review_roles group by decision');
    const summary=totals.rows.map(row=>`${row.n} ${row.decision}`).join(' · ');
    const cards=rows.map(role=>`<details id="${esc(role.id)}" class="posting-section"><summary>${esc(role.company)} · ${esc(role.title)} — ${esc(role.decision)}</summary><div class="employer-copy"><p><strong>Your original label:</strong> ${esc(role.historical_label)}. <strong>Focus you supplied:</strong> ${role.user_focus?esc(role.user_focus.join(', ')):'Not recorded; not inferred.'}</p><p>${esc(role.historical_reason)}</p>${role.provenance.seedHold?`<p><strong>Held from board seed:</strong> ${esc(role.provenance.seedHold)} (assistant reconciliation; your approval is unchanged)</p>`:''}<p><strong>Current availability:</strong> ${esc(role.outcome??'Not checked')} ${role.checked_at?'· '+esc(new Date(role.checked_at).toISOString()):''}</p><p>${esc(role.note??'Historical approval does not establish current availability.')}</p><p><strong>Stored full-text comparison:</strong> ${esc(role.historical_comparison??'not_available')}. Formatting differences do not establish changed requirements. A design snapshot is not proof of the exact version originally reviewed.</p>${role.canonical_url?`<p><a href="${esc(role.canonical_url)}" rel="noopener noreferrer" target="_blank">Employer posting</a></p>`:''}${role.snapshot?`<details><summary>Current employer text</summary><h4>${esc(role.snapshot.title)}</h4>${role.snapshot.descriptionHtml}</details>`:''}<details><summary>Review evidence and corrections</summary>${(role.evidence??[]).map((e:{path:string;kind:string;record:unknown})=>`<p>${esc(e.path)} · ${esc(e.kind)}</p><pre>${esc(JSON.stringify(e.record,null,2))}</pre>`).join('')}</details></div></details>`).join('');
    return adminPage(`<h1>Reference roles</h1><p>${esc(summary)}</p><p>These are the earlier roles you labeled while defining the category. They are examples for calibration, not today's review queue. To revisit decisions on current postings, open <a href="/admin/discovery?lane=reviewed">Saved decisions</a>.</p><details><summary>About these historical records</summary><p>Source records preserve the same review in several artifacts; they are not additional independent ratings. Employer availability is checked separately. No model prediction is presented as your decision.</p></details><form method="get"><label>Decision <select name="decision">${['all','approved','rejected','uncertain'].map(value=>`<option value="${value}" ${value===decision?'selected':''}>${value}</option>`).join('')}</select></label> <button type="submit">Filter references</button></form><p>${rows.length} reference roles</p>${cards}`,200,'references');
  }catch{return adminPage('<h1>Reference roles temporarily unavailable</h1>',503,'references');}
}
