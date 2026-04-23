
import { useState } from "react";
import { Contract } from "@/hooks/useContracts";

export function useContractDialogs() {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleViewDetails = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsOpen(true);
  };

  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsEditOpen(true);
  };

  return {
    selectedContract,
    setSelectedContract,
    isDetailsOpen,
    setIsDetailsOpen,
    isEditOpen,
    setIsEditOpen,
    handleViewDetails,
    handleEditContract
  };
}
