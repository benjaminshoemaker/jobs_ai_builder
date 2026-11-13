import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./store.js',()=>({database:()=>({query:m.query})}));
import {beginIntake,finishIntake} from './daily-workflow.js';
beforeEach(()=>vi.resetAllMocks());
it('starts only the workflow that owns the daily claim',async()=>{
  m.query.mockResolvedValueOnce({rows:[]}).mockResolvedValueOnce({rows:[{state:'running',run_token:'other'}]});
  expect(await beginIntake('2026-11-11','mine')).toBe(false);
  expect(m.query.mock.calls[0]?.[1]).toEqual(['2026-11-11','mine']);
  m.query.mockResolvedValueOnce({rows:[{review_date:'2026-11-11'}]});
  expect(await beginIntake('2026-11-11','mine')).toBe(true);
});
it('finishes only its own running cycle and serializes the summary',async()=>{
  m.query.mockResolvedValue({rows:[]});
  await finishIntake('2026-11-11','mine',[{phase:'collect',count:5}]);
  expect(m.query.mock.calls[0]?.[0]).toContain("run_token=$2 and state='running'");
  expect(m.query.mock.calls[0]?.[1]).toEqual(['2026-11-11','mine','completed','[{"phase":"collect","count":5}]']);
});
