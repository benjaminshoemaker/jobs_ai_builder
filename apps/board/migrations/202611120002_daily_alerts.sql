create table public.board_daily_alerts (
  alert_key text primary key,
  recipient text not null,
  subject text not null,
  body text not null,
  state text not null default 'prepared' check (state in ('prepared','sent','failed','unknown')),
  provider_message_id text,
  prepared_at timestamptz not null default now(),
  sent_at timestamptz,
  failure text
);
alter table public.board_daily_alerts enable row level security;
