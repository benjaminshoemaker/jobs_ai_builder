import {it,expect} from 'vitest';
import {baselineRequest,baselineReservation,baselineModels} from './capability-baseline.js';
it('isolates classification from historical answers and production-specific attributes',()=>{
  const input={title:'Example',company:'Employer',location:'US',description:'Understand the user problem and decide what to build. Build and ship working tools with Claude Code. Test with users and improve the result.'};
  const [luna,sol]=baselineModels.map(m=>baselineRequest(m,input));
  expect({...luna,model:sol.model}).toEqual(sol);
  expect(luna.instructions).not.toContain('User reference judgments');
  const schema=luna.text.format.schema;expect(schema.required).toEqual(['decision','reason','evidence']);
  expect(Object.keys(schema.properties)).not.toContain('engineering');
  expect(JSON.parse(luna.input).passages.map((p:any)=>p.text).join('')).toBe(input.description);
  // The Sol model ID is one byte longer; the bound includes serialized bytes.
  expect(baselineReservation(sol)).toBe(20*baselineReservation(luna)+2500);
  expect(()=>baselineRequest('gpt-6-luna',{...input,description:''})).toThrow('Full source');
});
