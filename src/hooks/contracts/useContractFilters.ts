
import { useState } from "react";
import { Contract } from "@/hooks/useContracts";
import { getUIStatus } from "@/utils/contractTransform";
import { 
  filterContractsByFinancialStatus, 
  filterContractsByFinancialStatusWithPayments,
  FinancialStatus 
} from "@/utils/contractFinancialStatus";

interface PaymentSummary {
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  payments: any[];
}

export function useContractFilters(
  contracts: Contract[],
  getPaymentSummary?: (contractId: string) => PaymentSummary
) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ouvert" | "ferme">("all");
  const [financialStatusFilter, setFinancialStatusFilter] = useState<"all" | FinancialStatus>("all");

  // Filtrer d'abord par terme de recherche
  let filtered = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    return contract.customer_name.toLowerCase().includes(searchLower) ||
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.vehicle.toLowerCase().includes(searchLower);
  });

  // LOGIQUE DE FILTRAGE PRIORITAIRE:
  // 1. Si un filtre financier est sélectionné (en_cours, paye, etc.) → Ignorer complètement le filtre ouvert/fermé
  // 2. Sinon, appliquer le filtre ouvert/fermé si sélectionné
  
  let filteredContracts: Contract[];
  
  // CAS 1: Filtre financier actif → Il a la priorité absolue, ignore le statut ouvert/fermé
  if (financialStatusFilter !== "all") {
    if (getPaymentSummary) {
      filteredContracts = filterContractsByFinancialStatusWithPayments(
        filtered, 
        financialStatusFilter,
        getPaymentSummary
      );
    } else {
      filteredContracts = filterContractsByFinancialStatus(filtered, financialStatusFilter);
    }
  } 
  // CAS 2: Pas de filtre financier, mais filtre statut actif
  else if (statusFilter !== "all") {
    filtered = filtered.filter(contract => {
      const uiStatus = getUIStatus(contract.status);
      
      if (statusFilter === "ferme") {
        const isClosedStatus = contract.status === "ferme" || contract.status === "completed";
        return isClosedStatus;
      }
      
      if (statusFilter === "ouvert") return uiStatus === "ouvert";
      return true;
    });
    
    // Appliquer le filtre financier "all" sur les contrats déjà filtrés par statut
    if (getPaymentSummary) {
      filteredContracts = filterContractsByFinancialStatusWithPayments(
        filtered, 
        "all",
        getPaymentSummary
      );
    } else {
      filteredContracts = filtered;
    }
  }
  // CAS 3: Aucun filtre actif → Afficher tous les contrats
  else {
    filteredContracts = filtered;
  }

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    financialStatusFilter,
    setFinancialStatusFilter,
    filteredContracts
  };
}
