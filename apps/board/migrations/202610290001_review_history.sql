create table public.board_review_roles (
  id text primary key,
  identity_key text not null unique,
  company text not null,
  title text not null,
  canonical_url text,
  historical_label text not null,
  decision text not null check (decision in ('approved','rejected','uncertain')),
  user_focus jsonb,
  historical_reason text not null,
  reviewed_version_hash text,
  provenance jsonb not null,
  imported_at timestamptz not null default now()
);
create table public.board_review_evidence (
  id text primary key,
  role_id text not null references public.board_review_roles(id),
  artifact_path text not null,
  artifact_hash text not null,
  source_record_id text not null,
  evidence_kind text not null check (evidence_kind in ('compiled_user_reference','recorded_user_reply','historical_user_reference','recorded_user_review','identity_correction')),
  record jsonb not null,
  imported_at timestamptz not null default now()
);
create table public.board_review_checks (
  id uuid primary key,
  role_id text not null references public.board_review_roles(id),
  checked_at timestamptz not null default now(),
  outcome text not null check (outcome in ('open','not_listed','unknown')),
  canonical_url text,
  content_hash text,
  snapshot jsonb,
  note text not null,
  historical_comparison text not null check (historical_comparison in ('not_available','identical','changed'))
);
create index board_review_checks_role_time on public.board_review_checks(role_id,checked_at desc);
alter table public.board_review_roles enable row level security;
alter table public.board_review_evidence enable row level security;
alter table public.board_review_checks enable row level security;
