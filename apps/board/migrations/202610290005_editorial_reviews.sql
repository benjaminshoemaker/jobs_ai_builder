create table public.board_editorial_reviews (
  id uuid primary key,
  job_id text not null references public.board_jobs(id),
  check_id uuid not null references public.board_maintenance_checks(id),
  action text not null check(action in ('approve','withdraw')),
  actor_id text not null,
  note text not null,
  source_hash text,
  previous_record jsonb not null,
  resulting_record jsonb not null,
  created_at timestamptz not null default now()
);
create index board_editorial_reviews_job_time on public.board_editorial_reviews(job_id,created_at desc);
alter table public.board_editorial_reviews enable row level security;
