import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { customersRepository } from '@/repositories/customersRepository';
import type { Tenant } from '@/types/appData';

export type { Tenant };

export const useTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await customersRepository.listTenants();
      setTenants(data);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de charger les locataires",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addTenant = async (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTenant = await customersRepository.createTenant(tenantData);
      setTenants(prev => [newTenant, ...prev]);
      toast({
        title: "Succès",
        description: "Locataire ajouté avec succès"
      });
      return newTenant;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le locataire",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateTenant = async (id: string, tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const updatedTenant = await customersRepository.updateTenant(id, tenantData);
      setTenants(prev => prev.map((tenant) => tenant.id === id ? updatedTenant : tenant));
      toast({
        title: "Succès",
        description: "Locataire mis à jour avec succès"
      });
      return updatedTenant;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le locataire",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      await customersRepository.deleteTenant(id);
      setTenants(prev => prev.filter((tenant) => tenant.id !== id));
      toast({
        title: "Succès",
        description: "Locataire supprimé avec succès"
      });
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le locataire",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  return {
    tenants,
    loading,
    addTenant,
    updateTenant,
    deleteTenant,
    refetch: fetchTenants
  };
};
