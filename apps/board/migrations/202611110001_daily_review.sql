create table public.board_daily_digests (
  review_date date primary key,
  recipient text not null,
  subject text not null,
  body text not null,
  idempotency_key text not null unique,
  state text not null default 'prepared' check (state in ('prepared','sent','failed','unknown')),
  provider_message_id text,
  failure text,
  prepared_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.board_daily_digests enable row level security;
