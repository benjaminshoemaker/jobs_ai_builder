import {plainDescription} from '@ai-builder-jobs/core';

export type PriorSwe='open'|'required'|'unclear';
const openCue=/(?:\b(?:no|without)\s+(?:prior|previous|professional|formal)?\s*(?:software engineering|software development|engineering|software engineer|coding)\s+(?:background|experience)?\s*(?:is\s+)?required\b|\b(?:software engineering|software development|engineering|software engineer)\s+(?:background|experience)\s+(?:is\s+)?not required\b|\b(?:do not|don't|does not)\s+need\s+(?:to be\s+)?(?:a\s+)?software engineer\b|\bnon[- ]engineers?\s+(?:are\s+)?welcome\b)/i;
const careerCue=/\b(?:software engineering|software development|software engineer|full[- ]?stack (?:engineering|development)|back[- ]?end (?:engineering|development)|front[- ]?end (?:engineering|development))\b/i;
const yearsCue=/\b(?:\d+\+?|at least \d+|minimum \d+)\s*(?:years|yrs)\b/i;
const explicitCareerCue=/\b(?:prior|previous|professional)\s+(?:(?:work\s+)?experience\s+(?:as\s+(?:a|an)\s+)?(?:a\s+)?(?:software engineer|in software engineering|in software development)|software engineering experience|software development experience)\b/i;
const optionalCue=/\b(?:preferred|a plus|nice to have|not required|optional|bonus)\b/i;
const optionalCareerCue=/\b(?:software engineering|software development|software engineer|full[- ]?stack (?:engineering|development)|back[- ]?end (?:engineering|development)|front[- ]?end (?:engineering|development))(?:.{0,35})\b(?:preferred|a plus|nice to have|not required|optional|bonus)\b/i;
const softwareTitle=/\b(?:software|backend|back-end|frontend|front-end|full-stack|platform|site reliability)\s+engineer\b/i;
const engineeringYears=/\b(?:\d+\+?|at least \d+|minimum \d+)\s*(?:years|yrs)\s+of\s+(?:professional\s+)?(?:engineering|programming)\s+experience\b/i;
const productionYears=/\b(?:\d+\+?\s*(?:years|yrs).{0,45}(?:shipping|building)\s+production\s+(?:code|systems)|(?:shipping|shipped|building|built)\s+production\s+(?:code|systems)\s+for\s+(?:enough\s+)?years)\b/i;
const openExperience=/\b(?:experience level\s*:\s*(?:doesn't|does not) matter|exceptional new grads?\s+with\s+strong\s+portfolios?)\b/i;

export function priorSweFromSource(html:string,title=''):PriorSwe{
  const lines=plainDescription(html).split(/\n|;|(?<=[.!?])\s+/).map(line=>line.trim()).filter(Boolean);
  const open=lines.some(line=>openCue.test(line)||optionalCareerCue.test(line)||openExperience.test(line));
  const required=lines.some(line=>!openCue.test(line)&&!optionalCareerCue.test(line)&&!optionalCue.test(line)&&((careerCue.test(line)&&(yearsCue.test(line)||explicitCareerCue.test(line)))||(softwareTitle.test(title)&&(engineeringYears.test(line)||productionYears.test(line)))));
  return open&&required?'unclear':open?'open':required?'required':'unclear';
}

export function priorSweForJob(html:string|undefined,humanGate:string|null|undefined,title=''):PriorSwe{
  if(humanGate==='swe_required')return 'required';
  if(humanGate==='explicit_non_swe_route'||humanGate==='technical_fluency')return 'open';
  if(humanGate==='unclear')return 'unclear';
  return html?priorSweFromSource(html,title):'unclear';
}
