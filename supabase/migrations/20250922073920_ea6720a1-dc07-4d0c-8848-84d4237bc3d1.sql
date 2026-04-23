-- Fix vehicle_id column type to match localStorage IDs
ALTER TABLE public.expenses ALTER COLUMN vehicle_id TYPE text;
ALTER TABLE public.monthly_expenses ALTER COLUMN vehicle_id TYPE text;