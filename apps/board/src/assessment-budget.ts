export const budgetKey = 'luna-initial-evaluation-1usd';
export const budgetNanodollars = 1_000_000_000;
// Standard short-context rates checked against official pricing on 2026-10-29.
// Reserve one token per UTF-8 byte plus generous framing overhead. No caching
// discount or failed-call refund is assumed. Limit input below the price threshold.
export function requestReservation(body: string) {
  const payload = JSON.parse(body);
  if (payload.model !== 'gpt-6-luna' || payload.tools?.length || payload.service_tier !== 'default') throw new Error('Unapproved model, tools or service tier');
  if (!Number.isInteger(payload.max_output_tokens) || payload.max_output_tokens < 1 || payload.max_output_tokens > 6000) throw new Error('Unbounded output');
  const inputBound = Buffer.byteLength(body, 'utf8') + 4096;
  if (inputBound > 272_000) throw new Error('Input exceeds approved short-context pricing');
  return inputBound * 100 + payload.max_output_tokens * 500;
}
export function canReserve(used: number, reservation: number, cap=budgetNanodollars) {
  return Number.isSafeInteger(used) && used >= 0 && Number.isSafeInteger(reservation) && reservation > 0 && Number.isSafeInteger(cap) && cap > 0 && used + reservation <= cap;
}
export function usageCost(usage: {input_tokens?: number; output_tokens?: number}) {
  const {input_tokens: input, output_tokens: output} = usage;
  if (!Number.isSafeInteger(input) || !Number.isSafeInteger(output) || input! < 0 || output! < 0) return null;
  // Conservatively price all input as uncached, including any cached tokens.
  return input! * 100 + output! * 500;
}

export const pipelineBudgetKey='luna-v11-preview-5usd';
export const pipelineBudgetNanodollars=5_000_000_000;
export const operatingBudgetKey='luna-monthly-10usd';
export const operatingBudgetNanodollars=10_000_000_000;
export const operatingMonthUsageSql=`select coalesce(sum(reserved_nanodollars),0)::text as n
  from board_model_budget_reservations
  where budget_key in ('luna-v11-preview-5usd','luna-monthly-10usd')
    and date_trunc('month',created_at at time zone 'America/Los_Angeles')
      = date_trunc('month',now() at time zone 'America/Los_Angeles')`;
export function pipelineRequestReservation(body:string){
  // Cover uncached input plus the highest documented short-context cache-write
  // rate, even if charged together. No cache discounts or refunds assumed.
  return requestReservation(body)+(Buffer.byteLength(body,'utf8')+4096)*250;
}
