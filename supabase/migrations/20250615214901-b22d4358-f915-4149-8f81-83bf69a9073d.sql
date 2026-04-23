
-- Add a column to store the type of repair
ALTER TABLE public.vehicle_logs ADD COLUMN repair_type TEXT;
COMMENT ON COLUMN public.vehicle_logs.repair_type IS 'Type of repair, e.g., Mécanique, Électrique';

-- Create a new storage bucket for repair documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-documents', 'repair-documents', true);
