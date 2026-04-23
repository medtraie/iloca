
import { useState } from "react";
import { useContracts, Contract } from "@/hooks/useContracts";
import { useToast } from "@/hooks/use-toast";
import { localStorageService, Vehicle } from "@/services/localStorageService";
import { convertFromNewDialogContract, NewDialogContract } from "@/utils/contractTransform";
import { useVehicles } from "@/hooks/useVehicles";
import { 
  findMatchingVehicle, 
  setVehicleAsRented, 
  updateVehicleStatusAfterDeletion 
} from "@/features/contracts/vehicleContractUtils";

export function useContractActions() {
  const [signatureLoading, setSignatureLoading] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { addContract, updateContract, deleteContract, refetch, contracts } = useContracts();
  const { vehicles } = useVehicles();

  const handleAddContract = async (newContractData: any) => {
    console.log("[useContractActions] handleAddContract called with data:", newContractData);
    
    const newContractWithSerie = { ...newContractData } as NewDialogContract;
    
    // Set initial status as 'ouvert' (draft)
    newContractWithSerie.status = 'ouvert';
    
    if (newContractData.contractNumber) {
      newContractWithSerie.contractNumber = newContractData.contractNumber;
    } else if (newContractData.id) {
      newContractWithSerie.contractNumber = newContractData.id;
    }
    
    console.log("[useContractActions] Contract with serie:", newContractWithSerie);
    
    const contractData = convertFromNewDialogContract(newContractWithSerie);
    console.log("[useContractActions] Converted contract data:", contractData);

    if (
      !contractData.customer_name ||
      !contractData.vehicle ||
      !contractData.start_date ||
      !contractData.end_date ||
      typeof contractData.total_amount !== "number"
    ) {
      toast({
        title: "Erreur",
        description: "Certaines données sont incomplètes ou incorrectes!",
        variant: "destructive",
      });
      return;
    }

    let searchVehicles = vehicles;
    if (!vehicles || vehicles.length === 0) {
      searchVehicles = localStorageService.getAll<Vehicle>('vehicles');
    }
    const matchedVehicle = findMatchingVehicle(contractData.vehicle, searchVehicles);

    // VALIDATION: Vérifier l'état du véhicule avant création
    if (matchedVehicle) {
      console.log("[useContractActions] Vehicle found:", matchedVehicle.id, "Status:", matchedVehicle.etat_vehicule);
      
      if (matchedVehicle.etat_vehicule === 'loue') {
        console.log("[useContractActions] Vehicle is already rented, blocking contract creation");
        toast({
          title: "السيارة غير متاحة",
          description: "هذه السيارة مؤجرة بالفعل. لا يمكن إنشاء عقد جديد.",
          variant: "destructive",
        });
        return;
      }
      
      if (matchedVehicle.etat_vehicule === 'maintenance') {
        console.log("[useContractActions] Vehicle is in maintenance, blocking contract creation");
        toast({
          title: "السيارة في الصيانة",
          description: "هذه السيارة في الصيانة. لا يمكن إنشاء عقد في الوقت الحالي.",
          variant: "destructive",
        });
        return;
      }
      
      console.log("[useContractActions] Vehicle is available, proceeding with contract creation");
    } else {
      console.warn("[useContractActions] No matching vehicle found for:", contractData.vehicle);
    }

    const result = await addContract(contractData);
    console.log("[useContractActions] addContract result:", result);
    if (!result) {
      console.log("[useContractActions] addContract failed - showing error toast");
      toast({
        title: "Échec de création",
        description: "Échec de la création du nouveau contrat. Veuillez réessayer.",
        variant: "destructive",
      });
      setTimeout(() => { refetch(); }, 1000);
      return;
    }

    // RÈGLE MÉTIER: Nouveau contrat → statut "ouvert", véhicule → "loué"
    if (matchedVehicle) {
      const updatedVehicle = localStorageService.update<Vehicle>('vehicles', matchedVehicle.id, { etat_vehicule: 'loue' });
      if (!updatedVehicle) {
        console.error("Erreur MAJ statut véhicule");
        toast({
          title: "Avertissement",
          description: "Le contrat a été créé, mais une erreur s'est produite lors de la mise à jour du statut du véhicule",
          variant: "destructive"
        });
      }
    } else {
      console.warn("Aucun véhicule trouvé pour :", contractData.vehicle);
    }

    setTimeout(() => { refetch(); }, 500);

    toast({
      title: "Succès",
      description: "Le contrat a été créé avec succès!",
    });
  };

  const handleDeleteContract = async (contractId: string) => {
    const contractToDelete = contracts.find((c) => c.id === contractId);
    if (!contractToDelete) {
      toast({
        title: "Erreur",
        description: "Contrat non trouvé.",
        variant: "destructive",
      });
      return;
    }

    const matchedVehicle = findMatchingVehicle(contractToDelete.vehicle, vehicles);
    
    const isDeleted = await deleteContract(contractId);

    if (isDeleted && matchedVehicle) {
      const updated = localStorageService.update<Vehicle>('vehicles', matchedVehicle.id, { etat_vehicule: 'disponible' });
      
      if (!updated) {
          console.error("Failed to update vehicle status");
          toast({
            title: "Avertissement",
            description: "Le contrat a été supprimé, mais la mise à jour du statut du véhicule a échoué.",
            variant: "destructive",
          });
      } else {
          toast({
            title: "Mise à jour du statut",
            description: `Le statut du véhicule a été mis à jour à 'disponible'.`,
          });
      }
    }

    setTimeout(() => {
      refetch();
    }, 500);
  };

  const handleSaveContract = async (updatedContract: Contract) => {
    // RÈGLE MÉTIER: Auto-clôture si section reprise complétée
    const shouldAutoClose = checkIfContractShouldClose(updatedContract);
    
    if (shouldAutoClose && updatedContract.status === 'ouvert') {
      // Clôturer le contrat automatiquement
      const closedContract = { ...updatedContract, status: 'ferme' as const };
      await updateContract(updatedContract.id, closedContract);
      
      // Remettre le véhicule à "disponible"
      const matchedVehicle = findMatchingVehicle(updatedContract.vehicle, vehicles);
      if (matchedVehicle && matchedVehicle.etat_vehicule === 'loue') {
        localStorageService.update<Vehicle>('vehicles', matchedVehicle.id, { etat_vehicule: 'disponible' });
        toast({
          title: "Contrat clôturé automatiquement",
          description: "Le contrat a été fermé et le véhicule est maintenant disponible",
        });
      }
    } else {
      await updateContract(updatedContract.id, updatedContract);
    }
    
    setTimeout(() => refetch(), 500);
  };

  // Fonction pour vérifier si un contrat doit être clôturé automatiquement
  const checkIfContractShouldClose = (contract: Contract): boolean => {
    const contractData = contract.contract_data;
    if (!contractData) return false;
    
    // Vérifier les champs clés de la section "Reprise du Véhicule"
    const returnFields = [
      contractData.returnDateTime,
      contractData.returnLocation,
      contractData.vehicleKmReturn,
      contractData.returnDate
    ];
    
    // Au moins 3 champs sur 4 doivent être remplis pour auto-clôture
    const filledReturnFields = returnFields.filter(field => field && field.toString().trim() !== "").length;
    
    return filledReturnFields >= 3;
  };

  const handleSendForSignature = async (contract: Contract) => {
    if (!contract.customer_email) {
      toast({
        title: "خطأ",
        description: "يجب إضافة بريد إلكتروني للعميل لإرسال العقد للتوقيع",
        variant: "destructive"
      });
      return;
    }
    
    setSignatureLoading(prev => ({ ...prev, [contract.id]: true }));
    
    try {
      // Mock signature generation since we removed Supabase
      const signatureUrl = `${window.location.origin}/sign/mock-token-${contract.id}`;
      await updateContract(contract.id, { status: 'sent' });
      toast({
        title: "تم الإرسال",
        description: `تم إرسال العقد للتوقيع. رابط التوقيع: ${signatureUrl}`,
      });
      navigator.clipboard.writeText(signatureUrl);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط التوقيع إلى الحافظة"
      });
    } finally {
      setSignatureLoading(prev => ({ ...prev, [contract.id]: false }));
    }
  };

  return {
    handleAddContract,
    handleDeleteContract,
    handleSaveContract,
    handleSendForSignature,
    signatureLoading
  };
}
