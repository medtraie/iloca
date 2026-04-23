
-- إنشاء bucket لتخزين صور السيارات إذا لم يكن موجودًا بالفعل
insert into storage.buckets 
  (id, name, public) 
values 
  ('vehicle-photos', 'vehicle-photos', true)
on conflict (id) do nothing;

-- سياسة للسماح برفع وقراءة الصور للجميع (public)
create policy "Public upload images" 
  on storage.objects for insert 
  to public 
  with check (bucket_id = 'vehicle-photos');

create policy "Public read images" 
  on storage.objects for select 
  to public 
  using (bucket_id = 'vehicle-photos');
