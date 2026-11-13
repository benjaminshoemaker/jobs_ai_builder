import {auth,isAdmin} from '../../../src/auth';
import {adminPage} from '../../../src/admin-page';
import {database} from '../../../src/store';
import {candidateQueueData} from '../../../src/candidate-review-store';
import {dailyReviewDigest} from '../../../src/daily-review-digest';
import {digestDate} from '../../../src/daily-review-delivery';
import {escapeHtml} from '../../../src/web';
export const dynamic='force-dynamic';
const esc=(value:unknown)=>escapeHtml(String(value));

export async function GET(request:Request){
  try{
    const {data}=await auth().getSession();
    if(!data?.user)return Response.redirect(new URL('/admin/login',request.url),303);
    if(!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const db=database(),day=digestDate(),{eligible}=await candidateQueueData(db,'all','us_or_unknown');
    const [cycles,digests,holds,collect]=await Promise.all([
      db.query('select * from board_daily_cycles order by review_date desc limit 7'),
      db.query('select review_date,state,prepared_at,sent_at,failure from board_daily_digests order by review_date desc limit 7'),
      db.query("select count(*)::int as n from board_pipeline_jobs where state='blocked'"),
      db.query("select status from board_pipeline_runs where phase='collect' order by started_at desc limit 1"),
    ]);
    const preview=dailyReviewDigest(eligible,new URL(request.url).origin,Date.now(),collect.rows[0]?.status??'no run yet');
    const suggestions=preview.top.length?`<ol>${preview.top.map(item=>`<li><a href="/admin/discovery?candidate=${encodeURIComponent(item.id)}">${esc(item.title)}</a> · ${esc(item.company)} · ${esc(item.location)} · ${esc(item.lane?.replaceAll('_',' '))}</li>`).join('')}</ol>`:'<p>No suggested jobs in today’s sample.</p>';
    const runs=cycles.rows.length?`<ul>${cycles.rows.map(row=>`<li>${esc(row.review_date)} · ${esc(row.state)}${row.finished_at?` · finished ${esc(new Date(row.finished_at).toLocaleString('en-US',{timeZone:'America/Los_Angeles'}))}`:''}</li>`).join('')}</ul>`:'<p>No scheduled intake has run.</p>';
    const email=digests.rows.length?`<ul>${digests.rows.map(row=>`<li>${esc(row.review_date)} · ${esc(row.state)}${row.failure?` · ${esc(row.failure)}`:''}</li>`).join('')}</ul>`:'<p>No digest has been prepared or sent.</p>';
    return adminPage(`<h1>Today’s overview</h1><p>See what arrived today and whether the daily collection and email ran. Make Yes, No, or Maybe decisions on <strong>Review jobs</strong>.</p><p><a class="admin-primary-link" href="/admin/discovery">Review jobs</a></p><p>${esc(day)} · ${preview.newCount} new likely matches from ${preview.newAssessedCount} assessments · ${preview.backlogCount} unreviewed with full text</p><section><h2>Jobs to consider today</h2><p>This sample includes exploratory jobs and checks of model exclusions. Appearing here does not mean a job qualifies.</p>${suggestions}</section><details><summary>Collection and email status · ${esc(holds.rows[0].n)} blocked steps</summary><h2>Daily runs</h2>${runs}<h2>Email delivery</h2>${email}<p><a href="/admin/pipeline">Open system status</a> for processing details.</p></details>`,200,'today');
  }catch{return adminPage('<h1>Today’s overview is temporarily unavailable</h1>',503,'today');}
}
