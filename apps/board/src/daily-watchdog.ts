import type {Client,PoolClient} from 'pg';
import {digestDate,type Mailer} from './daily-review-delivery.js';
import {sendRecordedNotice} from './daily-notice.js';

type DB=Pick<Client|PoolClient,'query'>;
const zone='America/Los_Angeles';
export function pacificHour(now=Date.now()){
  return Number(new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',hourCycle:'h23'}).format(now));
}
export function dailyFailure(cycle?:string,digest?:string){
  const problems:string[]=[];
  if(cycle!=='completed')problems.push(`Intake: ${cycle??'missing'}`);
  if(digest!=='sent')problems.push(`Review email: ${digest??'missing'}`);
  return problems;
}
export async function previewBackupProblem(now=Date.now(),fetcher:typeof fetch=fetch){
  try{
    const response=await fetcher('https://api.github.com/repos/benjaminshoemaker/jobs_ai_builder/actions/workflows/board-preview-backup.yml/runs?per_page=1',{
      headers:{Accept:'application/vnd.github+json','User-Agent':'jobs-ai-builder-preview-watchdog'},signal:AbortSignal.timeout(5000),cache:'no-store'
    });
    if(!response.ok)return `Backup monitor: GitHub returned ${response.status}`;
    const body=await response.json() as {workflow_runs?:Array<{status?:string;conclusion?:string;created_at?:string}>};
    const run=body.workflow_runs?.[0];
    if(!run)return 'Backup: no workflow run found';
    if(run.status!=='completed'||run.conclusion!=='success')return `Backup: latest run ${run.conclusion??run.status??'unknown'}`;
    const age=now-Date.parse(run.created_at??'');
    if(!Number.isFinite(age)||age<0||age>36*60*60*1000)return 'Backup: latest successful run is stale';
    return null;
  }catch{return 'Backup monitor: GitHub could not be reached';}
}
export async function checkDailyHealth(db:DB,options:{recipient:string;from:string;origin:string;mailer:Mailer;now?:number;test?:boolean;backupProblem?:string|null}){
  const now=options.now??Date.now(),day=digestDate(now);
  if(!options.test&&pacificHour(now)<9)return {state:'too_early' as const,day};
  const [cycle,digest]=await Promise.all([
    db.query('select state from board_daily_cycles where review_date=$1',[day]),
    db.query('select state from board_daily_digests where review_date=$1',[day])
  ]);
  const problems=options.test?['Preview test: daily failure alerts are deliverable']:[...dailyFailure(cycle.rows[0]?.state,digest.rows[0]?.state),...(options.backupProblem?[options.backupProblem]:[])];
  if(!problems.length)return {state:'healthy' as const,day};
  const key=`builder-daily-alert-${options.test?'preview-test-':''}${day}`;
  const subject=options.test?`TEST: Builder board daily alert · ${day}`:`Builder board needs attention · ${day}`;
  const body=[`Daily board check for ${day} (Pacific):`,...problems.map(problem=>`• ${problem}`),'',`Open the daily admin page: ${new URL('/admin/daily',options.origin).href}`].join('\n');
  return sendRecordedNotice(db,{key,recipient:options.recipient,from:options.from,subject,body,mailer:options.mailer,now,day});
}
