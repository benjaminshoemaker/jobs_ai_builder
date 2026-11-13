alter table public.board_daily_cycles add column run_token uuid;
alter table public.board_daily_cycles drop constraint board_daily_cycles_state_check;
alter table public.board_daily_cycles add constraint board_daily_cycles_state_check
  check(state in ('queued','running','completed','failed'));
