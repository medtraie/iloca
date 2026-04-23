
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VehicleDiagram from "@/components/VehicleDiagram";
import FuelGauge from "@/components/FuelGauge";

interface DamagePoint {
  id: string;
  x: number;
  y: number;
}

interface Props {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  deliveryFuelLevel: number;
  setDeliveryFuelLevel: (val: number) => void;
  returnFuelLevel: number;
  setReturnFuelLevel: (val: number) => void;
  deliveryDamages: DamagePoint[];
  setDeliveryDamages: (damages: DamagePoint[]) => void;
  returnDamages: DamagePoint[];
  setReturnDamages: (damages: DamagePoint[]) => void;
  isReadOnly?: boolean;
}

export default function ContractVehicleFields({
  formData,
  handleInputChange,
  deliveryFuelLevel,
  setDeliveryFuelLevel,
  returnFuelLevel,
  setReturnFuelLevel,
  deliveryDamages,
  setDeliveryDamages,
  returnDamages,
  setReturnDamages,
  isReadOnly = false,
}: Props) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
        <h3 className="text-lg font-bold">VÉHICULE</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Livraison du Véhicule */}
        <div className="space-y-4">
          <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Livraison du Véhicule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicleBrand" className="text-sm">Marque *</Label>
              <Input id="vehicleBrand" name="vehicleBrand" value={formData.vehicleBrand} onChange={handleInputChange} className="text-sm" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel" className="text-sm">Modèle</Label>
              <Input id="vehicleModel" name="vehicleModel" value={formData.vehicleModel} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicleRegistration" className="text-sm">Immatricule</Label>
              <Input id="vehicleRegistration" name="vehicleRegistration" value={formData.vehicleRegistration} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleYear" className="text-sm">Année</Label>
              <Input id="vehicleYear" name="vehicleYear" value={formData.vehicleYear} onChange={handleInputChange} className="text-sm" type="number" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vehicleKmDepart" className="text-sm">Km Départ</Label>
              <Input id="vehicleKmDepart" name="vehicleKmDepart" value={formData.vehicleKmDepart} onChange={handleInputChange} className="text-sm" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryLocation" className="text-sm">Lieu de Livraison</Label>
              <Input id="deliveryLocation" name="deliveryLocation" value={formData.deliveryLocation} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="deliveryDateTime" className="text-sm">Date et Heure de Livraison *</Label>
              <Input id="deliveryDateTime" name="deliveryDateTime" type="datetime-local" value={formData.deliveryDateTime} onChange={handleInputChange} className="text-sm" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rentalDays" className="text-sm">Nombre de Jour</Label>
              <Input id="rentalDays" name="rentalDays" value={formData.rentalDays} onChange={handleInputChange} className="text-sm" type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">État du Véhicule - Livraison</Label>
            <VehicleDiagram 
              onDamageChange={isReadOnly ? undefined : setDeliveryDamages}
              initialDamages={deliveryDamages}
            />
          </div>
          <div className="space-y-2">
            <FuelGauge 
              value={deliveryFuelLevel} 
              onChange={isReadOnly ? undefined : setDeliveryFuelLevel} 
              label="Niveau de carburant à la livraison" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyEquipmentDelivery" className="text-sm">Roues de secours et accessoires</Label>
            <Textarea id="emergencyEquipmentDelivery" name="emergencyEquipmentDelivery" value={formData.emergencyEquipmentDelivery} onChange={handleInputChange} className="text-sm" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observationsDelivery" className="text-sm">Observations</Label>
            <Textarea id="observationsDelivery" name="observationsDelivery" value={formData.observationsDelivery} onChange={handleInputChange} className="text-sm" rows={2} />
          </div>
        </div>

        {/* Reprise du Véhicule */}
        <div className="space-y-4">
          <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Reprise du Véhicule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="returnDateTime" className="text-sm">Date et Heure de Récupération</Label>
              <Input id="returnDateTime" name="returnDateTime" type="datetime-local" value={formData.returnDateTime} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnLocation" className="text-sm">Lieu de Récupération</Label>
              <Input id="returnLocation" name="returnLocation" value={formData.returnLocation} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="extensionUntil" className="text-sm">Prolongation au</Label>
              <Input id="extensionUntil" name="extensionUntil" type="date" value={formData.extensionUntil} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleKmReturn" className="text-sm">Km de Retour</Label>
              <Input id="vehicleKmReturn" name="vehicleKmReturn" value={formData.vehicleKmReturn} onChange={handleInputChange} className="text-sm" type="number" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extendedDays" className="text-sm">Nombre de Jour Prolongé</Label>
            <Input id="extendedDays" name="extendedDays" value={formData.extendedDays} onChange={handleInputChange} className="text-sm" type="number" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">État du Véhicule - Retour</Label>
            <VehicleDiagram 
              onDamageChange={isReadOnly ? undefined : setReturnDamages}
              initialDamages={returnDamages}
            />
          </div>
          <div className="space-y-2">
            <FuelGauge 
              value={returnFuelLevel} 
              onChange={isReadOnly ? undefined : setReturnFuelLevel} 
              label="Niveau de carburant au retour" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyEquipmentReturn" className="text-sm">Roues de secours et accessoires</Label>
            <Textarea id="emergencyEquipmentReturn" name="emergencyEquipmentReturn" value={formData.emergencyEquipmentReturn} onChange={handleInputChange} className="text-sm" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observationsReturn" className="text-sm">Observations</Label>
            <Textarea id="observationsReturn" name="observationsReturn" value={formData.observationsReturn} onChange={handleInputChange} className="text-sm" rows={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
