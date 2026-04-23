
-- إضافة عمود اختياري "period_months" و"monthly_cost" في جدول repairs (مع إمكانية تحديد على كم شهر تُوزع تكلفة الإصلاح)
ALTER TABLE public.vehicle_logs
  ADD COLUMN IF NOT EXISTS period_months INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_cost DECIMAL(10,2);

-- توسيع CHECK لقيم log_type لتشمل فقط 'reparation' في هذه الحالة (أو يمكن تركها مفتوحة لأنك تستعمل vehicle_logs لأكثر من نوع)
-- توليد جدول جديد أو الاستفادة من existing 'monthly_expenses'، مع توسيع قيم expense_type لتسمح بقيمة جديدة 'reparation' مرتبطة بالإصلاحات

-- إنشاء دالة تقوم تلقائيًا بتوزيع تكلفة الإصلاح على الأشهر عند إضافة log_type='reparation' ويوجد period_months > 1
CREATE OR REPLACE FUNCTION public.generate_monthly_repair_expenses()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  monthly_amount DECIMAL(10,2);
  months_processed INTEGER := 0;
  max_months INTEGER;
BEGIN
  -- فقط لو الإصلاح مُجزأ على عدة أشهر (ولتفادي التكرار الغير مقصود)
  IF NEW.log_type = 'reparation' AND NEW.period_months IS NOT NULL AND NEW.period_months > 0 THEN
    -- حساب تكلفة الشهر الواحد
    monthly_amount := COALESCE(NEW.cost, 0) / NEW.period_months;
    -- البداية: الشهر بحسب log_date المُسجل
    current_month := DATE_TRUNC('month', NEW.log_date);
    max_months := NEW.period_months;
    -- عمل LOOP بعدد الشهور
    WHILE months_processed < max_months LOOP
      INSERT INTO public.monthly_expenses (
        expense_id,
        vehicle_id,
        month_year,
        allocated_amount,
        expense_type
      ) VALUES (
        NULL, -- ليس لدينا expense_id (nullable)، أو يمكن وضع log id حسب السياق
        NEW.vehicle_id,
        current_month,
        monthly_amount,
        'reparation'
      );
      -- لننتقل للشهر الذي يليه
      current_month := current_month + INTERVAL '1 month';
      months_processed := months_processed + 1;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تفعيل التريجر على insert لجدول vehicle_logs
DROP TRIGGER IF EXISTS trigger_generate_monthly_repair_expenses ON public.vehicle_logs;
CREATE TRIGGER trigger_generate_monthly_repair_expenses
  AFTER INSERT ON public.vehicle_logs
  FOR EACH ROW EXECUTE FUNCTION public.generate_monthly_repair_expenses();

-- صلاحيات RLS: (مثل ماهو مفعّل على monthly_expenses: سياسة مفتوحة أو حسب الحاجة)
-- ملاحظة: expense_id في monthly_expenses nullable لإصلاحات لاترتبط مباشرة بجدول expenses الأساسي.

