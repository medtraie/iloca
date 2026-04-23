-- Create expenses table
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('vignette', 'assurance', 'visite_technique', 'gps', 'credit', 'reparation')),
    total_cost DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    period_months INTEGER NOT NULL DEFAULT 1,
    monthly_cost DECIMAL(10,2) NOT NULL,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create monthly_expenses table
CREATE TABLE public.monthly_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL,
    month_year TEXT NOT NULL,
    allocated_amount DECIMAL(10,2) NOT NULL,
    expense_type TEXT NOT NULL CHECK (expense_type IN ('vignette', 'assurance', 'visite_technique', 'gps', 'credit', 'reparation')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
CREATE POLICY "Everyone can view expenses" 
ON public.expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can create expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update expenses" 
ON public.expenses 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete expenses" 
ON public.expenses 
FOR DELETE 
USING (true);

-- Create RLS policies for monthly_expenses
CREATE POLICY "Everyone can view monthly expenses" 
ON public.monthly_expenses 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can create monthly expenses" 
ON public.monthly_expenses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update monthly expenses" 
ON public.monthly_expenses 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete monthly expenses" 
ON public.monthly_expenses 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);
CREATE INDEX idx_expenses_type ON public.expenses(type);
CREATE INDEX idx_expenses_start_date ON public.expenses(start_date);
CREATE INDEX idx_monthly_expenses_vehicle_id ON public.monthly_expenses(vehicle_id);
CREATE INDEX idx_monthly_expenses_month_year ON public.monthly_expenses(month_year);