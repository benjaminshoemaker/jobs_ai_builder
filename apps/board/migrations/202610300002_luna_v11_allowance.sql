-- User authorized Luna and a $5 allowance for the manual live v11 preview test.
-- Preserve the original evaluation ledger; older workers cannot use this pool.
alter table public.board_model_budget_reservations drop constraint board_model_budget_reservations_budget_key_check;
alter table public.board_model_budget_reservations add constraint board_model_budget_reservations_budget_key_check check(budget_key in ('luna-initial-evaluation-1usd','luna-v11-preview-5usd'));
create table public.board_model_allowances (
 id text primary key,
 model text not null,
 cap_nanodollars bigint not null check(cap_nanodollars>0),
 authorization_note text not null,
 created_at timestamptz not null default now()
);
alter table public.board_model_allowances enable row level security;
insert into public.board_model_allowances(id,model,cap_nanodollars,authorization_note) values('luna-v11-preview-5usd','gpt-6-luna',5000000000,'User: OK. Use Luna and $5 allowance. Manual preview v11 classification only; no scheduling or publication.');
