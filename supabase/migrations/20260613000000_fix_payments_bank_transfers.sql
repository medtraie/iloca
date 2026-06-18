-- Migration to align payments and bank_transfers with their TypeScript interfaces

-- Update Payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS check_reference text,
ADD COLUMN IF NOT EXISTS check_name text,
ADD COLUMN IF NOT EXISTS check_direction text,
ADD COLUMN IF NOT EXISTS check_return_reason text,
ADD COLUMN IF NOT EXISTS check_return_date text,
ADD COLUMN IF NOT EXISTS partially_collected_amount numeric default 0,
ADD COLUMN IF NOT EXISTS relance_level text default 'aucune',
ADD COLUMN IF NOT EXISTS relance_history jsonb default '[]'::jsonb,
ADD COLUMN IF NOT EXISTS audit_trail jsonb default '[]'::jsonb,
ADD COLUMN IF NOT EXISTS repair_id uuid REFERENCES public.repairs(id) ON DELETE SET NULL;

-- Data migration: move check_number to check_reference if check_reference is null
UPDATE public.payments 
SET check_reference = check_number 
WHERE check_reference IS NULL AND check_number IS NOT NULL;

-- Update Bank Transfers table
ALTER TABLE public.bank_transfers 
ADD COLUMN IF NOT EXISTS check_date text,
ADD COLUMN IF NOT EXISTS check_deposit_date text;
