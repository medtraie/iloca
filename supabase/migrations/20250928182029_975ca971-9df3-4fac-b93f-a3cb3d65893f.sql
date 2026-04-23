-- Create table for miscellaneous expenses (Divers)
CREATE TABLE public.miscellaneous_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  expense_type TEXT NOT NULL,
  custom_expense_type TEXT NULL, -- For when "Autre" is selected
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Espèces', 'Virement', 'Chèque')),
  expense_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.miscellaneous_expenses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR DELETE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR ALL 
USING (get_user_role() = 'admin'::user_role);

CREATE POLICY "Comptables can view miscellaneous expenses" 
ON public.miscellaneous_expenses 
FOR SELECT 
USING (get_user_role() = ANY (ARRAY['admin'::user_role, 'comptable'::user_role]));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_miscellaneous_expenses_updated_at
BEFORE UPDATE ON public.miscellaneous_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to set user_id automatically
CREATE TRIGGER set_miscellaneous_expenses_user_id
BEFORE INSERT ON public.miscellaneous_expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_client_user_id();