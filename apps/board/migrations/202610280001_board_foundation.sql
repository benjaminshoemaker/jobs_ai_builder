create table public.board_jobs (
  id text primary key,
  record jsonb not null check (record->>'id' = id),
  updated_at timestamptz not null default now()
);
create table public.board_feedback (
  visitor_id uuid not null,
  job_id text not null references public.board_jobs(id),
  reason text not null check (reason in ('not_builder', 'unavailable')),
  active boolean not null,
  updated_at timestamptz not null default now(),
  primary key (visitor_id, job_id, reason)
);
create table public.board_feedback_limits (
  visitor_id uuid primary key,
  window_start timestamptz not null,
  requests integer not null
);
alter table public.board_jobs enable row level security;
alter table public.board_feedback enable row level security;
alter table public.board_feedback_limits enable row level security;
-- All access goes through authorized server routes. No anonymous table policies.
create function public.save_board_feedback(p_visitor uuid, p_job text, p_active boolean, p_reason text)
returns void language plpgsql set search_path = '' as $$
declare n integer;
begin
  insert into public.board_feedback_limits values (p_visitor, now(), 1)
  on conflict (visitor_id) do update set
    requests = case when board_feedback_limits.window_start < now() - interval '1 minute' then 1 else board_feedback_limits.requests + 1 end,
    window_start = case when board_feedback_limits.window_start < now() - interval '1 minute' then now() else board_feedback_limits.window_start end
  returning requests into n;
  if n > 30 then raise exception 'rate limit'; end if;
  insert into public.board_feedback values (p_visitor, p_job, p_reason, p_active, now())
  on conflict (visitor_id, job_id, reason) do update set active = excluded.active, updated_at = now();
end;
$$;
revoke all on function public.save_board_feedback(uuid, text, boolean, text) from public;
