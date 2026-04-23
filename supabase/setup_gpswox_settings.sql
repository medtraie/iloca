-- إنشاء جدول إعدادات GPSwox للشركات
create table if not exists public.gpswox_settings (
    id uuid default gen_random_uuid() primary key,
    company_id uuid, -- يفضّل ربطه بـ companies.id إن كان جدول الشركات موجوداً
    api_url text not null default 'sf-tracker.pro',
    email text not null,
    password text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- شركة واحدة = إعدادات واحدة (قيد فريد مباشر يدعم ON CONFLICT(company_id))
drop index if exists gpswox_settings_company_id_unique;
alter table public.gpswox_settings
  drop constraint if exists gpswox_settings_company_id_key;
alter table public.gpswox_settings
  add constraint gpswox_settings_company_id_key unique (company_id);

-- إعداد افتراضي عندما لا تتوفر company_id
insert into public.gpswox_settings (company_id, api_url, email, password)
values (null, 'sf-tracker.pro', 'medoraelis93@gmail.com', '654321')
on conflict do nothing;

-- تحديث updated_at تلقائياً
create or replace function public.set_gpswox_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_set_gpswox_settings_updated_at on public.gpswox_settings;
create trigger tr_set_gpswox_settings_updated_at
before update on public.gpswox_settings
for each row execute function public.set_gpswox_settings_updated_at();

-- RLS
alter table public.gpswox_settings enable row level security;

drop policy if exists "gpswox_settings_select_same_company" on public.gpswox_settings;
create policy "gpswox_settings_select_all"
on public.gpswox_settings
for select
using (true);

drop policy if exists "gpswox_settings_upsert_admin_owner" on public.gpswox_settings;
drop policy if exists "gpswox_settings_upsert_default_or_service" on public.gpswox_settings;
create policy "gpswox_settings_upsert_default"
on public.gpswox_settings
for insert
with check (company_id is null);

create policy "gpswox_settings_update_default"
on public.gpswox_settings
for update
using (company_id is null)
with check (company_id is null);
