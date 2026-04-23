
-- إنشاء جدول العملاء
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  last_name TEXT NOT NULL,
  first_name TEXT,
  address_morocco TEXT,
  phone TEXT,
  address_foreign TEXT,
  cin TEXT,
  cin_delivered TEXT,
  license_number TEXT,
  license_delivered TEXT,
  passport_number TEXT,
  passport_delivered TEXT,
  birth_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول المركبات
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT,
  registration TEXT,
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للعملاء (السماح بالقراءة والكتابة للجميع مؤقتاً)
CREATE POLICY "Allow all access to customers" ON public.customers FOR ALL USING (true);

-- سياسات الأمان للمركبات
CREATE POLICY "Allow all access to vehicles" ON public.vehicles FOR ALL USING (true);

-- فهارس لتحسين الأداء
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_cin ON public.customers(cin);
CREATE INDEX idx_vehicles_registration ON public.vehicles(registration);

-- دالة لتحديث تاريخ التعديل
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إدراج بعض البيانات التجريبية للعملاء
INSERT INTO public.customers (last_name, first_name, address_morocco, phone, cin, license_number) VALUES
('أحمد', 'محمد', 'الدار البيضاء، المغرب', '0661234567', 'A123456', 'L789012'),
('فاطمة', 'علي', 'الرباط، المغرب', '0662345678', 'B234567', 'L890123'),
('يوسف', 'حسن', 'مراكش، المغرب', '0663456789', 'C345678', 'L901234');

-- إدراج بعض البيانات التجريبية للمركبات
INSERT INTO public.vehicles (brand, model, registration, year) VALUES
('تويوتا', 'كورولا', '12345-أ-67', 2022),
('رينو', 'كليو', '23456-ب-78', 2021),
('بيجو', '208', '34567-ج-89', 2023),
('فولكس فاغن', 'غولف', '45678-د-90', 2022);
