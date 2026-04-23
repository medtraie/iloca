import { useState, useEffect } from "react";
import { useTenants } from "@/hooks/useTenants";
import { useVehicles } from "@/hooks/useVehicles";
import { useContracts } from "@/hooks/useContracts";
import type { ContractPDFData } from "@/hooks/usePDFGeneration";
import { calculateDateDifference, getContractStatus, calculateTotalPrice, calculateRemaining } from "./contractUtils";
import { addDays, format } from "date-fns";

interface UseNewContractStateProps {
  // pour plus tard, si on veut injecter des callbacks ou dépendances externes.
}

export const useNewContractState = () => {
  const { tenants, loading: tenantsLoading } = useTenants();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { contracts } = useContracts();

  const [open, setOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [serie, setSerie] = useState("");
  const [lastUsedSerie, setLastUsedSerie] = useState("");
  const [deliveryFuelLevel, setDeliveryFuelLevel] = useState(50);
  const [returnFuelLevel, setReturnFuelLevel] = useState(50);
  const [deliveryDamages, setDeliveryDamages] = useState<{ id: string; x: number; y: number; }[]>([]);
  const [returnDamages, setReturnDamages] = useState<{ id: string; x: number; y: number; }[]>([]);

  const [formData, setFormData] = useState({
    customerLastName: "اختبار", // Default test customer name
    customerFirstName: "عميل",
    customerAddressMorocco: "",
    customerPhone: "",
    customerAddressForeign: "",
    customerCin: "",
    customerCinDelivered: "",
    customerLicenseNumber: "",
    customerLicenseDelivered: "",
    customerPassportNumber: "",
    customerPassportDelivered: "",
    customerBirthDate: "",
    secondDriverLastName: "",
    secondDriverFirstName: "",
    secondDriverAddressMorocco: "",
    secondDriverPhone: "",
    secondDriverAddressForeign: "",
    secondDriverCin: "",
    secondDriverCinDelivered: "",
    secondDriverLicenseNumber: "",
    secondDriverLicenseDelivered: "",
    secondDriverPassportNumber: "",
    secondDriverPassportDelivered: "",
    vehicleBrand: "Peugeot", // Default test vehicle
    vehicleModel: "208",
    vehicleRegistration: "",
    vehicleYear: "2023",
    vehicleKmDepart: "",
    deliveryLocation: "",
    deliveryDateTime: new Date().toISOString().slice(0, 16), // Set to current date and time
    rentalDays: "1", // Default to 1 day
    vehicleStateDelivery: "",
    emergencyEquipmentDelivery: "",
    observationsDelivery: "",
    returnDateTime: "",
    returnLocation: "",
    extensionUntil: "",
    vehicleKmReturn: "",
    extendedDays: "",
    vehicleStateReturn: "",
    emergencyEquipmentReturn: "",
    observationsReturn: "",
    dailyPrice: "300", // Default price in DH
    rentalDuration: "1", // Default to 1 day
    totalPrice: "300", // Default total
    advance: "",
    remaining: "300",
    paymentMethod: "",
    deliveryDate: "",
    returnDate: "",
    delivery_agent_signature: "",
    delivery_tenant_signature: "",
    return_agent_signature: "",
    return_tenant_signature: ""
  });

  // Automatically calculate return date based on delivery date and duration
  useEffect(() => {
    if (formData.deliveryDateTime && formData.rentalDuration) {
      try {
        const startDate = new Date(formData.deliveryDateTime);
        const duration = parseInt(formData.rentalDuration, 10);

        if (!isNaN(startDate.getTime()) && !isNaN(duration) && duration > 0) {
          // For a 4-day rental starting on the 15th, the car is returned on the 19th (4 * 24h periods).
          const endDate = addDays(startDate, duration);
          
          const hours = startDate.getHours();
          const minutes = startDate.getMinutes();
          endDate.setHours(hours, minutes);

          const newReturnDateTime = format(endDate, "yyyy-MM-dd'T'HH:mm");

          if (newReturnDateTime !== formData.returnDateTime) {
            setFormData(prev => ({
              ...prev,
              returnDateTime: newReturnDateTime
            }));
          }
        }
      } catch (e) {
        console.error("Error calculating return date:", e);
      }
    }
  }, [formData.deliveryDateTime, formData.rentalDuration]);

  // 🎯 SYNCHRONISATION AUTOMATIQUE: rentalDuration = rentalDays toujours
  useEffect(() => {
    if (formData.rentalDays && formData.rentalDays !== formData.rentalDuration) {
      console.log(`[🚨 SYNC] Auto-updating rentalDuration from ${formData.rentalDuration} to ${formData.rentalDays}`);
      setFormData(prev => ({
        ...prev,
        rentalDuration: formData.rentalDays
      }));
    }
  }, [formData.rentalDays]);

  // Effet pour auto-remplir données locataire lorsque sélectionné
  useEffect(() => {
    if (!selectedTenantId) return;
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    if (!tenant) return;
    setFormData((prev) => ({
      ...prev,
      customerLastName: tenant.nom || "",
      customerFirstName: tenant.prenom || "",
      customerAddressMorocco: tenant.adresse || "",
      customerPhone: tenant.telephone || "",
      customerAddressForeign: "", // Not available in tenant data
      customerCin: tenant.cin || "",
      customerCinDelivered: tenant.dateCin || "",
      customerLicenseNumber: tenant.permis || "",
      customerLicenseDelivered: tenant.datePermis || "",
      customerPassportNumber: tenant.passeport || "",
      customerPassportDelivered: "", // Not available in tenant data
      customerBirthDate: tenant.dateNaissance || "",
    }));
  }, [selectedTenantId, tenants]);

  // Effet pour auto-remplir données véhicule
  useEffect(() => {
    if (!selectedVehicleId) return;
    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle) return;
    setFormData((prev) => ({
      ...prev,
      vehicleBrand: vehicle.marque || vehicle.brand || "",
      vehicleModel: vehicle.modele || vehicle.model || "",
      vehicleRegistration: vehicle.immatriculation || vehicle.registration || "",
      vehicleYear: vehicle.annee?.toString() || vehicle.year?.toString() || "",
    }));
  }, [selectedVehicleId, vehicles]);

  // Calculer automatiquement la prochaine série de contrat
  useEffect(() => {
    if (contracts && contracts.length > 0) {
      // Trouver le numéro de contrat le plus élevé
      const maxContractNumber = Math.max(
        ...contracts
          .map(contract => parseInt(contract.contract_number || '0', 10))
          .filter(num => !isNaN(num))
      );
      
      const nextSerie = (maxContractNumber + 1).toString();
      const lastSerie = maxContractNumber.toString();
      
      setLastUsedSerie(lastSerie);
      
      // Auto-remplir uniquement si le champ série est vide
      if (!serie) {
        setSerie(nextSerie);
      }
    } else {
      // Premier contrat
      if (!serie) {
        setSerie("1");
      }
      setLastUsedSerie("0");
    }
  }, [contracts, serie]);

  // Génère un "numéro du contrat" basé sur le champ série saisi.
  const generateContractNumber = () => serie || "";

  // Handler pour les champs input/textarea classiques
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignatureChange = (type: string, signatureData: string) => {
    console.log(`[useNewContractState] handleSignatureChange called for ${type}`);
    console.log(`[useNewContractState] Signature data received:`, signatureData ? `SUCCESS - data length: ${signatureData.length}` : 'EMPTY signature');
    console.log(`[useNewContractState] Signature data preview:`, signatureData ? signatureData.substring(0, 50) + '...' : 'NO DATA');
    console.log(`[useNewContractState] Current formData for ${type}:`, formData[type as keyof typeof formData] ? `EXISTS - length: ${formData[type as keyof typeof formData]?.toString().length}` : 'EMPTY');
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [type]: signatureData
      };
      console.log(`[useNewContractState] Updated formData for ${type}:`, newFormData[type as keyof typeof newFormData] ? `SET - length: ${newFormData[type as keyof typeof newFormData]?.toString().length}` : 'EMPTY');
      
      // Double check that all signatures are in the form data
      console.log('[useNewContractState] All current signatures status:');
      console.log('- delivery_agent_signature:', newFormData.delivery_agent_signature ? `Present (${newFormData.delivery_agent_signature.length})` : 'MISSING');
      console.log('- delivery_tenant_signature:', newFormData.delivery_tenant_signature ? `Present (${newFormData.delivery_tenant_signature.length})` : 'MISSING');
      console.log('- return_agent_signature:', newFormData.return_agent_signature ? `Present (${newFormData.return_agent_signature.length})` : 'MISSING');
      console.log('- return_tenant_signature:', newFormData.return_tenant_signature ? `Present (${newFormData.return_tenant_signature.length})` : 'MISSING');
      
      return newFormData;
    });
  };

  // Reset totalement le formulaire
  const resetForm = () => {
    setFormData({
      customerLastName: "",
      customerFirstName: "",
      customerAddressMorocco: "",
      customerPhone: "",
      customerAddressForeign: "",
      customerCin: "",
      customerCinDelivered: "",
      customerLicenseNumber: "",
      customerLicenseDelivered: "",
      customerPassportNumber: "",
      customerPassportDelivered: "",
      customerBirthDate: "",
      secondDriverLastName: "",
      secondDriverFirstName: "",
      secondDriverAddressMorocco: "",
      secondDriverPhone: "",
      secondDriverAddressForeign: "",
      secondDriverCin: "",
      secondDriverCinDelivered: "",
      secondDriverLicenseNumber: "",
      secondDriverLicenseDelivered: "",
      secondDriverPassportNumber: "",
      secondDriverPassportDelivered: "",
      vehicleBrand: "",
      vehicleModel: "",
      vehicleRegistration: "",
      vehicleYear: "",
      vehicleKmDepart: "",
      deliveryLocation: "",
      deliveryDateTime: "",
      rentalDays: "",
      vehicleStateDelivery: "",
      emergencyEquipmentDelivery: "",
      observationsDelivery: "",
      returnDateTime: "",
      returnLocation: "",
      extensionUntil: "",
      vehicleKmReturn: "",
      extendedDays: "",
      vehicleStateReturn: "",
      emergencyEquipmentReturn: "",
      observationsReturn: "",
      dailyPrice: "",
      rentalDuration: "",
      totalPrice: "",
      advance: "",
      remaining: "",
      paymentMethod: "",
      deliveryDate: "",
      returnDate: "",
      delivery_agent_signature: "",
      delivery_tenant_signature: "",
      return_agent_signature: "",
      return_tenant_signature: ""
    });
    setSerie("");
    setDeliveryFuelLevel(50);
    setReturnFuelLevel(50);
    setDeliveryDamages([]);
    setReturnDamages([]);
    setSelectedTenantId("");
    setSelectedVehicleId("");
  };

  // Fonction pour générer la prochaine série
  const generateNextSerie = () => {
    if (contracts && contracts.length > 0) {
      const maxContractNumber = Math.max(
        ...contracts
          .map(contract => parseInt(contract.contract_number || '0', 10))
          .filter(num => !isNaN(num))
      );
      const nextSerie = (maxContractNumber + 1).toString();
      setSerie(nextSerie);
    } else {
      setSerie("1");
    }
  };

  return {
    open, setOpen,
    selectedTenantId, setSelectedTenantId,
    selectedVehicleId, setSelectedVehicleId,
    serie, setSerie,
    lastUsedSerie,
    generateNextSerie,
    formData, setFormData,
    deliveryFuelLevel, setDeliveryFuelLevel,
    returnFuelLevel, setReturnFuelLevel,
    deliveryDamages, setDeliveryDamages,
    returnDamages, setReturnDamages,
    generateContractNumber,
    handleInputChange,
    handleSignatureChange,
    resetForm,
    tenants, tenantsLoading,
    vehicles, vehiclesLoading,
  };
};
