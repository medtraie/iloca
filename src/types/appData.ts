export type AutoBackupFrequency = "disabled" | "daily" | "weekly" | "monthly";

export interface ClientProfile {
  id: string;
  last_name: string;
  first_name?: string;
  address_morocco?: string;
  phone?: string;
  address_foreign?: string;
  cin?: string;
  cin_delivered?: string;
  license_number?: string;
  license_delivered?: string;
  passport_number?: string;
  passport_delivered?: string;
  birth_date?: string;
  email?: string;
  nationality?: string;
  customer_type?: "Locataire Principal" | "Chauffeur secondaire";
  cin_image_url?: string;
  license_image_url?: string;
  passport_image_url?: string;
  avatar_url?: string;
  documents_urls?: string[];
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  last_name: string;
  first_name?: string;
  address_morocco?: string;
  phone?: string;
  address_foreign?: string;
  cin?: string;
  cin_delivered?: string;
  license_number?: string;
  license_delivered?: string;
  passport_number?: string;
  passport_delivered?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  cin: string;
  dateCin: string;
  permis: string;
  datePermis: string;
  dateNaissance: string;
  passeport?: string;
  nationalite: string;
  type: "Locataire Principal" | "Chauffeur secondaire";
  createdAt: string;
  updatedAt: string;
  cinImageUrl?: string;
  permisImageUrl?: string;
  passeportImageUrl?: string;
  tenantImageUrl?: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model?: string;
  registration?: string;
  year?: number;
  marque?: string;
  modele?: string;
  immatriculation?: string;
  annee?: number;
  type_carburant?: string;
  boite_vitesse?: string;
  kilometrage?: number;
  couleur?: string;
  prix_par_jour?: number;
  etat_vehicule?: string;
  km_depart?: number;
  documents?: string[];
  photos?: string[];
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerICE: string;
  invoiceDate: string;
  description: string;
  totalHT: number;
  tva: number;
  totalTTC: number;
  paymentMethod: string;
  status: "paid" | "pending" | "overdue";
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  companyName: string;
  companyLogo: string | null;
  companyAddress: string;
  companyPhone: string;
  companyFax: string;
  companyGsm: string;
  companyEmail: string;
  brandColor: string;
}

export interface BackupPreferences {
  autoBackupFrequency: AutoBackupFrequency;
  lastBackupDate: string | null;
  lastAutoBackupCheck: string | null;
}

export interface GpsSettings {
  api_url: string;
  email: string;
  password: string;
}

export interface PhaseOneBackupPayload {
  version: 1;
  exportedAt: string;
  supabasePhase1: {
    clients: ClientProfile[];
    vehicles: Vehicle[];
    invoices: Invoice[];
    companySettings: CompanySettings;
    backupPreferences: BackupPreferences;
    gpsSettings: GpsSettings | null;
  };
  legacyLocal?: Record<string, unknown>;
}
