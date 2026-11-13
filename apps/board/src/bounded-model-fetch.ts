import type {Client} from 'pg';
import {budgetKey,requestReservation,canReserve,usageCost} from './assessment-budget.js';
export function boundedRequestBody(body:string){
  return JSON.stringify({...JSON.parse(body),service_tier:'default',reasoning:{effort:'low'},max_output_tokens:6000});
}
export function boundedModelFetch(client:Pick<Client,'query'>,id:string,kind:'discovery'|'regression',fetchImpl:typeof fetch=fetch):typeof fetch {
  return async(url,init)=>{
    if(url!=='https://api.openai.com/v1/responses'||typeof init?.body!=='string')throw new Error('Unapproved API request');
    const body=boundedRequestBody(init.body);
    const reservation=requestReservation(body);
    await client.query('begin');
    try {
      await client.query("select pg_advisory_xact_lock(hashtext('board-initial-model-budget'))");
      const prior=await client.query('select coalesce(sum(reserved_nanodollars),0)::text as used from board_model_budget_reservations where budget_key=$1',[budgetKey]);
      if(!canReserve(Number(prior.rows[0].used),reservation))throw new Error('The cumulative $1 budget is exhausted');
      await client.query('insert into board_model_budget_reservations(id,budget_key,reserved_nanodollars,discovery_request_id,regression_request_id) values($1,$2,$3,$4,$5)',[id,budgetKey,reservation,kind==='discovery'?id:null,kind==='regression'?id:null]);
      await client.query('commit');
    }catch(error){await client.query('rollback');throw error;}
    const response=await fetchImpl(url,{...init,body});
    // Never release reservations after errors, timeouts, or cached-token savings.
    const payload=await response.clone().json().catch(()=>null);
    if(payload?.usage)await client.query('update board_model_budget_reservations set actual_nanodollars=$2,usage=$3 where id=$1',[id,usageCost(payload.usage),JSON.stringify(payload.usage)]);
    return response;
  };
}
