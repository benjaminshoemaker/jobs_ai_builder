create table public.board_maintenance_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check(status in ('running','completed','failed','interrupted')),
  max_requests integer not null check(max_requests between 1 and 40),
  summary jsonb not null default '{}'::jsonb
);
create table public.board_maintenance_requests (
  run_id uuid not null references public.board_maintenance_runs(id),
  sequence integer not null,
  endpoint text not null,
  attempted_at timestamptz not null default now(),
  primary key(run_id,sequence)
);
create table public.board_maintenance_checks (
  id uuid primary key,
  run_id uuid not null references public.board_maintenance_runs(id),
  job_id text not null references public.board_jobs(id),
  checked_at timestamptz not null,
  outcome text not null check(outcome in ('refreshed','needs_review','retry','closure_pending','closed','superseded')),
  note text not null,
  changed_fields jsonb not null default '[]'::jsonb,
  observed_hash text,
  snapshot jsonb,
  previous_record jsonb not null
);
create index board_maintenance_checks_job_time on public.board_maintenance_checks(job_id,checked_at desc);
create table public.board_maintenance_state (
  job_id text primary key references public.board_jobs(id),
  check_id uuid not null references public.board_maintenance_checks(id),
  disposition text not null check(disposition in ('refreshed','needs_review','retry','closure_pending','closed')),
  failures integer not null default 0 check(failures>=0),
  next_check_at timestamptz not null
);
alter table public.board_maintenance_runs enable row level security;
alter table public.board_maintenance_requests enable row level security;
alter table public.board_maintenance_checks enable row level security;
alter table public.board_maintenance_state enable row level security;
