import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VehicleDiagram from "./VehicleDiagram";
import FuelGauge from "./FuelGauge";
import CustomerSelector from "./CustomerSelector";
import VehicleSelector from "./VehicleSelector";
import { usePDFGeneration, ContractPDFData } from "@/hooks/usePDFGeneration";
import { Customer } from "@/hooks/useCustomers";
import { Vehicle } from "@/hooks/useVehicles";

interface Contract {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate?: number;
  totalAmount: string;
  status: string;
  statusColor: string;
  notes?: string;
}

interface ContractFormDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedContract: Contract) => void;
  mode: 'view' | 'edit';
}

const ContractFormDialog = ({ contract, open, onOpenChange, onSave, mode }: ContractFormDialogProps) => {
  const { toast } = useToast();
  const { generatePDF } = usePDFGeneration();

  // Customer and Vehicle state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    // Locataire (Main Renter)
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
    
    // 2ème Conducteur (Second Driver) - Optional
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
    
    // Véhicule - Livraison du Véhicule
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
    
    // Véhicule - Reprise du Véhicule
    returnDateTime: "",
    returnLocation: "",
    extensionUntil: "",
    vehicleKmReturn: "",
    extendedDays: "",
    vehicleStateReturn: "",
    emergencyEquipmentReturn: "",
    observationsReturn: "",
    
    // Facturation
    dailyPrice: "",
    rentalDuration: "",
    totalPrice: "",
    advance: "",
    remaining: "",
    paymentMethod: "",
    
    // Signatures
    deliveryDate: "",
    returnDate: "",
    agentSignatureDelivery: "",
    agentSignatureReturn: "",
    renterSignatureDelivery: "",
    renterSignatureReturn: ""
  });

  // Add state for fuel levels
  const [deliveryFuelLevel, setDeliveryFuelLevel] = useState(100);
  const [returnFuelLevel, setReturnFuelLevel] = useState(100);

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customerLastName: customer.last_name,
        customerFirstName: customer.first_name || "",
        customerPhone: customer.phone || "",
        customerCin: customer.cin || "",
        customerAddressMorocco: customer.address_morocco || "",
        customerLicenseNumber: customer.license_number || "",
        customerBirthDate: customer.birth_date || "",
      }));
    }
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: Vehicle | null) => {
    setSelectedVehicle(vehicle);
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model || "",
        vehicleYear: vehicle.year?.toString() || "",
        vehicleRegistration: vehicle.registration || "",
      }));
    }
  };

  useEffect(() => {
    if (contract) {
      // Parse customer name (assuming format "FirstName LastName")
      const nameParts = contract.customerName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Parse vehicle info (assuming format "Brand Model Year")
      const vehicleParts = contract.vehicle.split(' ');
      const brand = vehicleParts[0] || '';
      const model = vehicleParts.slice(1, -1).join(' ') || '';
      const year = vehicleParts[vehicleParts.length - 1] || '';

      // Calculate rental duration
      const startDate = new Date(contract.startDate);
      const endDate = new Date(contract.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      setFormData({
        customerLastName: lastName,
        customerFirstName: firstName,
        customerAddressMorocco: "",
        customerPhone: contract.customerPhone || "",
        customerAddressForeign: "",
        customerCin: contract.customerNationalId || "",
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
        vehicleBrand: brand,
        vehicleModel: model,
        vehicleRegistration: "",
        vehicleYear: year,
        vehicleKmDepart: "0",
        deliveryLocation: "",
        deliveryDateTime: contract.startDate + "T09:00",
        rentalDays: diffDays.toString(),
        vehicleStateDelivery: "",
        emergencyEquipmentDelivery: "",
        observationsDelivery: contract.notes || "",
        returnDateTime: contract.endDate + "T18:00",
        returnLocation: "",
        extensionUntil: "",
        vehicleKmReturn: "0",
        extendedDays: "0",
        vehicleStateReturn: "",
        emergencyEquipmentReturn: "",
        observationsReturn: "",
        dailyPrice: contract.dailyRate?.toString() || "0",
        rentalDuration: diffDays.toString(),
        totalPrice: contract.totalAmount.replace(' DH', ''),
        advance: "0",
        remaining: contract.totalAmount.replace(' DH', ''),
        paymentMethod: "",
        deliveryDate: contract.startDate,
        returnDate: contract.endDate,
        agentSignatureDelivery: "",
        agentSignatureReturn: "",
        renterSignatureDelivery: "",
        renterSignatureReturn: ""
      });
    }
  }, [contract]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to check if contract should be closed
  const shouldCloseContract = () => {
    const returnFields = [
      formData.returnDateTime,
      formData.returnLocation,
      formData.vehicleKmReturn,
      formData.returnDate
    ];
    
    // Check if at least 3 out of 4 key return fields are filled
    const filledReturnFields = returnFields.filter(field => field && field.trim() !== "").length;
    
    return filledReturnFields >= 3;
  };

  const calculateTotalPrice = () => {
    if (formData.dailyPrice && formData.rentalDuration) {
      return parseFloat(formData.dailyPrice) * parseInt(formData.rentalDuration);
    }
    return 0;
  };

  const calculateRemaining = () => {
    const total = calculateTotalPrice();
    const advance = parseFloat(formData.advance) || 0;
    return total - advance;
  };

  const handleGeneratePDF = async () => {
    if (!contract) return;

    // Parse total amount to get numeric value
    const totalAmountMatch = contract.totalAmount.match(/(\d+)/);
    const totalPrice = totalAmountMatch ? parseInt(totalAmountMatch[1]) : 0;

    // Calculate rental duration
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const pdfData: ContractPDFData = {
      contractNumber: contract.id,
      customerLastName: formData.customerLastName,
      customerFirstName: formData.customerFirstName,
      customerAddressMorocco: formData.customerAddressMorocco,
      customerPhone: formData.customerPhone,
      customerAddressForeign: formData.customerAddressForeign,
      customerCin: formData.customerCin,
      customerCinDelivered: formData.customerCinDelivered,
      customerLicenseNumber: formData.customerLicenseNumber,
      customerLicenseDelivered: formData.customerLicenseDelivered,
      customerPassportNumber: formData.customerPassportNumber,
      customerPassportDelivered: formData.customerPassportDelivered,
      customerBirthDate: formData.customerBirthDate,
      secondDriverLastName: formData.secondDriverLastName,
      secondDriverFirstName: formData.secondDriverFirstName,
      secondDriverAddressMorocco: formData.secondDriverAddressMorocco,
      secondDriverPhone: formData.secondDriverPhone,
      secondDriverAddressForeign: formData.secondDriverAddressForeign,
      secondDriverCin: formData.secondDriverCin,
      secondDriverCinDelivered: formData.secondDriverCinDelivered,
      secondDriverLicenseNumber: formData.secondDriverLicenseNumber,
      secondDriverLicenseDelivered: formData.secondDriverLicenseDelivered,
      secondDriverPassportNumber: formData.secondDriverPassportNumber,
      secondDriverPassportDelivered: formData.secondDriverPassportDelivered,
      vehicleBrand: formData.vehicleBrand,
      vehicleModel: formData.vehicleModel,
      vehicleRegistration: formData.vehicleRegistration,
      vehicleYear: formData.vehicleYear,
      vehicleKmDepart: formData.vehicleKmDepart,
      deliveryLocation: formData.deliveryLocation,
      deliveryDateTime: formData.deliveryDateTime,
      rentalDays: formData.rentalDays,
      emergencyEquipmentDelivery: formData.emergencyEquipmentDelivery,
      observationsDelivery: formData.observationsDelivery,
      deliveryFuelLevel,
      returnDateTime: formData.returnDateTime,
      returnLocation: formData.returnLocation,
      extensionUntil: formData.extensionUntil,
      vehicleKmReturn: formData.vehicleKmReturn,
      extendedDays: formData.extendedDays,
      emergencyEquipmentReturn: formData.emergencyEquipmentReturn,
      observationsReturn: formData.observationsReturn,
      returnFuelLevel,
      dailyPrice: formData.dailyPrice,
      rentalDuration: formData.rentalDuration,
      totalPrice: totalPrice,
      advance: formData.advance,
      remaining: calculateRemaining(),
      paymentMethod: formData.paymentMethod,
      deliveryDate: formData.deliveryDate,
      returnDate: formData.returnDate,
    };

    const success = await generatePDF(pdfData, `Contrat_${contract.id}.pdf`);
    
    if (success) {
      toast({
        title: "PDF généré",
        description: "Le contrat PDF a été généré avec succès"
      });
    } else {
      toast({
        title: "Erreur",
        description: "Erreur lors de la génération du PDF",
        variant: "destructive"
      });
    }
  };

  const handleSave = () => {
    if (!contract || !onSave) return;

    // Calculate total amount if dailyRate and dates are provided
    let totalAmount = contract.totalAmount;
    if (formData.dailyPrice && formData.deliveryDateTime && formData.returnDateTime) {
      const startDate = new Date(formData.deliveryDateTime);
      const endDate = new Date(formData.returnDateTime);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const total = diffDays * parseFloat(formData.dailyPrice);
      totalAmount = `${total} DH`;
    }

    // Determine contract status based on return fields
    let status = contract.status;
    let statusColor = contract.statusColor;
    
    if (shouldCloseContract()) {
      status = "Fermé";
      statusColor = "text-blue-600";
    }

    const updatedContract: Contract = {
      ...contract,
      customerName: `${formData.customerFirstName} ${formData.customerLastName}`.trim(),
      customerPhone: formData.customerPhone,
      customerNationalId: formData.customerCin,
      vehicle: `${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}`.trim(),
      startDate: formData.deliveryDateTime.split('T')[0],
      endDate: formData.returnDateTime ? formData.returnDateTime.split('T')[0] : contract.endDate,
      dailyRate: parseFloat(formData.dailyPrice) || contract.dailyRate,
      totalAmount,
      status,
      statusColor,
      notes: formData.observationsDelivery
    };

    onSave(updatedContract);
    onOpenChange(false);
    
    const statusMessage = shouldCloseContract() ? 
      `Le contrat ${contract.id} a été mis à jour et son statut a été changé à "Fermé"` : 
      `Le contrat ${contract.id} a été mis à jour avec succès`;
    
    toast({
      title: "Mise à jour réussie",
      description: statusMessage
    });
  };

  if (!contract) return null;

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-gray-800 mb-2">SFTLOCATION</div>
            <div className="text-lg text-gray-600 mb-1">LOCATION DE VOITURES</div>
            <div className="text-sm text-gray-500 mb-4">
              10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc<br/>
              Tél: 0522228704 - Fax: 05 22 47 17 80<br/>
              GSM: 06 62 59 63 07<br/>
              E-mail: bonatours308@gmail.com
            </div>
            <div className="text-center mb-4">
              <div className="text-lg font-semibold">Courte et longue durée 7/7</div>
              <div className="inline-block border-2 border-gray-400 px-4 py-2 rounded">
                <span className="text-lg font-bold">CONTRAT DE LOCATION</span>
              </div>
              <div className="text-right mt-2">N°: {contract.id}</div>
            </div>
          </div>
          <DialogTitle className="text-center">
            {mode === 'view' ? 'Détails du Contrat' : 'Modifier le Contrat'} {contract.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* LOCATAIRE Section */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
              <h3 className="text-lg font-bold">LOCATAIRE</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Locataire Principal */}
              <div className="space-y-4">
                <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Locataire</h4>
                
                {!isReadOnly && (
                  <div className="space-y-2">
                    <Label>Sélectionner un client</Label>
                    <CustomerSelector
                      selectedCustomer={selectedCustomer}
                      onCustomerSelect={handleCustomerSelect}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerLastName" className="text-sm">Nom</Label>
                    <Input
                      id="customerLastName"
                      name="customerLastName"
                      value={formData.customerLastName}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerFirstName" className="text-sm">Prénom</Label>
                    <Input
                      id="customerFirstName"
                      name="customerFirstName"
                      value={formData.customerFirstName}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddressMorocco" className="text-sm">Adresse au Maroc</Label>
                  <Input
                    id="customerAddressMorocco"
                    name="customerAddressMorocco"
                    value={formData.customerAddressMorocco}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone" className="text-sm">Tél.</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="tel"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerAddressForeign" className="text-sm">Adresse à l'Étranger</Label>
                    <Input
                      id="customerAddressForeign"
                      name="customerAddressForeign"
                      value={formData.customerAddressForeign}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerCin" className="text-sm">C.I.N. N°</Label>
                    <Input
                      id="customerCin"
                      name="customerCin"
                      value={formData.customerCin}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCinDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="customerCinDelivered"
                      name="customerCinDelivered"
                      value={formData.customerCinDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerLicenseNumber" className="text-sm">Permis N°</Label>
                    <Input
                      id="customerLicenseNumber"
                      name="customerLicenseNumber"
                      value={formData.customerLicenseNumber}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerLicenseDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="customerLicenseDelivered"
                      name="customerLicenseDelivered"
                      value={formData.customerLicenseDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="customerPassportNumber" className="text-sm">Passeport N°</Label>
                    <Input
                      id="customerPassportNumber"
                      name="customerPassportNumber"
                      value={formData.customerPassportNumber}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerPassportDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="customerPassportDelivered"
                      name="customerPassportDelivered"
                      value={formData.customerPassportDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerBirthDate" className="text-sm">Date de Naissance</Label>
                  <Input
                    id="customerBirthDate"
                    name="customerBirthDate"
                    type="date"
                    value={formData.customerBirthDate}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* 2ème Conducteur */}
              <div className="space-y-4">
                <h4 className="font-semibold text-center text-gray-700 border-b pb-2">2ème Conducteur</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverLastName" className="text-sm">Nom</Label>
                    <Input
                      id="secondDriverLastName"
                      name="secondDriverLastName"
                      value={formData.secondDriverLastName}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverFirstName" className="text-sm">Prénom</Label>
                    <Input
                      id="secondDriverFirstName"
                      name="secondDriverFirstName"
                      value={formData.secondDriverFirstName}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondDriverAddressMorocco" className="text-sm">Adresse au Maroc</Label>
                  <Input
                    id="secondDriverAddressMorocco"
                    name="secondDriverAddressMorocco"
                    value={formData.secondDriverAddressMorocco}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverPhone" className="text-sm">Tél.</Label>
                    <Input
                      id="secondDriverPhone"
                      name="secondDriverPhone"
                      value={formData.secondDriverPhone}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="tel"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverAddressForeign" className="text-sm">Adresse à l'Étranger</Label>
                    <Input
                      id="secondDriverAddressForeign"
                      name="secondDriverAddressForeign"
                      value={formData.secondDriverAddressForeign}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverCin" className="text-sm">C.I.N. N°</Label>
                    <Input
                      id="secondDriverCin"
                      name="secondDriverCin"
                      value={formData.secondDriverCin}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverCinDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="secondDriverCinDelivered"
                      name="secondDriverCinDelivered"
                      value={formData.secondDriverCinDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverPassportNumber" className="text-sm">Passeport N°</Label>
                    <Input
                      id="secondDriverPassportNumber"
                      name="secondDriverPassportNumber"
                      value={formData.secondDriverPassportNumber}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverPassportDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="secondDriverPassportDelivered"
                      name="secondDriverPassportDelivered"
                      value={formData.secondDriverPassportDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverLicenseNumber" className="text-sm">Permis N°</Label>
                    <Input
                      id="secondDriverLicenseNumber"
                      name="secondDriverLicenseNumber"
                      value={formData.secondDriverLicenseNumber}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondDriverLicenseDelivered" className="text-sm">Délivré le</Label>
                    <Input
                      id="secondDriverLicenseDelivered"
                      name="secondDriverLicenseDelivered"
                      value={formData.secondDriverLicenseDelivered}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VÉHICULE Section */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
              <h3 className="text-lg font-bold">VÉHICULE</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Livraison du Véhicule */}
              <div className="space-y-4">
                <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Livraison du Véhicule</h4>
                
                {!isReadOnly && (
                  <div className="space-y-2">
                    <Label>Sélectionner une véhicule</Label>
                    <VehicleSelector
                      selectedVehicle={selectedVehicle}
                      onVehicleSelect={handleVehicleSelect}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleBrand" className="text-sm">Marque</Label>
                    <Input
                      id="vehicleBrand"
                      name="vehicleBrand"
                      value={formData.vehicleBrand}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleModel" className="text-sm">Modèle</Label>
                    <Input
                      id="vehicleModel"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleRegistration" className="text-sm">Immatricule</Label>
                    <Input
                      id="vehicleRegistration"
                      name="vehicleRegistration"
                      value={formData.vehicleRegistration}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleYear" className="text-sm">Année</Label>
                    <Input
                      id="vehicleYear"
                      name="vehicleYear"
                      value={formData.vehicleYear}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="number"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleKmDepart" className="text-sm">Km Départ</Label>
                    <Input
                      id="vehicleKmDepart"
                      name="vehicleKmDepart"
                      value={formData.vehicleKmDepart}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="number"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryLocation" className="text-sm">Lieu de Livraison</Label>
                    <Input
                      id="deliveryLocation"
                      name="deliveryLocation"
                      value={formData.deliveryLocation}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDateTime" className="text-sm">Date et Heure de Livraison</Label>
                    <Input
                      id="deliveryDateTime"
                      name="deliveryDateTime"
                      type="datetime-local"
                      value={formData.deliveryDateTime}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rentalDays" className="text-sm">Nombre de Jour</Label>
                    <Input
                      id="rentalDays"
                      name="rentalDays"
                      value={formData.rentalDays}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="number"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">État du Véhicule</Label>
                  <VehicleDiagram />
                </div>

                <div className="space-y-2">
                  <FuelGauge 
                    value={deliveryFuelLevel}
                    onChange={isReadOnly ? () => {} : setDeliveryFuelLevel}
                    label="Niveau de carburant à la livraison"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyEquipmentDelivery" className="text-sm">Roues de secours et accessoires</Label>
                  <Textarea
                    id="emergencyEquipmentDelivery"
                    name="emergencyEquipmentDelivery"
                    value={formData.emergencyEquipmentDelivery}
                    onChange={handleInputChange}
                    className="text-sm"
                    rows={2}
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observationsDelivery" className="text-sm">Observations</Label>
                  <Textarea
                    id="observationsDelivery"
                    name="observationsDelivery"
                    value={formData.observationsDelivery}
                    onChange={handleInputChange}
                    className="text-sm"
                    rows={2}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>

              {/* Reprise du Véhicule */}
              <div className="space-y-4">
                <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Reprise du Véhicule</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="returnDateTime" className="text-sm">Date et Heure de Récupération</Label>
                    <Input
                      id="returnDateTime"
                      name="returnDateTime"
                      type="datetime-local"
                      value={formData.returnDateTime}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="returnLocation" className="text-sm">Lieu de Récupération</Label>
                    <Input
                      id="returnLocation"
                      name="returnLocation"
                      value={formData.returnLocation}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="extensionUntil" className="text-sm">Prolongation au</Label>
                    <Input
                      id="extensionUntil"
                      name="extensionUntil"
                      type="date"
                      value={formData.extensionUntil}
                      onChange={handleInputChange}
                      className="text-sm"
                      readOnly={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicleKmReturn" className="text-sm">Km de Retour</Label>
                    <Input
                      id="vehicleKmReturn"
                      name="vehicleKmReturn"
                      value={formData.vehicleKmReturn}
                      onChange={handleInputChange}
                      className="text-sm"
                      type="number"
                      readOnly={isReadOnly}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="extendedDays" className="text-sm">Nombre de Jour Prolongé</Label>
                  <Input
                    id="extendedDays"
                    name="extendedDays"
                    value={formData.extendedDays}
                    onChange={handleInputChange}
                    className="text-sm"
                    type="number"
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">État du Véhicule</Label>
                  <VehicleDiagram />
                </div>

                <div className="space-y-2">
                  <FuelGauge 
                    value={returnFuelLevel}
                    onChange={isReadOnly ? () => {} : setReturnFuelLevel}
                    label="Niveau de carburant au retour"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyEquipmentReturn" className="text-sm">Roues de secours et accessoires</Label>
                  <Textarea
                    id="emergencyEquipmentReturn"
                    name="emergencyEquipmentReturn"
                    value={formData.emergencyEquipmentReturn}
                    onChange={handleInputChange}
                    className="text-sm"
                    rows={2}
                    readOnly={isReadOnly}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observationsReturn" className="text-sm">Observations</Label>
                  <Textarea
                    id="observationsReturn"
                    name="observationsReturn"
                    value={formData.observationsReturn}
                    onChange={handleInputChange}
                    className="text-sm"
                    rows={2}
                    readOnly={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* FACTURATION Section */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
              <h3 className="text-lg font-bold">FACTURATION</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyPrice" className="text-sm">Prix par Jour</Label>
                <div className="flex">
                  <Input
                    id="dailyPrice"
                    name="dailyPrice"
                    type="number"
                    value={formData.dailyPrice}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">
                    DH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rentalDuration" className="text-sm">Durée de Location</Label>
                <Input
                  id="rentalDuration"
                  name="rentalDuration"
                  type="number"
                  value={formData.rentalDuration}
                  onChange={handleInputChange}
                  className="text-sm"
                  readOnly={isReadOnly}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalPrice" className="text-sm">Prix total</Label>
                <div className="flex">
                  <Input
                    value={calculateTotalPrice()}
                    className="text-sm bg-gray-100"
                    readOnly
                  />
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">
                    DH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance" className="text-sm">Avance</Label>
                <div className="flex">
                  <Input
                    id="advance"
                    name="advance"
                    type="number"
                    value={formData.advance}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">
                    DH
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remaining" className="text-sm">Reste</Label>
                <div className="flex">
                  <Input
                    value={calculateRemaining()}
                    className="text-sm bg-gray-100"
                    readOnly
                  />
                  <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">
                    DH
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-sm">Mode de Règlement</Label>
                <Input
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleInputChange}
                  className="text-sm"
                  placeholder="Espèces, Chèque, Carte..."
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="mt-6 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
              <p className="text-sm text-gray-700">
                <strong>Le locataire du véhicule SFTLOCATION</strong> reconnaît avoir lu et accepté les conditions 
                générales stipulées au verso du présent contrat, il est le seul responsable en cas de 
                violation de code de la route marocaine.
              </p>
            </div>
          </div>

          {/* Signatures Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Signatures à la livraison */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold text-center mb-4">Signatures à la livraison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Date :</Label>
                  <Input
                    name="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <div className="border-2 border-dashed border-gray-300 h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Lu et approuvé<br/>Signature de l'agent<br/>à la livraison</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Date :</Label>
                  <Input
                    name="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <div className="border-2 border-dashed border-gray-300 h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Lu et approuvé<br/>Signature du locataire<br/>à la livraison</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signatures au retour */}
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold text-center mb-4">Signatures au retour</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Date :</Label>
                  <Input
                    name="returnDate"
                    type="date"
                    value={formData.returnDate}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <div className="border-2 border-dashed border-gray-300 h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Lu et approuvé<br/>Signature de l'agent<br/>au retour</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Date :</Label>
                  <Input
                    name="returnDate"
                    type="date"
                    value={formData.returnDate}
                    onChange={handleInputChange}
                    className="text-sm"
                    readOnly={isReadOnly}
                  />
                  <div className="border-2 border-dashed border-gray-300 h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-500">Lu et approuvé<br/>Signature du locataire<br/>au retour</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {mode === 'view' ? 'Fermer' : 'Annuler'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleGeneratePDF}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Générer PDF
            </Button>
            {mode === 'edit' && (
              <Button type="button" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Sauvegarder
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContractFormDialog;
