-- Create the vehicles bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do nothing;

-- Enable RLS
alter table storage.objects enable row level security;

-- Drop existing policies if they exist to avoid errors
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Auth Insert" on storage.objects;
drop policy if exists "Auth Update" on storage.objects;
drop policy if exists "Auth Delete" on storage.objects;

-- Allow public read access to vehicles bucket
create policy "Public Access" on storage.objects for select
using (bucket_id = 'vehicles');

-- Allow authenticated users to upload to vehicles bucket
create policy "Auth Insert" on storage.objects for insert
with check (bucket_id = 'vehicles' and auth.role() = 'authenticated');

-- Allow authenticated users to update their own uploads
create policy "Auth Update" on storage.objects for update
using (bucket_id = 'vehicles' and auth.role() = 'authenticated');

-- Allow authenticated users to delete their own uploads
create policy "Auth Delete" on storage.objects for delete
using (bucket_id = 'vehicles' and auth.role() = 'authenticated');
