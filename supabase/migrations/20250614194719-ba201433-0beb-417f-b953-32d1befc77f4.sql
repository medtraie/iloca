
-- Extend the vehicles table with all required fields
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS marque TEXT,
ADD COLUMN IF NOT EXISTS modele TEXT,
ADD COLUMN IF NOT EXISTS immatriculation TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS annee INTEGER,
ADD COLUMN IF NOT EXISTS type_carburant TEXT DEFAULT 'Essence',
ADD COLUMN IF NOT EXISTS boite_vitesse TEXT DEFAULT 'Manuelle',
ADD COLUMN IF NOT EXISTS kilometrage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS couleur TEXT DEFAULT 'Blanc',
ADD COLUMN IF NOT EXISTS prix_par_jour DECIMAL(10,2) DEFAULT 200.00,
ADD COLUMN IF NOT EXISTS etat_vehicule TEXT DEFAULT 'disponible',
ADD COLUMN IF NOT EXISTS km_depart INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS documents TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Update existing vehicles with new field structure
UPDATE public.vehicles 
SET 
  marque = brand,
  modele = model,
  immatriculation = registration,
  annee = year
WHERE marque IS NULL;

-- Add constraints for data validation
ALTER TABLE public.vehicles 
ADD CONSTRAINT chk_etat_vehicule CHECK (etat_vehicule IN ('disponible', 'loue', 'maintenance', 'horsService')),
ADD CONSTRAINT chk_type_carburant CHECK (type_carburant IN ('Essence', 'Diesel', 'Électrique', 'Hybride')),
ADD CONSTRAINT chk_boite_vitesse CHECK (boite_vitesse IN ('Manuelle', 'Automatique')),
ADD CONSTRAINT chk_prix_positif CHECK (prix_par_jour > 0),
ADD CONSTRAINT chk_annee_valide CHECK (annee >= 1900 AND annee <= 2030),
ADD CONSTRAINT chk_kilometrage_positif CHECK (kilometrage >= 0),
ADD CONSTRAINT chk_km_depart_positif CHECK (km_depart >= 0);

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_vehicles_marque ON public.vehicles(marque);
CREATE INDEX IF NOT EXISTS idx_vehicles_immatriculation ON public.vehicles(immatriculation);
CREATE INDEX IF NOT EXISTS idx_vehicles_etat ON public.vehicles(etat_vehicule);

-- Create storage bucket for vehicle documents and photos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('vehicle-documents', 'vehicle-documents', true),
  ('vehicle-photos', 'vehicle-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for vehicle files
CREATE POLICY "Allow public read access to vehicle documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Allow public insert to vehicle documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehicle-documents');

CREATE POLICY "Allow public read access to vehicle photos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Allow public insert to vehicle photos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'vehicle-photos');
