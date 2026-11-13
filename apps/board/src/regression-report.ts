import {classificationMetrics} from './classification-metrics.js';
type Result={key:string;expected:'yes'|'no';group:string;status:string;result?:{decision:'yes'|'no'|'unclear';reason?:string}|null};
export function regressionReportMetrics(rows:Result[]){
 const exact=rows.filter(r=>r.group==='exact_reviewed');
 const agreement=(items:Result[])=>({records:items.length,matched:items.filter(r=>r.status==='succeeded'&&r.result?.decision===r.expected).length,disagreed:items.filter(r=>r.status==='succeeded'&&r.result?.decision!=='unclear'&&r.result?.decision!==r.expected).length,unclear:items.filter(r=>r.status==='succeeded'&&r.result?.decision==='unclear').length,operationalFailures:items.filter(r=>['failed','blocked'].includes(r.status)).length,notAttempted:items.filter(r=>r.status==='not_attempted').length});
 return {
  exactReviewed:classificationMetrics(exact.map(r=>({expected:r.expected,prediction:r.result?.decision??null,status:r.status==='succeeded'?'succeeded':'failed',sourceComparable:true}))),
  historicalDiagnostics:{...agreement(rows.filter(r=>r.group==='historical_diagnostic')),sourcePairing:'Unverified historical label/text pairing; diagnostic agreement only. Not a verified accuracy, precision or recall estimate.'},
  combinedDiagnostic:{...agreement(rows),sourcePairing:'Mixed verified and unverified source pairs; counts only.'},
  latestNine:agreement(rows.filter(r=>r.key.startsWith('v11:'))),
 };
}
