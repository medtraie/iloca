
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

class LocalStorageService {
  private getKey(type: string): string {
    return `rental_app_${type}`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  // Generic CRUD operations
  getAll<T>(type: string): T[] {
    try {
      const data = localStorage.getItem(this.getKey(type));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error getting ${type}:`, error);
      return [];
    }
  }

  create<T extends { id?: string; created_at?: string; updated_at?: string }>(
    type: string,
    item: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): T {
    const items = this.getAll<T>(type);
    const now = this.getTimestamp();
    const newItem = {
      ...item,
      id: this.generateId(),
      created_at: now,
      updated_at: now,
    } as T;

    items.push(newItem);
    localStorage.setItem(this.getKey(type), JSON.stringify(items));
    return newItem;
  }

  // NEW: Récupérer un élément par id
  get<T>(type: string, id: string): T | null {
    const items = this.getAll<T>(type);
    const found = (items as any[]).find((item: any) => item.id === id);
    return (found ?? null) as T | null;
  }

  // NEW: Alias de create pour correspondre aux usages existants
  add<T extends { id?: string; created_at?: string; updated_at?: string }>(
    type: string,
    item: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): T {
    return this.create<T>(type, item);
  }

  // UPDATED: Supporte (type, id, updates) ET (type, itemComplet)
  update<T extends { id: string; updated_at?: string }>(
    type: string,
    idOrItem: string | T,
    updates?: Partial<T>
  ): T | null {
    const items = this.getAll<T>(type);
    const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
    const index = (items as any[]).findIndex((item: any) => item.id === id);
    if (index === -1) return null;

    const next =
      typeof idOrItem === 'string'
        ? { ...(items[index] as any), ...(updates || {}), updated_at: this.getTimestamp() }
        : { ...(items[index] as any), ...(idOrItem as any), updated_at: this.getTimestamp() };

    (items as any[])[index] = next as any;
    localStorage.setItem(this.getKey(type), JSON.stringify(items));
    return next as T;
  }

  delete(type: string, id: string): boolean {
    const items = this.getAll(type);
    const filteredItems = items.filter((item: any) => item.id !== id);
    
    if (filteredItems.length === items.length) return false;

    localStorage.setItem(this.getKey(type), JSON.stringify(filteredItems));
    return true;
  }

  deleteWhere(type: string, field: string, value: any): boolean {
    const items = this.getAll(type);
    const filteredItems = items.filter((item: any) => item[field] !== value);
    
    if (filteredItems.length === items.length) return false;

    localStorage.setItem(this.getKey(type), JSON.stringify(filteredItems));
    return true;
  }

  // Add an item to a generic array in localStorage
  addItemToArray<T>(key: string, item: T): T[] {
    const items = this.getAll<T>(key);
    items.push(item);
    localStorage.setItem(this.getKey(key), JSON.stringify(items));
    return items;
  }
 

  // Contract number generation
  generateContractNumber(): string {
    const contracts = this.getAll<Contract>('contracts');
    const numbers = contracts
      .map(c => c.contract_number)
      .filter(num => num.match(/^C\d+$/))
      .map(num => parseInt(num.substring(1)))
      .filter(num => !isNaN(num));
    
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `C${nextNumber.toString().padStart(3, '0')}`;
  }

  // Clear all data
  clearAllData(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('rental_app_'));
    keys.forEach(key => localStorage.removeItem(key));
  }

  // Force update vehicles with new French data and images
  updateVehiclesWithFrenchData(): void {
    // Clear only vehicles data, not all data to preserve contracts
    const vehicles = this.getAll('vehicles');
    if (vehicles.length === 0) {
      this.initializeSampleData();
    }
  }

  // Initialize with sample data
  initializeSampleData(): void {
    // Add sample customers
    if (this.getAll<Customer>('customers').length === 0) {
      const sampleCustomers: Omit<Customer, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          last_name: 'أحمد',
          first_name: 'محمد',
          address_morocco: 'الدار البيضاء، المغرب',
          phone: '0661234567',
          cin: 'A123456',
          license_number: 'L789012',
          birth_date: '1990-01-15',
        },
        {
          last_name: 'فاطمة',
          first_name: 'علي',
          address_morocco: 'الرباط، المغرب',
          phone: '0662345678',
          cin: 'B234567',
          license_number: 'L890123',
          birth_date: '1985-03-22',
        },
        {
          last_name: 'يوسف',
          first_name: 'حسن',
          address_morocco: 'مراكش، المغرب',
          phone: '0663456789',
          cin: 'C345678',
          license_number: 'L901234',
          birth_date: '1992-07-10',
        },
        {
          last_name: 'خديجة',
          first_name: 'عبدالله',
          address_morocco: 'فاس، المغرب',
          phone: '0664567890',
          cin: 'D456789',
          license_number: 'L012345',
          birth_date: '1988-11-05',
        },
      ];

      sampleCustomers.forEach(customer => this.create('customers', customer));
    }

    // Add sample vehicles
    if (this.getAll<Vehicle>('vehicles').length === 0) {
      const sampleVehicles: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          brand: 'Peugeot',
          model: '208',
          marque: 'Peugeot',
          modele: '208',
          registration: '1234-AB-67',
          immatriculation: '1234-AB-67',
          year: 2023,
          annee: 2023,
          type_carburant: 'essence',
          boite_vitesse: 'manuelle',
          kilometrage: 15000,
          couleur: 'Blanc',
          prix_par_jour: 280,
          etat_vehicule: 'disponible',
          km_depart: 15000,
          documents: [],
          photos: [peugeot208],
        },
        {
          brand: 'Renault',
          model: 'Clio',
          marque: 'Renault',
          modele: 'Clio',
          registration: '2345-CD-78',
          immatriculation: '2345-CD-78',
          year: 2022,
          annee: 2022,
          type_carburant: 'essence',
          boite_vitesse: 'automatique',
          kilometrage: 22000,
          couleur: 'Bleu',
          prix_par_jour: 250,
          etat_vehicule: 'disponible',
          km_depart: 22000,
          documents: [],
          photos: [renaultClio],
        },
        {
          brand: 'Citroën',
          model: 'C3',
          marque: 'Citroën',
          modele: 'C3',
          registration: '3456-EF-89',
          immatriculation: '3456-EF-89',
          year: 2024,
          annee: 2024,
          type_carburant: 'essence',
          boite_vitesse: 'manuelle',
          kilometrage: 8000,
          couleur: 'Rouge',
          prix_par_jour: 300,
          etat_vehicule: 'loue',
          km_depart: 8000,
          documents: [],
          photos: [citroenC3],
        },
        {
          brand: 'Volkswagen',
          model: 'Polo',
          marque: 'Volkswagen',
          modele: 'Polo',
          registration: '4567-GH-90',
          immatriculation: '4567-GH-90',
          year: 2023,
          annee: 2023,
          type_carburant: 'diesel',
          boite_vitesse: 'automatique',
          kilometrage: 18000,
          couleur: 'Gris',
          prix_par_jour: 320,
          etat_vehicule: 'disponible',
          km_depart: 18000,
          documents: [],
          photos: [volkswagenPolo],
        },
        {
          brand: 'Ford',
          model: 'Fiesta',
          marque: 'Ford',
          modele: 'Fiesta',
          registration: '5678-IJ-01',
          immatriculation: '5678-IJ-01',
          year: 2021,
          annee: 2021,
          type_carburant: 'essence',
          boite_vitesse: 'manuelle',
          kilometrage: 35000,
          couleur: 'Blanc',
          prix_par_jour: 230,
          etat_vehicule: 'maintenance',
          km_depart: 35000,
          documents: [],
          photos: [],
        },
        {
          brand: 'Opel',
          model: 'Corsa',
          marque: 'Opel',
          modele: 'Corsa',
          registration: '6789-KL-12',
          immatriculation: '6789-KL-12',
          year: 2022,
          annee: 2022,
          type_carburant: 'essence',
          boite_vitesse: 'automatique',
          kilometrage: 28000,
          couleur: 'Gris',
          prix_par_jour: 260,
          etat_vehicule: 'disponible',
          km_depart: 28000,
          documents: [],
          photos: [],
        },
      ];

      sampleVehicles.forEach(vehicle => this.create('vehicles', vehicle));
    }

    // Note: Sample contracts creation removed to prevent recreation after deletion
    // Users can create their own contracts using the interface
  }

  // Export all data for backup
  exportAllData(): string {
    const data = {
      customers: this.getAll('customers'),
      vehicles: this.getAll('vehicles'),
      contracts: this.getAll('contracts'),
      repairs: this.getAll('repairs'),
      expenses: this.getAll('expenses'),
      exportDate: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  // Import data from backup
  importAllData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.customers) localStorage.setItem(this.getKey('customers'), JSON.stringify(data.customers));
      if (data.vehicles) localStorage.setItem(this.getKey('vehicles'), JSON.stringify(data.vehicles));
      if (data.contracts) localStorage.setItem(this.getKey('contracts'), JSON.stringify(data.contracts));
      if (data.repairs) localStorage.setItem(this.getKey('repairs'), JSON.stringify(data.repairs));
      if (data.expenses) localStorage.setItem(this.getKey('expenses'), JSON.stringify(data.expenses));
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();

// Initialize sample data on first load
if (typeof window !== 'undefined') {
  // Only initialize if no data exists
  localStorageService.initializeSampleData();
}
