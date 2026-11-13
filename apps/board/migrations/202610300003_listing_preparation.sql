create table public.board_listing_preparations (
 id uuid primary key,
 job_id text not null references public.board_jobs(id),
 source_hash text not null,
 record_version text not null,
 policy_version text not null,
 model text not null,
 request_hash text not null,
 status text not null check(status in ('started','succeeded','failed','obsolete')),
 result jsonb,
 failure text,
 created_at timestamptz not null default clock_timestamp(),
 finished_at timestamptz,
 unique(job_id,source_hash,policy_version,model)
);
alter table public.board_listing_preparations enable row level security;
alter table public.board_model_budget_reservations add column listing_preparation_id uuid unique references public.board_listing_preparations(id);
alter table public.board_model_budget_reservations drop constraint model_budget_request_kind;
alter table public.board_model_budget_reservations add constraint model_budget_request_kind check(num_nonnulls(discovery_request_id,regression_request_id,listing_preparation_id)=1);
