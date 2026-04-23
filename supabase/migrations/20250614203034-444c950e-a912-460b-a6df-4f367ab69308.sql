
-- إنشاء جدول vehicle_documents لتخزين وثائق المركبات
create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  file_url text not null,
  file_type text,
  name text,
  document_type text not null,
  expiry_date date,
  contract_id uuid references public.contracts(id) on delete set null,
  uploaded_at timestamp with time zone not null default now()
);

-- تفعيل الأمن على مستوى الصفوف لأمان البيانات
alter table public.vehicle_documents enable row level security;

-- سياسة مؤقتة تسمح بالوصول الكامل لجميع المستخدمين (يمكن تعديلها لاحقاً)
create policy "Allow full access to all vehicle documents" on public.vehicle_documents
  for all
  using (true)
  with check (true);
