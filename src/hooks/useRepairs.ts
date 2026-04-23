
import { useState, useEffect, useCallback } from "react";
import { Repair, RepairFormData, RepairPayment, RepairUpdate } from "@/types/repair";
import { Vehicle } from "@/hooks/useVehicles";
import { localStorageService } from "@/services/localStorageService";
import { useToast } from "@/hooks/use-toast";

const REPAIR_DATA_TYPE = "repairs";
const VEHICLE_DATA_TYPE = "vehicles";
const REPAIR_PAYMENT_DATA_TYPE = "repairPayments";

const getSlaTargetDays = (typeReparation: Repair["typeReparation"]) => {
  if (typeReparation === "Électrique") return 5;
  if (typeReparation === "Garage") return 8;
  return 7;
};

const getDueDateFromRepairDate = (dateReparation: string) => {
  const base = new Date(dateReparation);
  if (Number.isNaN(base.getTime())) return new Date().toISOString().split("T")[0];
  base.setDate(base.getDate() + 30);
  return base.toISOString().split("T")[0];
};

const getOperationalStatus = (repairDate: string, debt: number, currentStatus?: Repair["operationalStatus"]) => {
  if (currentStatus) return currentStatus;
  if (debt <= 0) return "pret_pour_retour";
  const now = new Date();
  const repairDateObj = new Date(repairDate);
  const diffDays = Math.floor((now.getTime() - repairDateObj.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 20) return "immobilise_long";
  return "en_maintenance";
};

const toVehicleState = (status?: Repair["operationalStatus"]) => {
  if (status === "pret_pour_retour") return "disponible";
  return "maintenance";
};

const calculateTotals = (cout: number, payments: RepairPayment[]) => {
  const paye = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const dette = Math.max(0, cout - paye);
  return { paye, dette };
};

const createUpdate = (label: string): RepairUpdate => ({
  id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  date: new Date().toISOString(),
  label
});

export const useRepairs = (vehicleId?: string) => {
  const { toast } = useToast();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);

  const syncVehicleStatus = (vehicleIdToSync: string, operationalStatus?: Repair["operationalStatus"]) => {
    const vehicle = localStorageService.get<Vehicle>(VEHICLE_DATA_TYPE, vehicleIdToSync);
    if (!vehicle) return;
    localStorageService.update<Vehicle>(VEHICLE_DATA_TYPE, {
      ...vehicle,
      etat_vehicule: toVehicleState(operationalStatus)
    });
  };

  const pushTreasuryPayment = (repair: Repair, payment: RepairPayment) => {
    if (payment.amount <= 0) return;
    const treasuryMovement = {
      id: `repair-payment-${repair.id}-${payment.id}`,
      repairId: repair.id,
      date: payment.date,
      type: "reparation",
      amount: payment.amount,
      paymentMethod: payment.method,
      reference: `Réparation ${repair.typeReparation} - ${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele}`,
      description: payment.note || repair.note,
      vehicleInfo: `${repair.vehicleInfo.immatriculation}`,
      created_at: new Date().toISOString()
    };
    localStorageService.addItemToArray(REPAIR_PAYMENT_DATA_TYPE, treasuryMovement);
  };

  const normalizeRepair = useCallback((repair: Repair) => {
    const normalizedPayments = (repair.payments || []).length > 0
      ? (repair.payments || [])
      : (repair.paye || 0) > 0
        ? [{
            id: `legacy-${repair.id}`,
            amount: repair.paye || 0,
            date: repair.dateReparation,
            method: repair.paymentMethod,
            note: "Paiement initial"
          }]
        : [];
    const { paye, dette } = calculateTotals(repair.cout || 0, normalizedPayments);
    const dueDate = repair.dueDate || getDueDateFromRepairDate(repair.dateReparation);
    const slaTargetDays = repair.slaTargetDays || getSlaTargetDays(repair.typeReparation);
    const operationalStatus = getOperationalStatus(repair.dateReparation, dette, repair.operationalStatus);
    const updates = repair.updates || [createUpdate("Création du dossier de réparation")];

    return {
      ...repair,
      paye,
      dette,
      dueDate,
      slaTargetDays,
      operationalStatus,
      payments: normalizedPayments,
      updates
    };
  }, []);

  const fetchRepairs = useCallback(async () => {
    setLoading(true);
    try {
      const allRepairs = localStorageService.getAll<Repair>(REPAIR_DATA_TYPE);
      const normalized = allRepairs.map((repair) => {
        const nextRepair = normalizeRepair(repair);
        const changed =
          nextRepair.paye !== repair.paye ||
          nextRepair.dette !== repair.dette ||
          nextRepair.dueDate !== repair.dueDate ||
          nextRepair.slaTargetDays !== repair.slaTargetDays ||
          nextRepair.operationalStatus !== repair.operationalStatus ||
          (repair.payments || []).length !== (nextRepair.payments || []).length;
        if (changed) {
          localStorageService.update<Repair>(REPAIR_DATA_TYPE, nextRepair);
        }
        return nextRepair;
      });
      const latestByVehicle = new Map<string, Repair>();
      normalized.forEach((repair) => {
        const existing = latestByVehicle.get(repair.vehicleId);
        if (!existing) {
          latestByVehicle.set(repair.vehicleId, repair);
          return;
        }
        const existingTime = new Date(existing.updated_at).getTime();
        const currentTime = new Date(repair.updated_at).getTime();
        if (currentTime >= existingTime) {
          latestByVehicle.set(repair.vehicleId, repair);
        }
      });
      latestByVehicle.forEach((repair) => {
        syncVehicleStatus(repair.vehicleId, repair.operationalStatus);
      });
      const filteredRepairs = vehicleId ? normalized.filter((r) => r.vehicleId === vehicleId) : normalized;
      setRepairs(filteredRepairs);
    } catch (error) {
      console.error("Error fetching repairs:", error);
      toast({ title: "Erreur", description: "Une erreur s'est produite lors du chargement des réparations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [normalizeRepair, toast, vehicleId]);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  const addRepair = async (repairData: RepairFormData, file: File | null) => {
    setLoading(true);
    try {
      const vehicle = localStorageService.get<Vehicle>(VEHICLE_DATA_TYPE, repairData.vehicleId);
      if (!vehicle) throw new Error("Véhicule introuvable");
      const payments = (repairData.payments || []).filter((payment) => payment.amount > 0);
      const hasLegacyPaid = (repairData.paye || 0) > 0 && payments.length === 0;
      const normalizedPayments = hasLegacyPaid
        ? [{
            id: `${Date.now().toString(36)}-initial`,
            amount: repairData.paye || 0,
            date: repairData.dateReparation,
            method: repairData.paymentMethod,
            note: "Paiement initial"
          }]
        : payments;
      const { paye, dette } = calculateTotals(repairData.cout || 0, normalizedPayments);
      const dueDate = repairData.dueDate || getDueDateFromRepairDate(repairData.dateReparation);
      const operationalStatus = getOperationalStatus(repairData.dateReparation, dette, repairData.operationalStatus);
      const repairToSave = {
        ...repairData,
        paye,
        dette,
        dueDate,
        operationalStatus,
        slaTargetDays: repairData.slaTargetDays || getSlaTargetDays(repairData.typeReparation),
        payments: normalizedPayments,
        updates: [createUpdate("Création du dossier de réparation"), createUpdate(`SLA défini à ${repairData.slaTargetDays || getSlaTargetDays(repairData.typeReparation)} jour(s)`)],
        vehicleInfo: { marque: vehicle.marque || vehicle.brand || "N/A", modele: vehicle.modele || vehicle.model || "N/A", immatriculation: vehicle.immatriculation || vehicle.registration || "N/A" },
        pieceJointe: file ? { fileName: file.name, fileUrl: URL.createObjectURL(file), fileType: file.type } : undefined
      };
      const newRepair = localStorageService.add<Repair>(REPAIR_DATA_TYPE, repairToSave);
      syncVehicleStatus(newRepair.vehicleId, operationalStatus);
      normalizedPayments.forEach((payment) => pushTreasuryPayment(newRepair, payment));
      fetchRepairs();
      const debtMessage = dette > 0 ? ` Une dette de ${dette.toFixed(2)} MAD a été enregistrée.` : "";
      toast({ title: "Succès", description: `Réparation ajoutée avec succès. Le véhicule est maintenant en maintenance.${debtMessage}` });
    } catch (error: any) {
      console.error("=== Error adding repair ===", error);
      toast({ title: "Erreur", description: `Une erreur s'est produite lors de l'ajout de la réparation: ${error?.message || error?.toString()}` });
    } finally {
      setLoading(false);
    }
  };

  const updateRepair = async (id: string, repairData: RepairFormData, file: File | null) => {
    setLoading(true);
    try {
      const vehicle = localStorageService.get<Vehicle>(VEHICLE_DATA_TYPE, repairData.vehicleId);
      if (!vehicle) throw new Error("Véhicule introuvable");

      const existingRepair = localStorageService.get<Repair>(REPAIR_DATA_TYPE, id);
      if (!existingRepair) throw new Error("Réparation introuvable");

      const rawPayments = (repairData.payments || existingRepair.payments || []).filter((payment) => payment.amount > 0);
      const normalizedPayments = rawPayments.length > 0
        ? rawPayments
        : (repairData.paye || existingRepair.paye || 0) > 0
          ? [{
              id: `legacy-${id}`,
              amount: repairData.paye || existingRepair.paye || 0,
              date: repairData.dateReparation,
              method: repairData.paymentMethod,
              note: "Paiement initial"
            }]
          : [];
      const { paye, dette } = calculateTotals(repairData.cout || 0, normalizedPayments);
      const operationalStatus = getOperationalStatus(repairData.dateReparation, dette, repairData.operationalStatus);
      const updateData = {
        ...existingRepair,
        ...repairData,
        paye,
        dette,
        dueDate: repairData.dueDate || existingRepair.dueDate || getDueDateFromRepairDate(repairData.dateReparation),
        slaTargetDays: repairData.slaTargetDays || existingRepair.slaTargetDays || getSlaTargetDays(repairData.typeReparation),
        operationalStatus,
        payments: normalizedPayments,
        updates: [...(existingRepair.updates || []), createUpdate("Mise à jour du dossier de réparation")],
        vehicleInfo: { marque: vehicle.marque || vehicle.brand || "N/A", modele: vehicle.modele || vehicle.model || "N/A", immatriculation: vehicle.immatriculation || vehicle.registration || "N/A" },
        ...(file && { pieceJointe: { fileName: file.name, fileUrl: URL.createObjectURL(file), fileType: file.type } })
      };

      const updatedRepair = localStorageService.update<Repair>(REPAIR_DATA_TYPE, updateData);
      if (!updatedRepair) throw new Error("Réparation introuvable");
      syncVehicleStatus(updatedRepair.vehicleId, operationalStatus);
      fetchRepairs();
      toast({ title: "Mis à jour", description: "Réparation mise à jour avec succès." });
    } catch (error) {
      console.error("Error updating repair:", error);
      toast({ title: "Erreur", description: "Échec de la mise à jour de la réparation.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteRepair = async (id: string) => {
    try {
      const repair = localStorageService.get<Repair>(REPAIR_DATA_TYPE, id);
      const deleted = localStorageService.delete(REPAIR_DATA_TYPE, id);
      if (!deleted) throw new Error("Réparation introuvable");

      if (repair) {
        const otherRepairs = localStorageService.getAll<Repair>(REPAIR_DATA_TYPE).filter((r) => r.id !== id && r.vehicleId === repair.vehicleId);
        if (otherRepairs.length === 0) {
          const contracts = localStorageService.getAll("contracts");
          const hasActiveContract = contracts.some((c: any) => c.vehicleId === repair.vehicleId && ["ouvert", "draft", "sent", "signed"].includes(c.status));
          if (!hasActiveContract) {
            const vehicle = localStorageService.get<Vehicle>(VEHICLE_DATA_TYPE, repair.vehicleId);
            if (vehicle) {
              localStorageService.update<Vehicle>(VEHICLE_DATA_TYPE, { ...vehicle, etat_vehicule: "disponible" });
            }
          }
        }
      }

      fetchRepairs();
      toast({ title: "Supprimé", description: "Réparation supprimée avec succès." });
    } catch (error) {
      console.error("Error deleting repair:", error);
      toast({ title: "Erreur", description: "Échec de la suppression de la réparation.", variant: "destructive" });
    }
  };

  const addRepairPayment = async (
    repairId: string,
    paymentInput: Omit<RepairPayment, "id">,
    options?: { markSettled?: boolean }
  ) => {
    try {
      const repair = localStorageService.get<Repair>(REPAIR_DATA_TYPE, repairId);
      if (!repair) throw new Error("Réparation introuvable");
      const normalizedRepair = normalizeRepair(repair);
      const payment: RepairPayment = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        amount: paymentInput.amount,
        date: paymentInput.date,
        method: paymentInput.method,
        note: paymentInput.note
      };
      const payments = [...(normalizedRepair.payments || []), payment];
      const { paye, dette } = calculateTotals(normalizedRepair.cout, payments);
      const operationalStatus =
        options?.markSettled || dette <= 0
          ? "pret_pour_retour"
          : getOperationalStatus(normalizedRepair.dateReparation, dette, normalizedRepair.operationalStatus);
      const nextRepair: Repair = {
        ...normalizedRepair,
        payments,
        paye,
        dette,
        operationalStatus,
        updates: [...(normalizedRepair.updates || []), createUpdate(`Paiement ajouté: ${payment.amount.toLocaleString()} DH`)]
      };
      const updated = localStorageService.update<Repair>(REPAIR_DATA_TYPE, nextRepair);
      if (!updated) throw new Error("Échec de mise à jour");
      pushTreasuryPayment(nextRepair, payment);
      syncVehicleStatus(nextRepair.vehicleId, operationalStatus);
      fetchRepairs();
      toast({ title: "Paiement enregistré", description: "Le paiement a été ajouté à la réparation." });
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le paiement.", variant: "destructive" });
    }
  };

  const markRepairAsSettled = async (repairId: string) => {
    try {
      const repair = localStorageService.get<Repair>(REPAIR_DATA_TYPE, repairId);
      if (!repair) throw new Error("Réparation introuvable");
      const normalizedRepair = normalizeRepair(repair);
      const remaining = Math.max(0, normalizedRepair.cout - normalizedRepair.paye);
      if (remaining > 0) {
        await addRepairPayment(repairId, {
          amount: remaining,
          date: new Date().toISOString().split("T")[0],
          method: normalizedRepair.paymentMethod,
          note: "Solde automatique"
        }, { markSettled: true });
        return;
      }
      const nextRepair: Repair = {
        ...normalizedRepair,
        operationalStatus: "pret_pour_retour",
        updates: [...(normalizedRepair.updates || []), createUpdate("Dossier marqué comme soldé")]
      };
      localStorageService.update<Repair>(REPAIR_DATA_TYPE, nextRepair);
      syncVehicleStatus(nextRepair.vehicleId, "pret_pour_retour");
      fetchRepairs();
      toast({ title: "Dossier soldé", description: "La réparation est prête pour retour." });
    } catch (error) {
      console.error("Error settling repair:", error);
      toast({ title: "Erreur", description: "Impossible de solder cette réparation.", variant: "destructive" });
    }
  };

  const reactivateVehicle = async (vehicleId: string) => {
    try {
      const vehicle = localStorageService.get<Vehicle>(VEHICLE_DATA_TYPE, vehicleId);
      if (vehicle) {
        localStorageService.update<Vehicle>(VEHICLE_DATA_TYPE, { ...vehicle, etat_vehicule: "disponible" });
        toast({ title: "Succès", description: "Le véhicule a été réactivé et est maintenant disponible. Tous les enregistrements de maintenance sont conservés." });
      }
    } catch (error) {
      console.error("Error reactivating vehicle:", error);
      toast({ title: "Erreur", description: "Impossible de réactiver le véhicule.", variant: "destructive" });
    }
  };

  return {
    repairs,
    loading,
    addRepair,
    updateRepair,
    deleteRepair,
    reactivateVehicle,
    addRepairPayment,
    markRepairAsSettled
  };
};
