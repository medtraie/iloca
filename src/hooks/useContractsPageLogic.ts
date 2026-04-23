
import { useContracts } from "@/hooks/useContracts";
import { useContractFilters } from "@/hooks/contracts/useContractFilters";
import { useContractActions } from "@/hooks/contracts/useContractActions";
import { useContractDialogs } from "@/hooks/contracts/useContractDialogs";
import { usePayments } from "@/hooks/usePayments";

export interface UseContractsPageLogicReturn {
  contracts: any[];
  loading: boolean;
  filteredContracts: any[];
  statusFilter: "all" | "ouvert" | "ferme";
  setStatusFilter: (v: "all" | "ouvert" | "ferme") => void;
  financialStatusFilter: any;
  setFinancialStatusFilter: (v: any) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  handleAddContract: (data: any) => Promise<void>;
  handleDeleteContract: (id: string) => Promise<void>;
  handleViewDetails: (contract: any) => void;
  handleEditContract: (contract: any) => void;
  handleSaveContract: (updated: any) => Promise<void>;
  handleSendForSignature: (contract: any) => Promise<void>;
  selectedContract: any | null;
  setSelectedContract: (x: any | null) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (x: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (x: boolean) => void;
  signatureLoading: Record<string, boolean>;
  getPaymentSummary: (contractId: string) => any;
}

export function useContractsPageLogic(): UseContractsPageLogicReturn {
  const { contracts, loading } = useContracts();
  const { getContractPaymentSummary } = usePayments();
  
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    financialStatusFilter,
    setFinancialStatusFilter,
    filteredContracts
  } = useContractFilters(contracts, (contractId: string) => getContractPaymentSummary(contractId, contracts));

  const {
    handleAddContract,
    handleDeleteContract,
    handleSaveContract,
    handleSendForSignature,
    signatureLoading
  } = useContractActions();

  const {
    selectedContract,
    setSelectedContract,
    isDetailsOpen,
    setIsDetailsOpen,
    isEditOpen,
    setIsEditOpen,
    handleViewDetails,
    handleEditContract
  } = useContractDialogs();

  return {
    contracts,
    loading,
    filteredContracts,
    statusFilter,
    setStatusFilter,
    financialStatusFilter,
    setFinancialStatusFilter,
    searchTerm,
    setSearchTerm,
    handleAddContract,
    handleDeleteContract,
    handleViewDetails,
    handleEditContract,
    handleSaveContract,
    handleSendForSignature,
    selectedContract,
    setSelectedContract,
    isDetailsOpen,
    setIsDetailsOpen,
    isEditOpen,
    setIsEditOpen,
    signatureLoading,
    getPaymentSummary: (contractId: string) => getContractPaymentSummary(contractId, contracts),
  };
}
