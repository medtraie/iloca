-- Create tracking_positions table if it doesn't exist
create table if not exists public.tracking_positions (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  timestamp numeric not null,
  lat numeric not null,
  lng numeric not null,
  speed numeric default 0,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.tracking_positions enable row level security;

-- Policies for tracking_positions
drop policy if exists "Allow all access to tracking_positions" on public.tracking_positions;
create policy "Allow all access to tracking_positions" on public.tracking_positions for all using (true);

-- Index for faster queries
create index if not exists idx_tracking_positions_vehicle_id on public.tracking_positions(vehicle_id);
create index if not exists idx_tracking_positions_timestamp on public.tracking_positions(timestamp);
