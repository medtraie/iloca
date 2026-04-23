
import { useState, useEffect } from 'react';
import { localStorageService, Vehicle, Contract } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';

export type { Vehicle };

const findMatchingVehicle = (vehicleString: string, vehicles: Vehicle[]): Vehicle | null => {
  if (!vehicleString || !vehicles || vehicles.length === 0) {
    return null;
  }
  const contractVehicleStr = vehicleString.toLowerCase().trim();

  const flexibleMatch = vehicles.find(v => {
    const possibleMatchStrings = [
      `${(v.marque || v.brand || "")} ${(v.modele || v.model || "")} ${(v.annee || v.year || "")}`.toLowerCase().trim(),
      v.immatriculation?.toLowerCase().trim(),
      v.registration?.toLowerCase().trim()
    ].filter(Boolean);

    return possibleMatchStrings.some(ref => ref && contractVehicleStr.includes(ref));
  });

  if (flexibleMatch) return flexibleMatch;

  const strictMatch = vehicles.find(v => {
    const vStr = `${(v.marque || v.brand || "")} ${(v.modele || v.model || "")} ${(v.annee || v.year || "")}`.toLowerCase().trim();
    return vStr === contractVehicleStr;
  });

  return strictMatch || null;
};

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const allVehicles = localStorageService.getAll<Vehicle>('vehicles');
      const openContracts = localStorageService.getAll<Contract>('contracts').filter(
        contract => contract.status === 'ouvert' || ['draft', 'sent', 'signed'].includes(contract.status)
      );

      const rentedVehicleIds = new Set<string>();
      if (openContracts.length > 0 && allVehicles.length > 0) {
        for (const contract of openContracts) {
          if (contract.vehicle) {
            const matchedVehicle = findMatchingVehicle(contract.vehicle, allVehicles);
            if (matchedVehicle) {
              rentedVehicleIds.add(matchedVehicle.id);
            }
          }
        }
      }

      const syncedVehicles = allVehicles.map(vehicle => {
        const isRented = rentedVehicleIds.has(vehicle.id);
        const currentStatus = vehicle.etat_vehicule || 'disponible';
        let newStatus = currentStatus;

        if (currentStatus === 'loue' && !isRented) {
          newStatus = 'disponible';
        } else if (currentStatus === 'disponible' && isRented) {
          newStatus = 'loue';
        }

        if (newStatus !== currentStatus) {
          const updatedVehicle = localStorageService.update<Vehicle>('vehicles', vehicle.id, { etat_vehicule: newStatus });
          return updatedVehicle || { ...vehicle, etat_vehicule: newStatus };
        }
        return vehicle;
      });

      setVehicles(syncedVehicles);
    } catch (error) {
      console.error('Error in fetchVehicles:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la récupération et synchronisation des véhicules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newVehicle = localStorageService.create<Vehicle>('vehicles', vehicleData);
      setVehicles(prev => [...prev, newVehicle]);
      toast({
        title: "Succès",
        description: "Le véhicule a été créé avec succès"
      });
      return newVehicle;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'ajout du véhicule",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    try {
      const updatedVehicle = localStorageService.update<Vehicle>('vehicles', id, vehicleData);
      if (!updatedVehicle) {
        toast({
          title: "Erreur",
          description: "Véhicule introuvable",
          variant: "destructive"
        });
        return null;
      }

      setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      toast({
        title: "Succès",
        description: "Le véhicule a été mis à jour avec succès"
      });
      return updatedVehicle;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la mise à jour du véhicule",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const deleted = localStorageService.delete('vehicles', id);
      if (!deleted) {
        toast({
          title: "Erreur",
          description: "Véhicule introuvable",
          variant: "destructive"
        });
        return false;
      }

      setVehicles(prev => prev.filter(v => v.id !== id));
      toast({
        title: "Succès",
        description: "Le véhicule a été supprimé avec succès"
      });
      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la suppression du véhicule",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  return {
    vehicles,
    loading,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    refetch: fetchVehicles
  };
};
