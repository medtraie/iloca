
import { useState, useEffect, useCallback } from "react";
import { Repair, RepairFormData, RepairPayment, RepairUpdate } from "@/types/repair";
import { Vehicle } from "@/types/appData";
import { repairsRepository } from "@/repositories/repairsRepository";
import { vehiclesRepository } from "@/repositories/vehiclesRepository";
import { contractsRepository } from "@/repositories/contractsRepository";
import { paymentsRepository } from "@/repositories/paymentsRepository";
import { useToast } from "@/hooks/use-toast";

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

  const syncVehicleStatus = async (vehicleIdToSync: string, operationalStatus?: Repair["operationalStatus"]) => {
    try {
      const vehicles = await vehiclesRepository.listVehicles();
      const vehicle = vehicles.find(v => v.id === vehicleIdToSync);
      if (!vehicle) return;
      await vehiclesRepository.updateVehicle(vehicleIdToSync, {
        etat_vehicule: toVehicleState(operationalStatus)
      });
    } catch (e) {
      console.error("Failed to sync vehicle status", e);
    }
  };

  const pushTreasuryPayment = async (repair: Repair, payment: RepairPayment) => {
    try {
      await paymentsRepository.create({
        repairId: repair.id,
        amount: payment.amount,
        paymentDate: payment.date,
        paymentMethod: payment.method as any,
        customerName: `Réparation: ${repair.typeReparation}`,
        contractNumber: `REP-${repair.vehicleInfo?.registration || repair.vehicleId.slice(0, 8)}`,
        notes: payment.note
      });
    } catch (error) {
      console.error("Failed to push repair payment to treasury", error);
    }
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
      const allRepairs = vehicleId ? await repairsRepository.getByVehicleId(vehicleId) : await repairsRepository.getAll();
      const normalized = await Promise.all(allRepairs.map(async (repair) => {
        const nextRepair = normalizeRepair(repair);
        const changed =
          nextRepair.paye !== repair.paye ||
          nextRepair.dette !== repair.dette ||
          nextRepair.dueDate !== repair.dueDate ||
          nextRepair.slaTargetDays !== repair.slaTargetDays ||
          nextRepair.operationalStatus !== repair.operationalStatus ||
          (repair.payments || []).length !== (nextRepair.payments || []).length;
        if (changed) {
          await repairsRepository.update(repair.id, {
            paye: nextRepair.paye,
            dette: nextRepair.dette,
            dueDate: nextRepair.dueDate,
            slaTargetDays: nextRepair.slaTargetDays,
            operationalStatus: nextRepair.operationalStatus,
            payments: nextRepair.payments,
            updates: nextRepair.updates
          });
        }
        return nextRepair;
      }));
      setRepairs(normalized);
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
      const vehicles = await vehiclesRepository.listVehicles();
      const vehicle = vehicles.find(v => v.id === repairData.vehicleId);
      if (!vehicle) throw new Error("Véhicule introuvable");
      const payments = (repairData.payments || []).filter((payment) => payment.amount > 0);
      const hasLegacyPaid = (repairData.paye || 0) > 0 && payments.length === 0;
      const normalizedPayments = hasLegacyPaid
        ? [{
            id: `${Date.now().toString(36)}-initial`,
            amount: repairData.paye || 0,
            date: repairData.dateReparation,
            method: repairData.paymentMethod as any,
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
      const newRepair = await repairsRepository.create(repairToSave);
      await syncVehicleStatus(newRepair.vehicleId, operationalStatus);
      normalizedPayments.forEach((payment) => pushTreasuryPayment(newRepair, payment));
      await fetchRepairs();
      const debtMessage = dette > 0 ? ` Une dette de ${dette.toFixed(2)} MAD a été enregistrée.` : "";
      toast({ title: "Succès", description: `Réparation ajoutée avec succès. Le véhicule est maintenant en maintenance.${debtMessage}` });
    } catch (error: any) {
      toast({ title: "Erreur", description: `Une erreur s'est produite lors de l'ajout de la réparation: ${error?.message || error?.toString()}` });
    } finally {
      setLoading(false);
    }
  };

  const updateRepair = async (id: string, repairData: RepairFormData, file: File | null) => {
    setLoading(true);
    try {
      const vehicles = await vehiclesRepository.listVehicles();
      const vehicle = vehicles.find(v => v.id === repairData.vehicleId);
      if (!vehicle) throw new Error("Véhicule introuvable");

      const existingRepair = await repairsRepository.getById(id);
      if (!existingRepair) throw new Error("Réparation introuvable");

      const rawPayments = (repairData.payments || existingRepair.payments || []).filter((payment) => payment.amount > 0);
      const normalizedPayments = rawPayments.length > 0
        ? rawPayments
        : (repairData.paye || existingRepair.paye || 0) > 0
          ? [{
              id: `legacy-${id}`,
              amount: repairData.paye || existingRepair.paye || 0,
              date: repairData.dateReparation,
              method: repairData.paymentMethod as any,
              note: "Paiement initial"
            }]
          : [];
      const { paye, dette } = calculateTotals(repairData.cout || 0, normalizedPayments);
      const operationalStatus = getOperationalStatus(repairData.dateReparation, dette, repairData.operationalStatus);
      const updateData = {
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

      const updatedRepair = await repairsRepository.update(id, updateData);
      await syncVehicleStatus(updatedRepair.vehicleId, operationalStatus);
      await fetchRepairs();
      toast({ title: "Mis à jour", description: "Réparation mise à jour avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la mise à jour de la réparation.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const deleteRepair = async (id: string) => {
    try {
      const repair = await repairsRepository.getById(id);
      if (!repair) throw new Error("Réparation introuvable");
      
      await repairsRepository.delete(id);

      const otherRepairs = await repairsRepository.getByVehicleId(repair.vehicleId);
      if (otherRepairs.length === 0) {
        const contracts = await contractsRepository.getAll();
        const hasActiveContract = contracts.some((c: any) => c.vehicleId === repair.vehicleId && ["ouvert", "draft", "sent", "signed"].includes(c.status));
        if (!hasActiveContract) {
          const vehicles = await vehiclesRepository.listVehicles();
          const vehicle = vehicles.find(v => v.id === repair.vehicleId);
          if (vehicle) {
            await vehiclesRepository.updateVehicle(repair.vehicleId, { etat_vehicule: "disponible" });
          }
        }
      }

      await fetchRepairs();
      toast({ title: "Supprimé", description: "Réparation supprimée avec succès." });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la suppression de la réparation.", variant: "destructive" });
    }
  };

  const addRepairPayment = async (
    repairId: string,
    paymentInput: Omit<RepairPayment, "id">,
    options?: { markSettled?: boolean }
  ) => {
    try {
      const repair = await repairsRepository.getById(repairId);
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
      
      const nextRepair = await repairsRepository.update(repairId, {
        payments,
        paye,
        dette,
        operationalStatus,
        updates: [...(normalizedRepair.updates || []), createUpdate(`Paiement ajouté: ${payment.amount.toLocaleString()} DH`)]
      });
      
      pushTreasuryPayment(nextRepair, payment);
      await syncVehicleStatus(nextRepair.vehicleId, operationalStatus);
      await fetchRepairs();
      toast({ title: "Paiement enregistré", description: "Le paiement a été ajouté à la réparation." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajouter le paiement.", variant: "destructive" });
    }
  };

  const markRepairAsSettled = async (repairId: string) => {
    try {
      const repair = await repairsRepository.getById(repairId);
      if (!repair) throw new Error("Réparation introuvable");
      const normalizedRepair = normalizeRepair(repair);
      const remaining = Math.max(0, normalizedRepair.cout - normalizedRepair.paye);
      if (remaining > 0) {
        await addRepairPayment(repairId, {
          amount: remaining,
          date: new Date().toISOString().split("T")[0],
          method: normalizedRepair.paymentMethod as any,
          note: "Solde automatique"
        }, { markSettled: true });
        return;
      }
      
      const nextRepair = await repairsRepository.update(repairId, {
        operationalStatus: "pret_pour_retour",
        updates: [...(normalizedRepair.updates || []), createUpdate("Dossier marqué comme soldé")]
      });
      
      await syncVehicleStatus(nextRepair.vehicleId, "pret_pour_retour");
      await fetchRepairs();
      toast({ title: "Dossier soldé", description: "La réparation est prête pour retour." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de solder cette réparation.", variant: "destructive" });
    }
  };

  const reactivateVehicle = async (vehicleId: string) => {
    try {
      const vehicles = await vehiclesRepository.listVehicles();
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        await vehiclesRepository.updateVehicle(vehicleId, { etat_vehicule: "disponible" });
        toast({ title: "Succès", description: "Le véhicule a été réactivé et est maintenant disponible. Tous les enregistrements de maintenance sont conservés." });
      }
    } catch (error) {
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
