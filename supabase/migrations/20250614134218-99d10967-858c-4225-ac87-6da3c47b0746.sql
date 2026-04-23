
-- إنشاء جدول العقود
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_national_id TEXT,
  vehicle TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_rate DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول التوقيعات الرقمية
CREATE TABLE public.digital_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- base64 encoded signature image
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signature_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول رموز التوقيع
CREATE TABLE public.signature_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_tokens ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للعقود (السماح بالقراءة والكتابة للجميع مؤقتاً)
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true);

-- سياسات الأمان للتوقيعات
CREATE POLICY "Allow all access to signatures" ON public.digital_signatures FOR ALL USING (true);

-- سياسات الأمان لرموز التوقيع
CREATE POLICY "Allow all access to signature tokens" ON public.signature_tokens FOR ALL USING (true);

-- فهارس لتحسين الأداء
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_contract_number ON public.contracts(contract_number);
CREATE INDEX idx_signatures_contract_id ON public.digital_signatures(contract_id);
CREATE INDEX idx_signature_tokens_token ON public.signature_tokens(token);
CREATE INDEX idx_signature_tokens_contract_id ON public.signature_tokens(contract_id);

-- دالة لتوليد رقم العقد التلقائي
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  contract_number TEXT;
BEGIN
  -- الحصول على آخر رقم عقد
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_number FROM 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.contracts
  WHERE contract_number ~ '^C[0-9]+$';
  
  -- تكوين رقم العقد الجديد
  contract_number := 'C' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN contract_number;
END;
$$ LANGUAGE plpgsql;

-- دالة لتوليد رمز التوقيع
CREATE OR REPLACE FUNCTION generate_signature_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث تاريخ التعديل
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة المحفز لتحديث تاريخ التعديل
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
