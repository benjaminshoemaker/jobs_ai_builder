import {it,expect} from 'vitest';import {regressionReportMetrics} from './regression-report.js';
it('separates unverified historical agreement from exact-source metrics and preserves abstentions',()=>{
 const rows=[{key:'v11:one',expected:'yes' as const,group:'exact_reviewed',status:'succeeded',result:{decision:'yes' as const}},{key:'old:no',expected:'no' as const,group:'exact_reviewed',status:'succeeded',result:{decision:'unclear' as const}},{key:'history:old',expected:'no' as const,group:'historical_diagnostic',status:'succeeded',result:{decision:'yes' as const}}];
 const report=regressionReportMetrics(rows);expect(report.exactReviewed.records).toBe(2);expect(report.exactReviewed.abstentions).toBe(1);expect(report.exactReviewed.falsePositive).toBe(0);expect(report.historicalDiagnostics.disagreed).toBe(1);expect(report.historicalDiagnostics).not.toHaveProperty('precision');expect(report.combinedDiagnostic.matched).toBe(1);expect(report.latestNine.matched).toBe(1);
});
