-- Update vehicles RLS to allow public access temporarily while Auth is bypassed
drop policy if exists "Users can view their own vehicles" on public.vehicles;
drop policy if exists "Users can insert their own vehicles" on public.vehicles;
drop policy if exists "Users can update their own vehicles" on public.vehicles;
drop policy if exists "Users can delete their own vehicles" on public.vehicles;
drop policy if exists "Allow all access to vehicles" on public.vehicles;

create policy "Allow all access to vehicles" on public.vehicles for all using (true) with check (true);

-- Also make user_id optional since we are bypassing auth for now
alter table public.vehicles alter column user_id drop not null;
