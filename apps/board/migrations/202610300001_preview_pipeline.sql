create table public.board_pipeline_runs (
  id uuid primary key,
  actor_id text not null,
  phase text not null check(phase in ('collect','assess','stage','maintain','resume')),
  status text not null check(status in ('running','completed','interrupted','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'
);
create table public.board_pipeline_jobs (
  id text primary key,
  kind text not null check(kind in ('collect','assess','stage','maintain')),
  payload jsonb not null,
  state text not null default 'pending' check(state in ('pending','running','retry','succeeded','blocked','obsolete')),
  attempts integer not null default 0 check(attempts>=0),
  next_attempt_at timestamptz not null default now(),
  run_id uuid references public.board_pipeline_runs(id),
  request_id uuid references public.board_assessment_requests(id),
  lease_until timestamptz,
  result jsonb,
  failure text,
  updated_at timestamptz not null default now()
);
create index board_pipeline_due on public.board_pipeline_jobs(state,next_attempt_at);
create table public.board_candidate_drafts (
  candidate_id text primary key references public.board_discovery_candidates(id),
  job_id text not null unique references public.board_jobs(id),
  review_role_id text not null unique references public.board_review_roles(id),
  review_id uuid not null references public.board_candidate_reviews(id),
  source_hash text not null,
  created_at timestamptz not null default now()
);
-- A manually verified BambooHR source is retained without pretending it is an ATS
-- already supported by broad collection. Collection still selects only its three
-- established bulk providers; direct publication maintenance supports BambooHR.
alter table public.board_discovery_sources drop constraint board_discovery_sources_provider_check;
alter table public.board_discovery_sources add constraint board_discovery_sources_provider_check check(provider in ('ashby','greenhouse','lever','bamboohr'));
alter table public.board_pipeline_runs enable row level security;
alter table public.board_pipeline_jobs enable row level security;
alter table public.board_candidate_drafts enable row level security;
