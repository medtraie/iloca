-- Phase 4: Financial Data (Payments, Bank Transfers, Audit Logs)

-- 1. Payments Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  amount numeric not null,
  payment_date text not null,
  payment_method text not null, -- 'Espèces', 'Virement', 'Chèque'
  customer_name text,
  contract_number text,
  check_number text,
  check_deposit_date text,
  check_deposit_status text default 'pending', -- 'pending', 'deposited', 'cleared', 'rejected'
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 2. Bank Transfers Table
create table if not exists public.bank_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null, -- 'cash' (Especes -> Banque), 'check' (Cheque -> Banque), 'bank_to_cash' (Banque -> Especes)
  amount numeric not null,
  fees numeric default 0,
  net_amount numeric not null,
  date text not null,
  reference text,
  client_name text,
  contract_number text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 3. Audit Logs Table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null,
  details text not null,
  amount numeric,
  reference text,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

-- 4. Treasury Settings Table (Targets & Thresholds)
create table if not exists public.treasury_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_target numeric default 120000,
  exit_cap numeric default 80000,
  min_available numeric default 25000,
  urgent_check_days numeric default 3,
  high_debt_amount numeric default 10000,
  urgent_expense_days numeric default 7,
  cash_alert_threshold numeric default 2000,
  bank_alert_threshold numeric default 5000,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint unique_user_settings unique(user_id)
);

-- 5. Miscellaneous Expenses Table
create table if not exists public.miscellaneous_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expense_type text not null,
  custom_expense_type text,
  amount numeric not null,
  payment_method text not null,
  expense_date text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Triggers for updated_at
do $$ 
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_payments_updated_at') then
    create trigger update_payments_updated_at before update on public.payments for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_bank_transfers_updated_at') then
    create trigger update_bank_transfers_updated_at before update on public.bank_transfers for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_treasury_settings_updated_at') then
    create trigger update_treasury_settings_updated_at before update on public.treasury_settings for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_miscellaneous_expenses_updated_at') then
    create trigger update_miscellaneous_expenses_updated_at before update on public.miscellaneous_expenses for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- Enable RLS
alter table public.payments enable row level security;
alter table public.bank_transfers enable row level security;
alter table public.audit_logs enable row level security;
alter table public.treasury_settings enable row level security;
alter table public.miscellaneous_expenses enable row level security;

-- Policies
create policy "Users can view their own payments" on public.payments for select using (auth.uid() = user_id);
create policy "Users can insert their own payments" on public.payments for insert with check (auth.uid() = user_id);
create policy "Users can update their own payments" on public.payments for update using (auth.uid() = user_id);
create policy "Users can delete their own payments" on public.payments for delete using (auth.uid() = user_id);

create policy "Users can view their own bank transfers" on public.bank_transfers for select using (auth.uid() = user_id);
create policy "Users can insert their own bank transfers" on public.bank_transfers for insert with check (auth.uid() = user_id);
create policy "Users can update their own bank transfers" on public.bank_transfers for update using (auth.uid() = user_id);
create policy "Users can delete their own bank transfers" on public.bank_transfers for delete using (auth.uid() = user_id);

create policy "Users can view their own audit logs" on public.audit_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own audit logs" on public.audit_logs for insert with check (auth.uid() = user_id);

create policy "Users can view their own treasury settings" on public.treasury_settings for select using (auth.uid() = user_id);
create policy "Users can upsert their own treasury settings" on public.treasury_settings for insert with check (auth.uid() = user_id);
create policy "Users can update their own treasury settings" on public.treasury_settings for update using (auth.uid() = user_id);

create policy "Users can view their own miscellaneous expenses" on public.miscellaneous_expenses for select using (auth.uid() = user_id);
create policy "Users can insert their own miscellaneous expenses" on public.miscellaneous_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update their own miscellaneous expenses" on public.miscellaneous_expenses for update using (auth.uid() = user_id);
create policy "Users can delete their own miscellaneous expenses" on public.miscellaneous_expenses for delete using (auth.uid() = user_id);
