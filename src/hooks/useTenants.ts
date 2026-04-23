import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';

// Tenant interface - aligned with Customers page structure
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
  // New fields:
  cinImageUrl?: string;
  permisImageUrl?: string;
  passeportImageUrl?: string;
}

export const useTenants = () => {
  // Default tenants data - aligned with Customers page
  const defaultTenants: Tenant[] = [
    {
      id: "T001",
      nom: "Bennani",
      prenom: "Ahmed",
      adresse: "Rue Hassan II, Casablanca",
      telephone: "+212 612-345678",
      cin: "AB123456",
      dateCin: "2021-08-12",
      permis: "P1234567",
      datePermis: "2020-03-10",
      dateNaissance: "1992-06-15",
      nationalite: "Marocaine",
      type: "Locataire Principal",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-10"
    },
    {
      id: "T002",
      nom: "El Alami", 
      prenom: "Fatima",
      adresse: "Avenue Mohammed V, Rabat",
      telephone: "+212 661-789012",
      cin: "CD789012",
      dateCin: "2020-05-15",
      permis: "P2345678",
      datePermis: "2019-12-20",
      dateNaissance: "1988-03-22",
      nationalite: "Marocaine",
      type: "Locataire Principal",
      createdAt: "2024-01-15",
      updatedAt: "2024-01-15"
    },
    {
      id: "T003",
      nom: "Dubois",
      prenom: "Pierre", 
      adresse: "Résidence Marina, Agadir",
      telephone: "+212 524-567890",
      cin: "FR345678",
      dateCin: "2022-01-10",
      permis: "P3456789",
      datePermis: "2021-06-15",
      dateNaissance: "1985-11-08",
      passeport: "P00123456",
      nationalite: "Française",
      type: "Locataire Principal",
      createdAt: "2024-01-20",
      updatedAt: "2024-01-20"
    }
  ];

  const [tenants, setTenants] = useLocalStorage<Tenant[]>("tenants", defaultTenants);
  const { toast } = useToast();

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTenant: Tenant = {
      ...tenantData,
      id: `T${String(tenants.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setTenants(prev => [newTenant, ...prev]);
    toast({
      title: "Succès",
      description: "Locataire ajouté avec succès"
    });
    return newTenant;
  };

  return {
    tenants,
    loading: false, // No async loading needed for localStorage
    addTenant,
    refetch: () => {} // No need to refetch from localStorage
  };
};