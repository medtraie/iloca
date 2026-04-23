
import { Vehicle } from "@/hooks/useVehicles";
import { localStorageService } from "@/services/localStorageService";

export function findMatchingVehicle(vehicleString: string, vehicles: Vehicle[]): Vehicle | null {
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
}

export function setVehicleAsRented(vehicleId: string): boolean {
  try {
    const updated = localStorageService.update<Vehicle>('vehicles', vehicleId, { etat_vehicule: 'loue' });
    return !!updated;
  } catch (error) {
    console.error('Error setting vehicle as rented:', error);
    return false;
  }
}

export function updateVehicleStatusAfterDeletion(vehicleId: string): boolean {
  try {
    const updated = localStorageService.update<Vehicle>('vehicles', vehicleId, { etat_vehicule: 'disponible' });
    return !!updated;
  } catch (error) {
    console.error('Error updating vehicle status after deletion:', error);
    return false;
  }
}
