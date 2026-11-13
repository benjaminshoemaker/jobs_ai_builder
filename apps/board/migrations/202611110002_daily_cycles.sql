create table public.board_daily_cycles (
  review_date date primary key,
  state text not null check(state in ('running','completed','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'
);
alter table public.board_daily_cycles enable row level security;
