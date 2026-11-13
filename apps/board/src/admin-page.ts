export type AdminSection='home'|'review'|'today'|'issues'|'saved'|'references'|'system';
const pages=[
  {section:'review',label:'Review jobs',href:'/admin/discovery'},
  {section:'today',label:'Today’s overview',href:'/admin/daily'},
  {section:'issues',label:'Listing issues',href:'/admin/maintenance'},
  {section:'saved',label:'Saved decisions',href:'/admin/discovery?lane=reviewed'},
  {section:'references',label:'Reference roles',href:'/admin/history'},
  {section:'system',label:'System status',href:'/admin/pipeline'},
] as const;
export function adminNavigation(section:AdminSection){
  return `<header class="admin-shell-header"><a href="/admin" ${section==='home'?'aria-current="page"':''}>Admin home</a><a href="/">View job board</a></header><nav class="admin-nav" aria-label="Admin pages">${pages.map(page=>`<a href="${page.href}" ${section===page.section?'aria-current="page"':''}>${page.label}</a>`).join('')}</nav>`;
}
export function adminPage(content:string,status=200,section?:AdminSection){
  const title=section==='home'?'Admin home':pages.find(page=>page.section===section)?.label??'Admin';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} · Builder roles</title><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/admin.css"></head><body data-theme="workshop" data-palette="apricot"><main class="page admin-page">${section?adminNavigation(section):'<p><a href="/">Builder roles</a></p>'}${content}</main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
