import {makeDailyReviewQueue,modelSuggestsBuilder,type QueueItem} from './candidate-review.js';

export function dailyReviewDigest(items:QueueItem[],origin:string,now=Date.now(),lastRunStatus='unknown') {
  const eligible=items.filter(item=>item.has_text&&!item.review_id&&item.location_hint!=='non_us_indicated');
  const since=now-24*60*60*1000;
  const newItems=eligible.filter(item=>item.assessed_at&&new Date(item.assessed_at).getTime()>=since&&item.assessment);
  const likelyMatches=newItems.filter(modelSuggestsBuilder);
  const queue=makeDailyReviewQueue(eligible,now,5);
  const top=queue.map(item=>({title:item.title,company:item.source_id.split(':').slice(1).join(':')||item.source_id,location:item.location,id:item.id,lane:item.lane,link:new URL(`/admin/discovery?candidate=${encodeURIComponent(item.id)}`,origin).href}));
  const link=new URL('/admin/discovery',origin).href;
  const subject=`Builder roles: ${likelyMatches.length} new likely matches`;
  const lines=[`${likelyMatches.length} new likely builder matches from ${newItems.length} newly assessed jobs; ${eligible.length} unreviewed jobs have full employer text.`, `Latest intake status: ${lastRunStatus}.`, '',...(top.length?['Suggested for review today (mixed categories):',...top.map(item=>`• ${item.title} · ${item.company} · ${item.location} · ${item.lane?.replaceAll('_',' ')}\n  ${item.link}`)]:['No jobs to review today.']),'',`Review jobs: ${link}`];
  return {subject,text:lines.join('\n'),newCount:likelyMatches.length,newAssessedCount:newItems.length,backlogCount:eligible.length,top,link};
}
