
import { Label } from "@/components/ui/label";
import { useTenants } from "@/hooks/useTenants";
import { useVehicles } from "@/hooks/useVehicles";

interface CustomerVehicleSelectorProps {
  selectedTenantId: string;
  setSelectedTenantId: (id: string) => void;
  selectedVehicleId: string;
  setSelectedVehicleId: (id: string) => void;
}

const CustomerVehicleSelector = ({
  selectedTenantId,
  setSelectedTenantId,
  selectedVehicleId,
  setSelectedVehicleId
}: CustomerVehicleSelectorProps) => {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  return (
    <div className="bg-blue-50 p-4 rounded-lg mb-2">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Label htmlFor="selectTenant" className="text-sm font-medium">
            Sélectionner le locataire *
          </Label>
          <select
            id="selectTenant"
            className="w-full mt-1 border rounded px-3 py-2 text-sm"
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
          >
            <option value="">--- Choisir le locataire ---</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom} {t.prenom}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <Label htmlFor="selectVehicle" className="text-sm font-medium">
            Sélectionner le véhicule *
          </Label>
          <select
            id="selectVehicle"
            className="w-full mt-1 border rounded px-3 py-2 text-sm"
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
          >
            <option value="">--- Choisir le véhicule ---</option>
            {vehicles.map((v) => {
              const isAvailable = v.etat_vehicule === 'disponible';
              const statusText = v.etat_vehicule === 'loue' ? ' (loué)' : 
                               v.etat_vehicule === 'maintenance' ? ' (maintenance)' : ' (disponible)';
              
              return (
                <option 
                  key={v.id} 
                  value={v.id}
                  disabled={!isAvailable}
                  style={{ color: isAvailable ? 'black' : '#999' }}
                >
                  {v.marque || v.brand} {v.modele || v.model} {v.immatriculation || v.registration}{statusText}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      {(tenantsLoading || vehiclesLoading) && (
        <div className="mt-2 text-sm text-blue-500">Chargement des données...</div>
      )}
    </div>
  );
};

export default CustomerVehicleSelector;
