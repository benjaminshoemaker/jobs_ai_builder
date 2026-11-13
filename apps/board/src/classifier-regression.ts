import {createHash} from 'node:crypto';
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const normalized=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
type Example={id?:string;company?:string;source_id?:string;canonical_url?:string;candidate_id?:string;[key:string]:unknown};
export function regressionContext(historical:Example[],feedback:Example[],target:{company:string;id:string;url:string}){
  const company=normalized(target.company);
  const allowed=(row:Example)=>{
    const rowCompany=normalized(row.company??row.source_id?.split(':').slice(1).join(':')??'');
    if(row.id===target.id||row.candidate_id===target.id||row.canonical_url===target.url)return false;
    if(rowCompany&&(rowCompany===company||rowCompany.includes(company)||company.includes(rowCompany)))return false;
    // Remove cross-references that could reveal the target's historical label.
    const escaped=target.company.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return !new RegExp(`\\b${escaped}\\b`,'i').test(JSON.stringify(row));
  };
  const references={historical:historical.filter(allowed),feedback:feedback.filter(allowed),policy:'employer-family-leave-out-v1',note:'Reference labels apply only to their cited role. The target employer and its labels have been withheld. Evaluate the supplied posting from its responsibilities and requirements.'};
  return {context:JSON.stringify(references),historicalIds:references.historical.map(x=>x.id),feedbackIds:references.feedback.map(x=>x.id)};
}
