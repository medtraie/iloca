
-- 1. إضافة عمود signature_type مع نوع التوقيع (delivery أو return)
ALTER TABLE public.digital_signatures
ADD COLUMN signature_type TEXT NOT NULL DEFAULT 'delivery'
  CHECK (signature_type IN ('delivery', 'return'));

-- 2. تحديث السياسات بحيث تبقى كما هي ولا تتأثر.

-- 3. مستقبلاً: عند إضافة توقيع، يتم إرسال نوع التوقيع المطلوب (delivery أو return).
