-- Phase 3: Fuel Logs and Tracking Positions

-- 1. Fuel Logs Table
create table if not exists public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver text,
  quantity numeric not null,
  price numeric not null,
  station text,
  date text not null,
  odometer numeric,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- 2. Tracking Positions Table
create table if not exists public.tracking_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  timestamp numeric not null,
  lat numeric not null,
  lng numeric not null,
  speed numeric,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Triggers for updated_at
do $$ 
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_fuel_logs_updated_at') then
    create trigger update_fuel_logs_updated_at before update on public.fuel_logs for each row execute function public.update_updated_at_column();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'update_tracking_positions_updated_at') then
    create trigger update_tracking_positions_updated_at before update on public.tracking_positions for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- Enable RLS
alter table public.fuel_logs enable row level security;
alter table public.tracking_positions enable row level security;

-- Policies
create policy "Users can view their own fuel logs" on public.fuel_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own fuel logs" on public.fuel_logs for insert with check (auth.uid() = user_id);
create policy "Users can update their own fuel logs" on public.fuel_logs for update using (auth.uid() = user_id);
create policy "Users can delete their own fuel logs" on public.fuel_logs for delete using (auth.uid() = user_id);

create policy "Users can view their own tracking positions" on public.tracking_positions for select using (auth.uid() = user_id);
create policy "Users can insert their own tracking positions" on public.tracking_positions for insert with check (auth.uid() = user_id);
create policy "Users can update their own tracking positions" on public.tracking_positions for update using (auth.uid() = user_id);
create policy "Users can delete their own tracking positions" on public.tracking_positions for delete using (auth.uid() = user_id);
