import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect,it } from 'vitest';
const root=resolve(import.meta.dirname,'../../..');
const prototype=readFileSync(resolve(root,'design/board-concepts.html'),'utf8');
const css=readFileSync(resolve(root,'apps/board/public/styles.css'),'utf8');
const tokens=readFileSync(resolve(root,'apps/board/public/tokens.css'),'utf8');
function vars(text:string){return Object.fromEntries([...text.matchAll(/(--[a-z-]+)\s*:\s*([^;{}]+)/g)].map(m=>[m[1],m[2].trim()]));}
it('keeps the selected Apricot tokens aligned with the approved mockup',()=>{
 const base=prototype.match(/body\[data-theme="workshop"\] \{([^}]+)\}/)![1];
 const apricot=prototype.match(/body\[data-theme="workshop"\]\[data-palette="apricot"\] \{([^}]+)\}/)![1];
 expect(vars(tokens)).toEqual(vars(base+apricot));
});
it('preserves the mockup geometry and typography for cards, controls and role details',()=>{
 for(const selector of ['.job-card','.company-line','.company-logo','.job-card h3','.card-facts','.card-side','.card-side .apply-action','.card-side .details-action','dialog','.detail-toolbar','.detail-body','.detail-facts','.posting-section summary','.employer-copy']){
  const rule=new RegExp('(?:^|\\n)\\s*'+selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' \\{([^}]+)\\}');
  const expected=prototype.match(rule)?.[1].trim();expect(expected,selector).toBeTruthy();expect(css.match(rule)?.[1].trim(),selector).toBe(expected);
 }
});
