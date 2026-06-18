-- Create updated_at trigger function if not exists
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  last_name text not null,
  first_name text,
  address_morocco text,
  phone text,
  address_foreign text,
  cin text,
  cin_delivered text,
  license_number text,
  license_delivered text,
  passport_number text,
  passport_delivered text,
  birth_date date,
  email text,
  avatar_url text,
  documents_urls jsonb not null default '[]'::jsonb,
  nationality text,
  customer_type text not null default 'Locataire Principal',
  cin_image_url text,
  license_image_url text,
  passport_image_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.clients enable row level security;

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_last_name on public.clients(last_name);
create index if not exists idx_clients_cin on public.clients(cin);

alter table public.clients
  add column if not exists nationality text,
  add column if not exists customer_type text default 'Locataire Principal',
  add column if not exists cin_image_url text,
  add column if not exists license_image_url text,
  add column if not exists passport_image_url text,
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists documents_urls jsonb not null default '[]'::jsonb;

alter table public.clients
  alter column customer_type set default 'Locataire Principal';

alter table public.clients
  drop constraint if exists clients_customer_type_check;

alter table public.clients
  add constraint clients_customer_type_check
  check (customer_type in ('Locataire Principal', 'Chauffeur secondaire'));

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'Users can view their own clients'
  ) then
    create policy "Users can view their own clients"
    on public.clients
    for select
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'Users can insert their own clients'
  ) then
    create policy "Users can insert their own clients"
    on public.clients
    for insert
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'Users can update their own clients'
  ) then
    create policy "Users can update their own clients"
    on public.clients
    for update
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'Users can delete their own clients'
  ) then
    create policy "Users can delete their own clients"
    on public.clients
    for delete
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_clients_updated_at'
  ) then
    create trigger update_clients_updated_at
    before update on public.clients
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default 'null'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (user_id, setting_key)
);

alter table public.app_settings enable row level security;

create index if not exists idx_app_settings_user_id on public.app_settings(user_id);
create index if not exists idx_app_settings_key on public.app_settings(setting_key);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'Users can view their own app settings'
  ) then
    create policy "Users can view their own app settings"
    on public.app_settings
    for select
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'Users can insert their own app settings'
  ) then
    create policy "Users can insert their own app settings"
    on public.app_settings
    for insert
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'Users can update their own app settings'
  ) then
    create policy "Users can update their own app settings"
    on public.app_settings
    for update
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'Users can delete their own app settings'
  ) then
    create policy "Users can delete their own app settings"
    on public.app_settings
    for delete
    using (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_app_settings_updated_at'
  ) then
    create trigger update_app_settings_updated_at
    before update on public.app_settings
    for each row
    execute function public.update_updated_at_column();
  end if;
end $$;
