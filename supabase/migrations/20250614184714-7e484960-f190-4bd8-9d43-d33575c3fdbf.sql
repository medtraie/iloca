
-- التحقق من وجود الجداول وإنشاءها إذا لم تكن موجودة

-- إنشاء جدول المركبات إذا لم يكن موجود
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT,
  year INTEGER,
  registration TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول المصروفات إذا لم يكن موجود
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vignette', 'assurance', 'visite_technique', 'gps', 'credit', 'reparation')),
  total_cost NUMERIC(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_months INTEGER NOT NULL,
  monthly_cost NUMERIC(10,2),
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء جدول المصروفات الشهرية إذا لم يكن موجود
CREATE TABLE IF NOT EXISTS public.monthly_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  month_year DATE NOT NULL,
  allocated_amount NUMERIC(10,2) NOT NULL,
  expense_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء الدالة لحساب التكلفة الشهرية تلقائياً
CREATE OR REPLACE FUNCTION public.calculate_monthly_cost()
RETURNS TRIGGER AS $$
BEGIN
  NEW.monthly_cost := NEW.total_cost / NEW.period_months;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الدالة لتوليد المصروفات الشهرية
CREATE OR REPLACE FUNCTION public.generate_monthly_expenses()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  monthly_amount DECIMAL(10,2);
BEGIN
  -- حذف المدخلات الشهرية الموجودة
  DELETE FROM public.monthly_expenses WHERE expense_id = NEW.id;
  
  -- حساب المبلغ الشهري
  monthly_amount := NEW.total_cost / NEW.period_months;
  
  -- توليد مدخلات جديدة
  current_month := DATE_TRUNC('month', NEW.start_date);
  
  WHILE current_month <= DATE_TRUNC('month', NEW.end_date) LOOP
    INSERT INTO public.monthly_expenses (
      expense_id,
      vehicle_id,
      month_year,
      allocated_amount,
      expense_type
    ) VALUES (
      NEW.id,
      NEW.vehicle_id,
      current_month,
      monthly_amount,
      NEW.type
    );
    
    current_month := current_month + INTERVAL '1 month';
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء التريجرز
DROP TRIGGER IF EXISTS calculate_monthly_cost_trigger ON public.expenses;
CREATE TRIGGER calculate_monthly_cost_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_monthly_cost();

DROP TRIGGER IF EXISTS generate_monthly_expenses_trigger ON public.expenses;
CREATE TRIGGER generate_monthly_expenses_trigger
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_monthly_expenses();

-- إنشاء التريجر لتحديث updated_at
DROP TRIGGER IF EXISTS update_expenses_updated_at ON public.expenses;
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- إدراج بعض البيانات التجريبية للمركبات إذا لم تكن موجودة
INSERT INTO public.vehicles (brand, model, year, registration)
SELECT 'Toyota', 'Camry', 2023, '123ABC45'
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles WHERE brand = 'Toyota' AND model = 'Camry');

INSERT INTO public.vehicles (brand, model, year, registration)
SELECT 'Nissan', 'Altima', 2022, '456DEF78'
WHERE NOT EXISTS (SELECT 1 FROM public.vehicles WHERE brand = 'Nissan' AND model = 'Altima');
