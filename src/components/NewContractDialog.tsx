import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VehicleDiagram from "./VehicleDiagram";
import FuelGauge from "./FuelGauge";
import { usePDFGeneration, ContractPDFData } from "@/hooks/usePDFGeneration";
import CustomerVehicleSelector from "./contracts/CustomerVehicleSelector";
import ContractLocataireFields from "./contracts/ContractLocataireFields";
import ContractVehicleFields from "./contracts/ContractVehicleFields";
import ContractFacturationFields from "./contracts/ContractFacturationFields";
import ContractSignatureFields from "./contracts/ContractSignatureFields";
import { Payment } from "@/types/payment";

// Refactoring: centralisation de la logique état du contrat
import { useNewContractState } from "./new-contract-dialog/useNewContractState";
import { calculateTotalPrice, calculateRemaining, getContractStatus } from "./new-contract-dialog/contractUtils";

import { NewDialogContract } from "@/utils/contractTransform";

interface NewContractDialogProps {
  onAddContract: (contract: NewDialogContract) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const NewContractDialog = ({ onAddContract, open: externalOpen, onOpenChange: externalOnOpenChange }: NewContractDialogProps) => {
  const {
    open: internalOpen, setOpen: setInternalOpen,
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
  } = useNewContractState();

  // Gestion de l'état ouvert/fermé (interne ou contrôlé depuis l'extérieur)
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const { toast } = useToast();
  const { generatePDF } = usePDFGeneration();

  const handleDateChange = (field: string, date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date ? date.toISOString().split('T')[0] : ""
    }));
  };

  const handleGeneratePDF = async () => {
    const contractNumber = generateContractNumber();
    const startDate = formData.deliveryDateTime.split('T')[0];
    const endDate = formData.returnDateTime ? formData.returnDateTime.split('T')[0] : "";
    const total = calculateTotalPrice(formData.dailyPrice, formData.rentalDuration);

    const pdfData: ContractPDFData = {
      ...formData,
      contractNumber,
      deliveryFuelLevel,
      returnFuelLevel,
      deliveryDamages, // CRITICAL: Include damage points
      returnDamages, // CRITICAL: Include damage points
      totalPrice: total,
      remaining: calculateRemaining(total, formData.advance),
      // Include electronic signatures
      delivery_agent_signature: formData.delivery_agent_signature,
      delivery_tenant_signature: formData.delivery_tenant_signature,
      return_agent_signature: formData.return_agent_signature,
      return_tenant_signature: formData.return_tenant_signature,
      // Include tenant document images for PDF preview
      customerCinImageUrl: selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.cinImageUrl : undefined,
      customerLicenseImageUrl: selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.permisImageUrl : undefined,
    };

    const success = await generatePDF(pdfData, `contrat-${contractNumber}.pdf`);
    if (success) {
      toast({ title: "PDF généré", description: "Le contrat PDF a été généré avec succès" });
    } else {
      toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[NewContractDialog] handleSubmit called');

    if (!serie) {
      console.log('[NewContractDialog] Missing serie, showing error toast');
      toast({
        title: "Erreur",
        description: "Veuillez saisir ou choisir numéro العقد (série)",
        variant: "destructive"
      });
      return;
    }

    if (!formData.customerLastName || !formData.vehicleBrand || !formData.deliveryDateTime || !formData.dailyPrice) {
      console.log('[NewContractDialog] Missing required fields, showing error toast');
      console.log('Required fields status:', {
        customerLastName: formData.customerLastName || 'EMPTY',
        vehicleBrand: formData.vehicleBrand || 'EMPTY', 
        deliveryDateTime: formData.deliveryDateTime || 'EMPTY',
        dailyPrice: formData.dailyPrice || 'EMPTY'
      });
      console.log('All form data:', formData);
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires: Nom du client, Marque du véhicule, Date de livraison et Prix par jour",
        variant: "destructive"
      });
      return;
    }

    const contractNumber = serie;
    const startDate = formData.deliveryDateTime.split('T')[0];
    const endDate = formData.returnDateTime ? formData.returnDateTime.split('T')[0] : "";
    const total = calculateTotalPrice(formData.dailyPrice, formData.rentalDuration);
    const contractStatus = getContractStatus(startDate, endDate);

    console.log(`[NewContractDialog] Creating new contract with interactive data:`);
    console.log(`- Contract serie: ${contractNumber}`);
    console.log(`- Advance payment: ${parseFloat(formData.advance) || 0} MAD`);
    console.log(`- Delivery fuel: ${deliveryFuelLevel}`);
    console.log(`- Return fuel: ${returnFuelLevel}`);
    console.log(`- Delivery damages:`, deliveryDamages);
    console.log(`- Return damages:`, returnDamages);

    const newContract: NewDialogContract = {
      contractNumber: contractNumber,
      customerName: `${formData.customerFirstName} ${formData.customerLastName}`.trim(),
      customerPhone: formData.customerPhone || "",
      customerNationalId: formData.customerCin || "",
      vehicle: `${formData.vehicleBrand} ${formData.vehicleModel} ${formData.vehicleYear}`.trim(),
      startDate: startDate,
      endDate: endDate || startDate,
      dailyRate: parseFloat(formData.dailyPrice),
      totalAmount: total.toString(),
      advance_payment: parseFloat(formData.advance) || undefined, // CRITICAL: Include advance payment, keep undefined if empty
      status: "ouvert", // CRITICAL FIX: Always create as "ouvert" not "brouillon"
      notes: formData.observationsDelivery,
      // CRITICAL: Interactive data preservation - add to the interface
      delivery_fuel_level: deliveryFuelLevel,
      return_fuel_level: returnFuelLevel,
      delivery_damages: deliveryDamages,
      return_damages: returnDamages,
      contract_data: {
        ...formData,
        // Ensure interactive data is also preserved in contract_data
        delivery_fuel_level: deliveryFuelLevel,
        return_fuel_level: returnFuelLevel,
        delivery_damages: deliveryDamages,
        return_damages: returnDamages
      },
    };

    // DEBUGGING: Log all form data before PDF generation
    console.log('[NewContractDialog] Form data signatures before PDF generation:');
    console.log('- delivery_agent_signature:', formData.delivery_agent_signature ? `Present (${formData.delivery_agent_signature.length} chars)` : 'MISSING');
    console.log('- delivery_tenant_signature:', formData.delivery_tenant_signature ? `Present (${formData.delivery_tenant_signature.length} chars)` : 'MISSING');
    console.log('- return_agent_signature:', formData.return_agent_signature ? `Present (${formData.return_agent_signature.length} chars)` : 'MISSING');
    console.log('- return_tenant_signature:', formData.return_tenant_signature ? `Present (${formData.return_tenant_signature.length} chars)` : 'MISSING');

    const pdfData: ContractPDFData = {
      ...formData,
      contractNumber,
      deliveryFuelLevel,
      returnFuelLevel,
      deliveryDamages, // CRITICAL: Pass damage points to PDF
      returnDamages, // CRITICAL: Pass damage points to PDF
      totalPrice: total,
      remaining: calculateRemaining(total, formData.advance),
      // CRITICAL FIX: Include electronic signatures for PDF generation
      delivery_agent_signature: formData.delivery_agent_signature,
      delivery_tenant_signature: formData.delivery_tenant_signature,
      return_agent_signature: formData.return_agent_signature,
      return_tenant_signature: formData.return_tenant_signature,
      // CRITICAL: Include tenant document images
      customerCinImageUrl: selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.cinImageUrl : undefined,
      customerLicenseImageUrl: selectedTenantId ? tenants.find(t => t.id === selectedTenantId)?.permisImageUrl : undefined,
    };

    console.log('[NewContractDialog] PDF data signatures being passed:');
    console.log('- delivery_agent_signature:', pdfData.delivery_agent_signature ? `Present (${pdfData.delivery_agent_signature.length} chars)` : 'MISSING');
    console.log('- delivery_tenant_signature:', pdfData.delivery_tenant_signature ? `Present (${pdfData.delivery_tenant_signature.length} chars)` : 'MISSING');
    console.log('- return_agent_signature:', pdfData.return_agent_signature ? `Present (${pdfData.return_agent_signature.length} chars)` : 'MISSING');
    console.log('- return_tenant_signature:', pdfData.return_tenant_signature ? `Present (${pdfData.return_tenant_signature.length} chars)` : 'MISSING');

    // Créer un paiement pour tous les modes de règlement (Espèces, Chèque, Virement)
    if (formData.paymentMethod && parseFloat(formData.advance) > 0) {
      const payment: Payment = {
        id: crypto.randomUUID(),
        contractId: newContract.contractNumber || "",
        contractNumber: contractNumber,
        customerName: newContract.customerName,
        amount: parseFloat(formData.advance),
        paymentMethod: formData.paymentMethod as 'Espèces' | 'Virement' | 'Chèque',
        paymentDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        // Ajouter les détails du chèque seulement si c'est un chèque
        ...(formData.paymentMethod === 'Chèque' && {
          checkName: newContract.customerName,
          checkReference: '', // À remplir manuellement
          checkDirection: 'reçu' as const,
          checkDepositStatus: 'non encaissé' as const
        })
      };
      
      // Sauvegarder dans localStorage
      const existingPayments = JSON.parse(localStorage.getItem('payments') || '[]');
      existingPayments.push(payment);
      localStorage.setItem('payments', JSON.stringify(existingPayments));
      
      console.log('[NewContractDialog] Payment created:', payment);
    }

    const pdfSuccess = await generatePDF(pdfData, `Contrat_${contractNumber}.pdf`);

    console.log('[NewContractDialog] About to call onAddContract with:', newContract);
    onAddContract(newContract);
    console.log('[NewContractDialog] onAddContract called successfully');
    resetForm();
    setOpen(false);

    if (pdfSuccess) {
      toast({
        title: "Succès",
        description: `Le nouveau contrat a été créé avec le statut 'Ouvert' et le PDF a été généré`
      });
    } else {
      toast({
        title: "Succès",
        description: `Le nouveau contrat a été créé avec le statut 'Ouvert' mais erreur lors de la génération du PDF`
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
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
              <div className="flex flex-col md:flex-row items-center justify-center gap-2 mt-2">
                <label htmlFor="serie" className="font-bold">
                  N°:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="serie"
                    name="serie"
                    value={serie}
                    onChange={e => setSerie(e.target.value.replace(/[^0-9]/g, ""))}
                    className="border rounded px-2 py-1 w-32 text-center font-mono text-xl bg-muted shadow"
                    placeholder={serie || "1"}
                    autoComplete="off"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateNextSerie}
                    className="text-xs"
                  >
                    Suivant
                  </Button>
                </div>
              </div>
              {lastUsedSerie && (
                <div className="text-center text-sm text-gray-500 mt-1">
                  Dernière série utilisée: {lastUsedSerie}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <CustomerVehicleSelector
            selectedTenantId={selectedTenantId}
            setSelectedTenantId={setSelectedTenantId}
            selectedVehicleId={selectedVehicleId}
            setSelectedVehicleId={setSelectedVehicleId}
          />
          <ContractLocataireFields 
            formData={formData} 
            handleInputChange={handleInputChange}
            handleDateChange={handleDateChange}
          />
          <ContractVehicleFields
            formData={formData}
            handleInputChange={handleInputChange}
            deliveryFuelLevel={deliveryFuelLevel}
            setDeliveryFuelLevel={setDeliveryFuelLevel}
            returnFuelLevel={returnFuelLevel}
            setReturnFuelLevel={setReturnFuelLevel}
            deliveryDamages={deliveryDamages}
            setDeliveryDamages={setDeliveryDamages}
            returnDamages={returnDamages}
            setReturnDamages={setReturnDamages}
          />
          <ContractFacturationFields
            formData={formData}
            handleInputChange={handleInputChange}
            calculateTotalPrice={() => calculateTotalPrice(formData.dailyPrice, formData.rentalDuration)}
            calculateRemaining={() => calculateRemaining(calculateTotalPrice(formData.dailyPrice, formData.rentalDuration), formData.advance)}
          />
          <ContractSignatureFields 
            formData={formData} 
            handleInputChange={handleInputChange}
            onSignatureChange={handleSignatureChange}
          />
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePDF}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Aperçu PDF
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Créer le Contrat (Ouvert)
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewContractDialog;
