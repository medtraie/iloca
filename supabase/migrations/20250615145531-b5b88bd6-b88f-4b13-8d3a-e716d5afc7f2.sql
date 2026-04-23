
-- Drop the existing (possibly broken) function if exists
DROP FUNCTION IF EXISTS public.generate_contract_number();

-- Create a corrected version
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  next_number INTEGER;
  contract_num TEXT;
BEGIN
  -- الحصول على آخر رقم عقد بشكل صريح، مع توضيح اسم العمود
  SELECT COALESCE(MAX(CAST(SUBSTRING(public.contracts.contract_number FROM 2) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.contracts
  WHERE public.contracts.contract_number ~ '^C[0-9]+$';

  -- تكوين رقم العقد الجديد
  contract_num := 'C' || LPAD(next_number::TEXT, 3, '0');

  RETURN contract_num;
END;
$function$;
