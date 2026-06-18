import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { vehiclesRepository } from '@/repositories/vehiclesRepository';
import { contractsRepository } from '@/repositories/contractsRepository';
import type { Vehicle, Contract } from '@/types/appData';

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
      const allVehicles = await vehiclesRepository.listVehicles();
      const allContracts = await contractsRepository.getAll();
      
      const openContracts = allContracts.filter(
        contract => contract.status === 'ouvert' || ['draft', 'sent', 'signed'].includes(contract.status)
      );

      const rentedVehicleIds = new Set<string>();
      if (openContracts.length > 0 && allVehicles.length > 0) {
        for (const contract of openContracts) {
          if (contract.vehicleId) {
            rentedVehicleIds.add(contract.vehicleId);
          } else if (contract.vehicle) {
            const matchedVehicle = findMatchingVehicle(contract.vehicle, allVehicles);
            if (matchedVehicle) {
              rentedVehicleIds.add(matchedVehicle.id);
            }
          }
        }
      }

      const syncedVehicles = await Promise.all(allVehicles.map(async (vehicle) => {
        const isRented = rentedVehicleIds.has(vehicle.id);
        const currentStatus = vehicle.etat_vehicule || 'disponible';
        let newStatus = currentStatus;

        if (currentStatus === 'loue' && !isRented) {
          newStatus = 'disponible';
        } else if (currentStatus === 'disponible' && isRented) {
          newStatus = 'loue';
        }

        if (newStatus !== currentStatus) {
          try {
            return await vehiclesRepository.updateVehicle(vehicle.id, { etat_vehicule: newStatus });
          } catch {
            return { ...vehicle, etat_vehicule: newStatus };
          }
        }
        return vehicle;
      }));

      setVehicles(syncedVehicles);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la récupération et synchronisation des véhicules",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // #region debug-point C:usevehicles-before-create
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"vehicle-save-supabase",runId:"pre-fix",hypothesisId:"C",location:"useVehicles.ts:addVehicle",msg:"[DEBUG] addVehicle before repository create",data:{brand:vehicleData.marque||vehicleData.brand||"",registration:vehicleData.immatriculation||vehicleData.registration||"",status:vehicleData.etat_vehicule||null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      const newVehicle = await vehiclesRepository.createVehicle(vehicleData);
      // #region debug-point E:usevehicles-create-success
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"vehicle-save-supabase",runId:"pre-fix",hypothesisId:"E",location:"useVehicles.ts:addVehicle",msg:"[DEBUG] addVehicle repository success",data:{id:newVehicle.id,brand:newVehicle.marque||newVehicle.brand||""},ts:Date.now()})}).catch(()=>{});
      // #endregion
      setVehicles(prev => [...prev, newVehicle]);
      toast({
        title: "Succès",
        description: "Le véhicule a été créé avec succès"
      });
      return newVehicle;
    } catch (error) {
      // #region debug-point D:usevehicles-create-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"vehicle-save-supabase",runId:"pre-fix",hypothesisId:"D",location:"useVehicles.ts:addVehicle",msg:"[DEBUG] addVehicle repository error",data:{message:error instanceof Error ? error.message : String(error),code:(error as { code?: string } | null)?.code || null},ts:Date.now()})}).catch(()=>{});
      // #endregion
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de l'ajout du véhicule",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateVehicle = async (id: string, vehicleData: Partial<Vehicle>) => {
    try {
      const updatedVehicle = await vehiclesRepository.updateVehicle(id, vehicleData);

      setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));
      toast({
        title: "Succès",
        description: "Le véhicule a été mis à jour avec succès"
      });
      return updatedVehicle;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la mise à jour du véhicule",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      await vehiclesRepository.deleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast({
        title: "Succès",
        description: "Le véhicule a été supprimé avec succès"
      });
      return true;
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur s'est produite lors de la suppression du véhicule",
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
