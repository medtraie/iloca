
-- إصلاح قيود نوع السجل في جدول vehicle_logs
ALTER TABLE public.vehicle_logs DROP CONSTRAINT IF EXISTS vehicle_logs_log_type_check;
ALTER TABLE public.vehicle_logs ADD CONSTRAINT vehicle_logs_log_type_check 
CHECK (log_type IN ('maintenance', 'violation', 'reparation'));

-- إنشاء bucket للملفات إذا لم يكن موجوداً
INSERT INTO storage.buckets (id, name, public) 
VALUES ('repair-documents', 'repair-documents', true)
ON CONFLICT (id) DO NOTHING;

-- حذف السياسات الموجودة أولاً إذا كانت موجودة
DROP POLICY IF EXISTS "Allow public uploads for repair documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to repair documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates for repair documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes for repair documents" ON storage.objects;

-- إضافة سياسات جديدة للملفات
CREATE POLICY "Allow public uploads for repair documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'repair-documents');

CREATE POLICY "Allow public access to repair documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'repair-documents');

CREATE POLICY "Allow public updates for repair documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'repair-documents');

CREATE POLICY "Allow public deletes for repair documents" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'repair-documents');
