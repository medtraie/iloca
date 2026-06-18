-- Phase 2: Contracts, Repairs, and Expenses tables

-- 0. Ensure Vehicles Table Exists
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  brand text not null,
  model text,
  registration text,
  year numeric,
  fuel_type text,
  gearbox text,
  mileage numeric,
  color text,
  daily_rate numeric,
  status text default 'disponible',
  departure_mileage numeric,
  documents_urls jsonb default '[]'::jsonb,
  photos_urls jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS and Policies for Vehicles
alter table public.vehicles enable row level security;
create policy "Users can view their own vehicles" on public.vehicles for select using (auth.uid() = user_id);
create policy "Users can insert their own vehicles" on public.vehicles for insert with check (auth.uid() = user_id);
create policy "Users can update their own vehicles" on public.vehicles for update using (auth.uid() = user_id);
create policy "Users can delete their own vehicles" on public.vehicles for delete using (auth.uid() = user_id);

do $$ 
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_vehicles_updated_at') then
    create trigger update_vehicles_updated_at before update on public.vehicles for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- 1. Contracts Table
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  contract_number text not null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  customer_national_id text,
  vehicle text not null,
  vehicleId uuid references public.vehicles(id) on delete set null,
  start_date text not null,
  end_date text not null,
  daily_rate numeric,
  total_amount numeric not null,
  advance_payment numeric,
  remaining_amount numeric,
  status text not null,
  payment_method text,
  notes text,
  delivery_fuel_level numeric,
  return_fuel_level numeric,
  delivery_damages jsonb default '[]'::jsonb,
  return_damages jsonb default '[]'::jsonb,
  contract_data jsonb default '{}'::jsonb,
  "prolongationAu" text,
  "nombreDeJourProlonge" numeric,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 2. Repairs Table
create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicleId uuid not null references public.vehicles(id) on delete cascade,
  "vehicleInfo" jsonb not null default '{}'::jsonb,
  "typeReparation" text not null,
  cout numeric not null,
  paye numeric not null default 0,
  dette numeric not null default 0,
  "dateReparation" text not null,
  "paymentMethod" text not null,
  "checkName" text,
  "checkReference" text,
  "checkDate" text,
  "checkDepositDate" text,
  "pieceJointe" jsonb,
  "dueDate" text,
  "slaTargetDays" numeric,
  "operationalStatus" text,
  payments jsonb default '[]'::jsonb,
  updates jsonb default '[]'::jsonb,
  note text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 3. Expenses Table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null,
  total_cost numeric not null,
  start_date text not null,
  end_date text not null,
  period_months numeric not null,
  monthly_cost numeric not null,
  document_url text,
  notes text,
  tags jsonb default '[]'::jsonb,
  recurring_enabled boolean default false,
  recurring_frequency text,
  archived boolean default false,
  parent_expense_id uuid references public.expenses(id) on delete set null,
  next_due_date text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 4. Monthly Expenses Table
create table if not exists public.monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expense_id uuid references public.expenses(id) on delete set null,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  month_year text not null,
  allocated_amount numeric not null,
  expense_type text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 5. Expense Budgets Table
create table if not exists public.expense_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  expense_type text not null,
  month_year text not null,
  budget_amount numeric not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 6. Expense Audit Logs Table
create table if not exists public.expense_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expense_id uuid references public.expenses(id) on delete set null,
  action text not null,
  details text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Apply updated_at triggers
do $$ 
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_contracts_updated_at') then
    create trigger update_contracts_updated_at before update on public.contracts for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_repairs_updated_at') then
    create trigger update_repairs_updated_at before update on public.repairs for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_expenses_updated_at') then
    create trigger update_expenses_updated_at before update on public.expenses for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_monthly_expenses_updated_at') then
    create trigger update_monthly_expenses_updated_at before update on public.monthly_expenses for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_expense_budgets_updated_at') then
    create trigger update_expense_budgets_updated_at before update on public.expense_budgets for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_expense_audit_logs_updated_at') then
    create trigger update_expense_audit_logs_updated_at before update on public.expense_audit_logs for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- Enable RLS
alter table public.contracts enable row level security;
alter table public.repairs enable row level security;
alter table public.expenses enable row level security;
alter table public.monthly_expenses enable row level security;
alter table public.expense_budgets enable row level security;
alter table public.expense_audit_logs enable row level security;

-- RLS Policies
create policy "Users can view their own contracts" on public.contracts for select using (auth.uid() = user_id);
create policy "Users can insert their own contracts" on public.contracts for insert with check (auth.uid() = user_id);
create policy "Users can update their own contracts" on public.contracts for update using (auth.uid() = user_id);
create policy "Users can delete their own contracts" on public.contracts for delete using (auth.uid() = user_id);

create policy "Users can view their own repairs" on public.repairs for select using (auth.uid() = user_id);
create policy "Users can insert their own repairs" on public.repairs for insert with check (auth.uid() = user_id);
create policy "Users can update their own repairs" on public.repairs for update using (auth.uid() = user_id);
create policy "Users can delete their own repairs" on public.repairs for delete using (auth.uid() = user_id);

create policy "Users can view their own expenses" on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert their own expenses" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update their own expenses" on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete their own expenses" on public.expenses for delete using (auth.uid() = user_id);

create policy "Users can view their own monthly expenses" on public.monthly_expenses for select using (auth.uid() = user_id);
create policy "Users can insert their own monthly expenses" on public.monthly_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update their own monthly expenses" on public.monthly_expenses for update using (auth.uid() = user_id);
create policy "Users can delete their own monthly expenses" on public.monthly_expenses for delete using (auth.uid() = user_id);

create policy "Users can view their own expense budgets" on public.expense_budgets for select using (auth.uid() = user_id);
create policy "Users can insert their own expense budgets" on public.expense_budgets for insert with check (auth.uid() = user_id);
create policy "Users can update their own expense budgets" on public.expense_budgets for update using (auth.uid() = user_id);
create policy "Users can delete their own expense budgets" on public.expense_budgets for delete using (auth.uid() = user_id);

create policy "Users can view their own expense audit logs" on public.expense_audit_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own expense audit logs" on public.expense_audit_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own expense audit logs" on public.expense_audit_logs for update using (auth.uid() = user_id);
create policy "Users can delete their own expense audit logs" on public.expense_audit_logs for delete using (auth.uid() = user_id);
