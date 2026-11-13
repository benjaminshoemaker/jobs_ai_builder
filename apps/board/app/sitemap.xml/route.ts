import {loadJobs} from '../../src/store';
import {escapeHtml} from '../../src/web';
import {publicBoardEnabled} from '../../src/public-launch';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  if(!publicBoardEnabled())return new Response('Sitemap unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
  const origin=process.env.BOARD_CANONICAL_ORIGIN||new URL(request.url).origin;
  try{
    const jobs=await loadJobs();
    const urls=[origin+'/',...jobs.map(job=>new URL(`/roles/${encodeURIComponent(job.id)}`,origin).href)];
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${escapeHtml(url)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
  }catch{return new Response('Sitemap unavailable',{status:503});}
}
