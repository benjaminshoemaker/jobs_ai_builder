create table public.board_discovery_sources (
  id text primary key,
  provider text not null check(provider in ('ashby','greenhouse','lever')),
  slug text not null,
  provenance jsonb not null,
  last_checked_at timestamptz
);
create table public.board_discovery_runs (
  id uuid primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check(status in ('running','completed','failed','interrupted')),
  max_requests integer not null check(max_requests between 1 and 500),
  summary jsonb not null default '{}'::jsonb
);
create table public.board_discovery_requests (
  run_id uuid not null references public.board_discovery_runs(id),
  sequence integer not null,
  endpoint text not null,
  attempted_at timestamptz not null default now(),
  primary key(run_id,sequence)
);
create table public.board_discovery_results (
  run_id uuid not null references public.board_discovery_runs(id),
  source_id text not null references public.board_discovery_sources(id),
  outcome text not null check(outcome in ('ok','error','skipped')),
  counts jsonb not null,
  note text not null,
  primary key(run_id,source_id)
);
create table public.board_discovery_candidates (
  id text primary key,
  identity_key text not null unique,
  source_id text not null references public.board_discovery_sources(id),
  employer_posting_id text not null,
  canonical_url text not null,
  title text not null,
  location text not null,
  score integer not null,
  signals jsonb not null,
  location_hint text not null check(location_hint in ('us_indicated','unknown','non_us_indicated')),
  current_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_run_id uuid not null references public.board_discovery_runs(id)
);
create table public.board_discovery_versions (
  candidate_id text not null references public.board_discovery_candidates(id),
  content_hash text not null,
  snapshot jsonb not null,
  checked_at timestamptz not null default now(),
  primary key(candidate_id,content_hash)
);
create index board_discovery_candidates_score on public.board_discovery_candidates(score desc,id);
alter table public.board_discovery_sources enable row level security;
alter table public.board_discovery_runs enable row level security;
alter table public.board_discovery_requests enable row level security;
alter table public.board_discovery_results enable row level security;
alter table public.board_discovery_candidates enable row level security;
alter table public.board_discovery_versions enable row level security;
