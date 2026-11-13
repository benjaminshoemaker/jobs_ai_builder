create table public.board_publication_provenance (
  job_id text primary key references public.board_jobs(id),
  reference_id text not null references public.board_review_roles(id),
  check_id uuid not null references public.board_review_checks(id),
  source_content_hash text not null,
  reconciliation jsonb not null,
  published_at timestamptz not null default now()
);
alter table public.board_publication_provenance enable row level security;
