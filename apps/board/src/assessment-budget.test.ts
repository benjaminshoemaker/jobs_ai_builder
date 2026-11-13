import {describe,it,expect} from 'vitest';
import {canReserve,requestReservation,usageCost,pipelineRequestReservation,pipelineBudgetNanodollars} from './assessment-budget.js';
import {assessmentSample,topAssessments} from './assessment-sample.js';
describe('bounded Luna trial',()=>{
  const body={model:'gpt-6-luna',service_tier:'default',max_output_tokens:6000,input:'job'};
  it('reserves input bytes and maximum output without cache discounts',()=>{
    const text=JSON.stringify(body);expect(requestReservation(text)).toBe((Buffer.byteLength(text)+4096)*100+3_000_000);
    expect(canReserve(990_000_000,10_000_000)).toBe(true);expect(canReserve(990_000_001,10_000_000)).toBe(false);
    expect(canReserve(-1,1)).toBe(false);expect(canReserve(0,NaN)).toBe(false);
    expect(usageCost({input_tokens:20000,output_tokens:2000})).toBe(3_000_000);
    expect(usageCost({input_tokens:NaN})).toBe(null);
  });
  it('rejects unapproved or unbounded requests before sending',()=>{
    for(const change of [{model:'gpt-6.1-sol'},{service_tier:'fast'},{tools:[{type:'web_search'}]},{max_output_tokens:6001},{input:'x'.repeat(272000)}])expect(()=>requestReservation(JSON.stringify({...body,...change}))).toThrow();
  });
  it('samples high and low scoring candidates with employer diversity deterministically',()=>{
    const rows=Array.from({length:30},(_,i)=>({id:String(i),score:100-i,source_id:i<8?'big':String(i),provider:['ashby','greenhouse','lever'][i%3]}));
    const sample=assessmentSample(rows,9);expect(sample).toEqual(assessmentSample([...rows].reverse(),9));
    expect(new Set(sample.map(x=>x.id)).size).toBe(9);expect(sample.some(x=>x.score<=80)).toBe(true);
    expect(sample.filter(x=>x.source_id==='big').length).toBeLessThanOrEqual(1);
  });
  it('takes the highest scored candidates in the one-time pass regardless of input order',()=>{
    const rows=[{id:'b',score:9,source_id:'one',provider:'ashby'},{id:'c',score:10,source_id:'two',provider:'lever'},{id:'a',score:10,source_id:'one',provider:'ashby'}];
    expect(topAssessments(rows,2).map(x=>x.id)).toEqual(['a','c']);
    expect(topAssessments([...rows].reverse(),2).map(x=>x.id)).toEqual(['a','c']);
  });
});

it('keeps the new pipeline allowance separate and reserves possible cache writes',()=>{
 const text=JSON.stringify({model:'gpt-6-luna',service_tier:'default',max_output_tokens:2000,input:'job'});
 expect(pipelineRequestReservation(text)).toBe((Buffer.byteLength(text)+4096)*350+1_000_000);
 expect(canReserve(4_999_000_000,1_000_000,pipelineBudgetNanodollars)).toBe(true);
 expect(canReserve(4_999_000_001,1_000_000,pipelineBudgetNanodollars)).toBe(false);
 expect(canReserve(1_000_000_000,1)).toBe(false);
});
