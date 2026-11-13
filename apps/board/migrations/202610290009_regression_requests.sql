create table public.board_classifier_regression_requests (
  id uuid primary key,
  run_id text not null,
  case_key text not null,
  model text not null,
  expected text not null check(expected in ('yes','no')),
  source_hash text not null,
  context_hash text not null,
  classifier_hash text not null,
  status text not null check(status in ('started','succeeded','failed')),
  result jsonb,
  failure text,
  created_at timestamptz not null default clock_timestamp(),
  finished_at timestamptz,
  unique(run_id,case_key)
);
alter table public.board_classifier_regression_requests enable row level security;
-- Keep both workers under the SAME cumulative $1 ledger, with a constrained
-- reference to either a discovery request or a regression request.
alter table public.board_model_budget_reservations rename column request_id to id;
alter table public.board_model_budget_reservations drop constraint board_model_budget_reservations_request_id_fkey;
alter table public.board_model_budget_reservations add column discovery_request_id uuid unique references public.board_assessment_requests(id);
alter table public.board_model_budget_reservations add column regression_request_id uuid unique references public.board_classifier_regression_requests(id);
update public.board_model_budget_reservations set discovery_request_id=id;
alter table public.board_model_budget_reservations add constraint model_budget_request_kind check(num_nonnulls(discovery_request_id,regression_request_id)=1);
