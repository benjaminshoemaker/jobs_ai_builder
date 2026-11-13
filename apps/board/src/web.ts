import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadJobs } from './store.js';
import {jobPostingData,safeJsonLd} from './job-metadata.js';
import {publicBoardEnabled} from './public-launch.js';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function boardPage(id?: string,origin?:string) {
  if(!publicBoardEnabled())return new Response('<h1>Board unavailable</h1>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  try {
    const jobs = await loadJobs();
    const job = id ? jobs.find(job => job.id === id) : undefined;
    if (id && !job) return new Response('<h1>Role unavailable</h1><a href="/">Browse current roles</a>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    let html = await readFile(resolve(process.cwd(), 'public/index.html'), 'utf8');
    if (job) {
      const title = `${job.title} at ${job.company}`;
      const canonical=origin?new URL(`/roles/${encodeURIComponent(job.id)}`,origin).href:null;
      const markup=jobPostingData(job);
      html = html.replace('<title>Builder roles</title>', `<title>${escapeHtml(title)} · Builder roles</title>`)
        .replace('<!--SERVER_META-->', `<meta name="description" content="${escapeHtml(job.reason)}">${canonical?`<link rel="canonical" href="${escapeHtml(canonical)}">`:''}${markup?`<script type="application/ld+json">${safeJsonLd(markup)}</script>`:''}`)
        .replace('<main class="page" id="top">', `<article class="page" id="server-role"><p>${escapeHtml(job.company)}</p><h1>${escapeHtml(job.title)}</h1><p>${escapeHtml(job.workplace)} · ${escapeHtml(job.pay)}</p><p>${escapeHtml(job.reason)}</p>${job.descriptionHtml}<p><a href="${escapeHtml(job.url)}" rel="noopener noreferrer">Apply on company site</a></p><p>Employer page checked ${escapeHtml(job.checkedAt)}</p></article><main class="page" id="top">`);
    }
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    return new Response('<h1>Board temporarily unavailable</h1><p>Please try again shortly.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
}
