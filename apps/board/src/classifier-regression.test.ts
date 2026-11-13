import {it,expect,vi} from 'vitest';
import {regressionContext} from './classifier-regression.js';
import {boundedModelFetch} from './bounded-model-fetch.js';
it('withholds the employer family, exact identity and cross-referenced labels',()=>{
  const rows=[{id:'target',company:'OpenSesame',decision:'yes'},{id:'other-role',company:'OpenSesame',decision:'no'},{id:'cross',company:'Other',note:'Similar to OpenSesame'},{id:'keep',company:'Independent',decision:'yes'}];
  const result=regressionContext(rows,[{id:'feedback',source_id:'greenhouse:opensesame',decision:'no'}],{company:'OpenSesame',id:'target',url:'https://example.com/job'});
  expect(result.historicalIds).toEqual(['keep']);expect(result.feedbackIds).toEqual([]);expect(result.context).not.toContain('OpenSesame');
});
it('does not send a request when the cumulative budget cannot reserve its full cost',async()=>{
  const query=vi.fn(async(sql:string)=>({rows:sql.includes('sum(reserved')?[{used:'1000000000'}]:[]}));
  const send=vi.fn();const call=boundedModelFetch({query} as any,'id','regression',send);
  await expect(call('https://api.openai.com/v1/responses',{body:JSON.stringify({model:'gpt-6-luna',input:'job'})})).rejects.toThrow('budget');
  expect(send).not.toHaveBeenCalled();expect(query.mock.calls.some(([sql])=>sql==='rollback')).toBe(true);
});
it('persists the shared reservation before sending and records usage afterward',async()=>{
  const events:string[]=[];const query=vi.fn(async(sql:string)=>{events.push(sql);return {rows:sql.includes('sum(reserved')?[{used:'127164700'}]:[]};});
  const send=vi.fn(async()=>{events.push('send');return new Response(JSON.stringify({usage:{input_tokens:1000,output_tokens:100}}));});
  await boundedModelFetch({query} as any,'request','regression',send)('https://api.openai.com/v1/responses',{body:JSON.stringify({model:'gpt-6-luna',input:'job'})});
  expect(events.indexOf('commit')).toBeLessThan(events.indexOf('send'));
  expect(query.mock.calls.some(([sql])=>sql.includes('set actual_nanodollars'))).toBe(true);
  const insert=query.mock.calls.find(([sql])=>sql.includes('insert into board_model_budget'));
  expect((insert as unknown as [string,unknown[]])[1].slice(3)).toEqual([null,'request']);
});
