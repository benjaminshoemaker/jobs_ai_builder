export function reviewMetrics(rows:{prediction:string;decision:string}[]){
  let truePositive=0,falsePositive=0,falseNegative=0,trueNegative=0,abstained=0,maybe=0;
  const positive=new Set(['builder','product_builder','operations_builder','engineering_builder','engineering_blend']);
  for(const row of rows){if(row.decision==='maybe'){maybe++;continue;}if(!positive.has(row.prediction)&&row.prediction!=='exclude'){abstained++;continue;}const p=positive.has(row.prediction),h=row.decision==='yes';if(p&&h)truePositive++;else if(p)falsePositive++;else if(h)falseNegative++;else trueNegative++;}
  const judged=truePositive+falsePositive+falseNegative+trueNegative;
  return {records:rows.length,judged,truePositive,falsePositive,falseNegative,trueNegative,abstained,maybe,precision:truePositive+falsePositive?truePositive/(truePositive+falsePositive):null,recall:truePositive+falseNegative?truePositive/(truePositive+falseNegative):null,accuracy:judged?(truePositive+trueNegative)/judged:null};
}
