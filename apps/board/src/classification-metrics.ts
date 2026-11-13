type Row={expected:'yes'|'no'|'maybe';prediction:'yes'|'no'|'unclear'|null;status:'succeeded'|'failed';sourceComparable:boolean};
export function classificationMetrics(rows:Row[]){
  const comparable=rows.filter(r=>r.sourceComparable&&r.expected!=='maybe');
  const valid=comparable.filter(r=>r.status==='succeeded'&&r.prediction!==null);
  const tp=valid.filter(r=>r.expected==='yes'&&r.prediction==='yes').length;
  const fp=valid.filter(r=>r.expected==='no'&&r.prediction==='yes').length;
  const fn=valid.filter(r=>r.expected==='yes'&&r.prediction==='no').length;
  const tn=valid.filter(r=>r.expected==='no'&&r.prediction==='no').length;
  const positives=comparable.filter(r=>r.expected==='yes').length;
  const validPositives=valid.filter(r=>r.expected==='yes').length;
  const ratio=(n:number,d:number)=>d?n/d:null;
  return {records:rows.length,scored:comparable.length,sourceUnverified:rows.filter(r=>!r.sourceComparable).length,humanMaybe:rows.filter(r=>r.sourceComparable&&r.expected==='maybe').length,truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn,abstentions:valid.filter(r=>r.prediction==='unclear').length,operationalFailures:comparable.length-valid.length,precision:ratio(tp,tp+fp),recall:ratio(tp,positives),semanticRecall:ratio(tp,validPositives),decisionCoverage:ratio(tp+fp+fn+tn,comparable.length)};
}
