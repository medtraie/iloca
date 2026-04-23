
-- سجل عمليات الصيانة أو المخالفات المتعلقة بكل مركبة
CREATE TABLE IF NOT EXISTS public.vehicle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('maintenance', 'violation', 'reparation')),
  description TEXT,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  cost NUMERIC(10,2),
  repair_type TEXT CHECK (repair_type IN ('Mécanique', 'Électrique')),
  document_urls TEXT[], -- روابط المستندات أو الفواتير إن وجدت
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS من أجل الأمان مستقبلاً (يمكنك تعديل السياسات لاحقاً حسب الحاجة)
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;

-- سياسة عامة مؤقتًا (للإدارة فقط أو التعديل لاحقًا)
CREATE POLICY "Allow full access to all vehicle logs" ON public.vehicle_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);
