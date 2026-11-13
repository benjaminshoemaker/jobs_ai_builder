create table public.board_calibration_versions (
  id text primary key,
  manifest jsonb not null,
  prompt_context text not null,
  created_at timestamptz not null default clock_timestamp()
);
create table public.board_candidate_assessments (
  id uuid primary key,
  candidate_id text not null,
  source_hash text not null,
  classifier_version text not null,
  calibration_version text not null references public.board_calibration_versions(id),
  model text not null,
  result jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key(candidate_id,source_hash) references public.board_discovery_versions(candidate_id,content_hash),
  unique(id,candidate_id,source_hash)
);
create index board_candidate_assessments_latest on public.board_candidate_assessments(candidate_id,source_hash,created_at desc);
create table public.board_candidate_reviews (
  id uuid primary key,
  candidate_id text not null,
  source_hash text not null,
  decision text not null check(decision in ('yes','no','maybe')),
  focus jsonb,
  engineering_gate text check(engineering_gate in ('explicit_non_swe_route','swe_required','technical_fluency','unclear')),
  note text not null,
  actor_id text not null,
  sampling_lane text not null,
  selection_policy text not null,
  purpose text not null check(purpose in ('calibration','evaluation')),
  assessment_id uuid,
  created_at timestamptz not null default clock_timestamp(),
  foreign key(candidate_id,source_hash) references public.board_discovery_versions(candidate_id,content_hash),
  foreign key(assessment_id,candidate_id,source_hash) references public.board_candidate_assessments(id,candidate_id,source_hash)
);
create index board_candidate_reviews_latest on public.board_candidate_reviews(candidate_id,source_hash,created_at desc);
create table public.board_assessment_requests (
  id uuid primary key,
  candidate_id text not null references public.board_discovery_candidates(id),
  source_hash text not null,
  model text not null,
  calibration_version text not null references public.board_calibration_versions(id),
  status text not null check(status in ('started','succeeded','failed','obsolete')),
  requested_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.board_calibration_versions enable row level security;
alter table public.board_candidate_assessments enable row level security;
alter table public.board_candidate_reviews enable row level security;
alter table public.board_assessment_requests enable row level security;
