import {describe,expect,it} from 'vitest';
import {adminPage} from './admin-page.js';

describe('admin navigation',()=>{
  it('names each destination and marks the current page',async()=>{
    const html=await adminPage('<h1>Review jobs</h1>',200,'review').text();
    for(const name of ['Review jobs','Today’s overview','Listing issues','Saved decisions','Reference roles','System status'])expect(html).toContain(`>${name}</a>`);
    expect(html).toContain('href="/admin/discovery" aria-current="page"');
    expect(html).toContain('<title>Review jobs · Builder roles</title>');
  });
  it('keeps sign-in pages free of editorial navigation',async()=>{
    const html=await adminPage('<h1>Sign in</h1>').text();
    expect(html).not.toContain('aria-label="Admin pages"');
  });
});
