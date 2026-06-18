
import { Vehicle } from "@/hooks/useVehicles";
import { vehiclesRepository } from "@/repositories/vehiclesRepository";

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

export async function setVehicleAsRented(vehicleId: string): Promise<boolean> {
  try {
    const updated = await vehiclesRepository.updateVehicle(vehicleId, { etat_vehicule: 'loue' });
    return !!updated;
  } catch (error) {
    return false;
  }
}

export async function updateVehicleStatusAfterDeletion(vehicleId: string): Promise<boolean> {
  try {
    const updated = await vehiclesRepository.updateVehicle(vehicleId, { etat_vehicule: 'disponible' });
    return !!updated;
  } catch (error) {
    return false;
  }
}
