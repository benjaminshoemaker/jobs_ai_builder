create table public.board_sources (
  id text primary key,
  canonical_url text not null,
  last_success_at timestamptz
);
create table public.board_collection_runs (
  id uuid primary key,
  source_id text not null references public.board_sources(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  outcome text not null check (outcome in ('running','succeeded','failed')),
  request_count integer not null default 1 check (request_count = 1),
  posting_count integer,
  failure text
);
create table public.board_source_postings (
  source_id text not null references public.board_sources(id),
  employer_posting_id text not null,
  canonical_url text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (source_id, employer_posting_id)
);
create table public.board_posting_versions (
  source_id text not null,
  employer_posting_id text not null,
  content_hash text not null,
  record jsonb not null,
  collected_at timestamptz not null default now(),
  primary key (source_id, employer_posting_id, content_hash),
  foreign key (source_id, employer_posting_id) references public.board_source_postings(source_id, employer_posting_id)
);
create index board_collection_runs_started on public.board_collection_runs(started_at);
alter table public.board_sources enable row level security;
alter table public.board_collection_runs enable row level security;
alter table public.board_source_postings enable row level security;
alter table public.board_posting_versions enable row level security;
