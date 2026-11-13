create table public.board_history_recheck_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  max_requests integer not null check (max_requests between 1 and 40)
);
create table public.board_history_requests (
  run_id uuid not null references public.board_history_recheck_runs(id),
  sequence integer not null,
  endpoint text not null,
  requested_at timestamptz not null default now(),
  primary key (run_id,sequence)
);
alter table public.board_history_recheck_runs enable row level security;
alter table public.board_history_requests enable row level security;
