import sanitizeHtml from 'sanitize-html';
import {decode} from 'he';
import {safeEmployerHtml} from './employer-recheck.js';

export const builderCueLabels={problem:'Problem judgment',building:'Personal building',ai:'AI used in that building',delivery:'Delivery and learning'} as const;
export type BuilderCue=keyof typeof builderCueLabels;
const cuePatterns:Record<BuilderCue,RegExp[]>={
  problem:[
    /\b(?:identify|understand|discover|research|investigate|define|frame|prioriti[sz]e|shape|decide)\b(?:\s+\S+){0,8}?\s+\b(?:users?|customers?|business|workflows?|processes?|problems?|needs?|opportunities|products?|solutions?)\b/gi,
    /\b(?:customer|user|product)\s+discovery\b/gi,
    /\b(?:what|which)\s+to\s+build\b/gi,
  ],
  building:[
    /\b(?:personally\s+|directly\s+)?(?:build|implement|create|develop|code|prototype)\s+(?:and\s+(?:ship|deploy)\s+)?(?:\w+\s+){0,5}?(?:tools?|software|features?|apps?|applications?|agents?|automations?|workflows?|systems?|prototypes?|components?)\b/gi,
    /\b(?:hands.on|hands-on)\s+(?:building|implementation|coding)\b/gi,
    /\b(?:clickable|working|functional|shippable)\s+prototypes?\b/gi,
  ],
  ai:[
    /\b(?:Claude\s+Code|Cursor|Codex|Lovable|Replit\s+Agent|GitHub\s+Copilot|v0|Bolt\.new)\b/gi,
    /\b(?:AI|LLMs?|agentic)(?:-|\s+)(?:assisted|powered|native)?\s*(?:coding|development|building|implementation|prototyping|tools?)\b/gi,
    /\b(?:using|with|via|through)\s+(?:AI|LLMs?|Claude|Copilot|Cursor|Codex)\b/gi,
    /\b(?:AI|LLMs?)\s+to\s+(?:build|code|implement|prototype|test|iterate)\b/gi,
  ],
  delivery:[
    /\b(?:ship|launch|deploy|release|put)\s+(?:\w+\s+){0,6}?(?:to|into|for)\s+(?:users?|customers?|production|use)\b/gi,
    /\b(?:measure|track|learn from|iterate on|improve from|respond to)\s+(?:\w+\s+){0,6}?(?:adoption|usage|feedback|outcomes?|results?|users?)\b/gi,
    /\b(?:own|drive)\s+(?:adoption|rollout|delivery|outcomes?)\b/gi,
    /\b(?:production|real users|user feedback|customer feedback|adoption)\b/gi,
  ],
};
type Match={start:number;end:number;cue:BuilderCue};
const cueOrder:BuilderCue[]=['problem','building','ai','delivery'];
function markCues(text:string,counts:Record<BuilderCue,number>){
  const matches:Match[]=[];
  for(const cue of cueOrder)for(const pattern of cuePatterns[cue]){
    pattern.lastIndex=0;
    for(const match of text.matchAll(pattern))if(match.index!==undefined)matches.push({start:match.index,end:match.index+match[0].length,cue});
  }
  matches.sort((a,b)=>a.start-b.start||b.end-a.end||cueOrder.indexOf(a.cue)-cueOrder.indexOf(b.cue));
  let cursor=0,result='';
  for(const match of matches){
    if(match.start<cursor||counts[match.cue]>=8)continue;
    result+=text.slice(cursor,match.start);
    const number=++counts[match.cue];
    const id=`evidence-${match.cue}${number===1?'':`-${number}`}`;
    result+=`<mark id="${id}" tabindex="-1" class="review-mark review-mark-${match.cue}" title="${builderCueLabels[match.cue]} cue">${text.slice(match.start,match.end)}</mark>`;
    cursor=match.end;
  }
  return result+text.slice(cursor);
}

export function highlightedPosting(html:string){
  const counts:Record<BuilderCue,number>={problem:0,building:0,ai:0,delivery:0};
  const sanitized=safeEmployerHtml(html).replace(/<h4>([\s\S]*?)<\/h4>/g,(_,heading:string)=>'<h4>'+sanitizeHtml(heading,{allowedTags:[],allowedAttributes:{}})+'</h4>');
  const marked=sanitizeHtml(sanitized,{allowedTags:['p','ul','ol','li','strong','em','b','i','br','blockquote','hr','h4'],allowedAttributes:{},textFilter:(value,tag)=>tag==='h4'?value:markCues(value,counts)});
  let requirements=false;
  const htmlWithAnchor=marked.replace(/<h4>([^<]*)<\/h4>/g,(whole,heading:string)=>{
    if(requirements||!/qualifications|requirements|what we.{0,12}looking for|what you.{0,12}(?:bring|have|need)|your background|about you/i.test(decode(heading)))return whole;
    requirements=true;
    return `<h4 id="background-requirements">${heading}</h4>`;
  });
  return {html:htmlWithAnchor,counts,requirements};
}
