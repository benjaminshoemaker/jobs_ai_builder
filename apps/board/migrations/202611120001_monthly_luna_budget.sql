alter table public.board_model_budget_reservations drop constraint board_model_budget_reservations_budget_key_check;
alter table public.board_model_budget_reservations add constraint board_model_budget_reservations_budget_key_check
  check(budget_key in ('luna-initial-evaluation-1usd','luna-v11-preview-5usd','luna-monthly-10usd'));

insert into public.board_model_allowances(id,model,cap_nanodollars,authorization_note)
values('luna-monthly-10usd','gpt-6-luna',10000000000,
  'User authorized $10 per month for board Luna operation on 2026-11-12. Calendar months use America/Los_Angeles. Prior $5 preview reservations in the same month count against this cap; no schedule, public launch or paid subscription authorized.');

create function public.enforce_board_monthly_luna_budget() returns trigger language plpgsql as $$
begin
  if new.budget_key in ('luna-v11-preview-5usd','luna-monthly-10usd') then
    perform pg_advisory_xact_lock(hashtext('board-monthly-luna-budget'));
    if new.reserved_nanodollars + (
      select coalesce(sum(reserved_nanodollars),0)
      from public.board_model_budget_reservations
      where budget_key in ('luna-v11-preview-5usd','luna-monthly-10usd')
        and date_trunc('month',created_at at time zone 'America/Los_Angeles')
          = date_trunc('month',new.created_at at time zone 'America/Los_Angeles')
    ) > 10000000000 then
      raise exception 'Monthly Luna board allowance exhausted; no model call authorized';
    end if;
  end if;
  return new;
end;
$$;
create trigger board_monthly_luna_budget before insert on public.board_model_budget_reservations
  for each row execute function public.enforce_board_monthly_luna_budget();
