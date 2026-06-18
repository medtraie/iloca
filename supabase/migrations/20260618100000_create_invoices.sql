-- Create invoices table used by Factures section

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_number text not null,
  customer_name text not null,
  customer_ice text,
  invoice_date text not null,
  description text,
  subtotal_ht numeric not null default 0,
  tax_amount numeric not null default 0,
  tax_rate numeric not null default 0,
  total_ttc numeric not null default 0,
  payment_method text,
  status text not null default 'pending',
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_invoices_updated_at') then
    create trigger update_invoices_updated_at before update on public.invoices for each row execute function public.update_updated_at_column();
  end if;
end $$;

alter table public.invoices enable row level security;

drop policy if exists "Users can view their own invoices" on public.invoices;
drop policy if exists "Users can insert their own invoices" on public.invoices;
drop policy if exists "Users can update their own invoices" on public.invoices;
drop policy if exists "Users can delete their own invoices" on public.invoices;

create policy "Users can view their own invoices" on public.invoices for select using (auth.uid() = user_id);
create policy "Users can insert their own invoices" on public.invoices for insert with check (auth.uid() = user_id);
create policy "Users can update their own invoices" on public.invoices for update using (auth.uid() = user_id);
create policy "Users can delete their own invoices" on public.invoices for delete using (auth.uid() = user_id);
