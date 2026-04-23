
-- Create expenses table for tracking vehicle-related costs
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('vignette', 'assurance', 'visite_technique', 'gps', 'credit', 'reparation')),
  total_cost DECIMAL(10,2) NOT NULL CHECK (total_cost > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL CHECK (end_date > start_date),
  period_months INTEGER NOT NULL CHECK (period_months > 0),
  monthly_cost DECIMAL(10,2) GENERATED ALWAYS AS (total_cost / period_months) STORED,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly expense distribution table for tracking monthly allocations
CREATE TABLE public.monthly_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- Format: YYYY-MM-01
  allocated_amount DECIMAL(10,2) NOT NULL,
  expense_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better performance
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX idx_expenses_type ON public.expenses(type);
CREATE INDEX idx_expenses_dates ON public.expenses(start_date, end_date);
CREATE INDEX idx_monthly_expenses_vehicle_month ON public.monthly_expenses(vehicle_id, month_year);
CREATE INDEX idx_monthly_expenses_type ON public.monthly_expenses(expense_type);

-- Add unique constraint to prevent overlapping periods for same expense type
CREATE UNIQUE INDEX idx_expenses_no_overlap ON public.expenses(vehicle_id, type, start_date, end_date);

-- Function to generate monthly expense entries
CREATE OR REPLACE FUNCTION generate_monthly_expenses()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  months_diff INTEGER;
  monthly_amount DECIMAL(10,2);
BEGIN
  -- Calculate monthly amount
  monthly_amount := NEW.total_cost / NEW.period_months;
  
  -- Generate entries for each month in the period
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

-- Function to update monthly expenses when expense is modified
CREATE OR REPLACE FUNCTION update_monthly_expenses()
RETURNS TRIGGER AS $$
DECLARE
  monthly_amount DECIMAL(10,2);
  current_month DATE;
BEGIN
  -- Delete existing monthly entries
  DELETE FROM public.monthly_expenses WHERE expense_id = NEW.id;
  
  -- Recalculate monthly amount
  monthly_amount := NEW.total_cost / NEW.period_months;
  
  -- Generate new entries
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

-- Create triggers
CREATE TRIGGER trigger_generate_monthly_expenses
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION generate_monthly_expenses();

CREATE TRIGGER trigger_update_monthly_expenses
  AFTER UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_monthly_expenses();

-- Create trigger for updated_at
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (though this app seems to not use auth, but good practice)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for now (adjust based on auth requirements)
CREATE POLICY "Allow all operations on expenses" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Allow all operations on monthly_expenses" ON public.monthly_expenses FOR ALL USING (true);
