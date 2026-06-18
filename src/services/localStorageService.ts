
// Local storage service to replace Supabase
import peugeot208 from '@/assets/vehicles/peugeot-208.jpg';
import renaultClio from '@/assets/vehicles/renault-clio.jpg';
import citroenC3 from '@/assets/vehicles/citroen-c3.jpg';
import volkswagenPolo from '@/assets/vehicles/volkswagen-polo.jpg';
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

export interface Contract {
  id: string;
  contract_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  customer_national_id?: string;
  vehicle: string;
  vehicleId?: string; // Reference to vehicle ID
  start_date: string;
  end_date: string;
  daily_rate?: number;
  total_amount: number;
  advance_payment?: number; // Montant de l'avance payée
  remaining_amount?: number; // Montant restant à payer
  status: 'ouvert' | 'ferme' | 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
  payment_method?: 'Espèces' | 'Chèque' | 'Virement'; // Mode de règlement
  notes?: string;
  // Extended data for preserving interactive elements
  delivery_fuel_level?: number;
  return_fuel_level?: number;
  delivery_damages?: any[];
  return_damages?: any[];
  contract_data?: any; // Full form data preservation
  // Extension fields for contract management
  prolongationAu?: string; // Date de fin de prolongation
  nombreDeJourProlonge?: number; // Nombre de jours de prolongation
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use Supabase repositories instead.
 * Keeping only minimal utilities for backward compatibility.
 */
export const localStorageService = {
  generateContractNumber: () => {
    return `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
};

export type { Customer, Vehicle, Contract } from '@/types/appData';
