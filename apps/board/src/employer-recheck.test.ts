import { expect, it } from 'vitest';
import { readEmployerFeed, safeEmployerHtml } from './employer-recheck.js';
it('distinguishes successful feed absence from failed/incomplete evidence', () => {
  expect(readEmployerFeed({jobs:[]},'ashby','one')).toBeNull();
  expect(()=>readEmployerFeed({error:'unavailable'},'ashby','one')).toThrow();
  expect(()=>readEmployerFeed({jobs:[{title:'Missing identity'}]},'greenhouse','one')).toThrow();
  expect(()=>readEmployerFeed({jobs:[{id:'one'}]},'ashby','one')).toThrow();
  expect(readEmployerFeed({jobs:[{id:'one',isListed:false}]},'ashby','one')).toBeNull();
});
it('sanitizes employer formatting and decodes escaped Greenhouse markup', () => {
  const result=safeEmployerHtml('&lt;h2&gt;Qualifications&lt;/h2&gt;&lt;p onclick="evil()"&gt;Build &amp;amp; ship&lt;/p&gt;');
  expect(result).toContain('<h4>Qualifications</h4>');expect(result).not.toContain('onclick');
  expect(safeEmployerHtml('<script>steal()</script><p>Role</p>')).toBe('<p>Role</p>');
});
