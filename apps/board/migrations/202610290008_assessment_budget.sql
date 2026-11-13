-- One explicitly authorized evaluation budget, cumulative across worker restarts.
create table public.board_model_budget_reservations (
  request_id uuid primary key references public.board_assessment_requests(id),
  budget_key text not null check (budget_key = 'luna-initial-evaluation-1usd'),
  reserved_nanodollars bigint not null check (reserved_nanodollars > 0),
  actual_nanodollars bigint,
  usage jsonb,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.board_model_budget_reservations enable row level security;
