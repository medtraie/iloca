import { useState, useEffect, useCallback } from 'react';
import { Contract } from '@/types/appData';
import { contractsRepository } from '@/repositories/contractsRepository';
import { localStorageService } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';
import { recalculateContractFinancials } from '@/utils/contractFinancialStatus';

export type { Contract };

const isValidPaymentMethod = (value: unknown): value is "Espèces" | "Chèque" | "Virement" => {
  return value === "Espèces" || value === "Chèque" || value === "Virement";
};

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contractsRepository.getAll();
      
      const recalculatedContracts = data.map(contract => {
        const fallbackPaymentMethod = contract.contract_data?.paymentMethod;
        const normalizedPaymentMethod = isValidPaymentMethod(contract.payment_method)
          ? contract.payment_method
          : isValidPaymentMethod(fallbackPaymentMethod)
            ? fallbackPaymentMethod
            : undefined;

        const normalizedContract = normalizedPaymentMethod && contract.payment_method !== normalizedPaymentMethod
          ? { ...contract, payment_method: normalizedPaymentMethod }
          : contract;

        const recalculatedContract = recalculateContractFinancials(normalizedContract);
        
        const shouldUpdate = 
          recalculatedContract.total_amount !== contract.total_amount ||
          !contract.contract_data?.originalAmount ||
          recalculatedContract.contract_data?.extensionAmount !== contract.contract_data?.extensionAmount ||
          recalculatedContract.contract_data?.overdueAmount !== contract.contract_data?.overdueAmount ||
          normalizedContract.payment_method !== contract.payment_method;
          
        if (shouldUpdate) {
          contractsRepository.update(contract.id, {
            total_amount: recalculatedContract.total_amount,
            contract_data: recalculatedContract.contract_data,
            payment_method: normalizedContract.payment_method
          }).catch(console.error);
        }
        
        return recalculatedContract;
      });
      
      setContracts(recalculatedContracts);
    } catch (error) {
      console.error('[useContracts][fetchContracts] Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des contrats",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const addContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      let contractNumber = contractData.contract_number;
      if (!contractNumber || contractNumber.trim() === "") {
        contractNumber = localStorageService.generateContractNumber();
      }

      const contractWithNumber = {
        ...contractData,
        contract_number: contractNumber,
      };

      const newContract = await contractsRepository.create(contractWithNumber);

      const recalculatedContract = recalculateContractFinancials(newContract);
      
      if (recalculatedContract.total_amount !== newContract.total_amount) {
        await contractsRepository.update(recalculatedContract.id, {
          total_amount: recalculatedContract.total_amount,
          contract_data: recalculatedContract.contract_data
        });
      }
      
      setContracts(prev => [recalculatedContract, ...prev]);

      toast({
        title: "Succès",
        description: "Le contrat a été créé avec succès"
      });

      return recalculatedContract;
    } catch (error: any) {
      console.error('[useContracts][addContract] Exception:', error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue lors de l'ajout du contrat: ${error.message || JSON.stringify(error)}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateContract = async (id: string, updates: Partial<Contract>) => {
    try {
      const updatedContract = await contractsRepository.update(id, updates);
      const recalculatedContract = recalculateContractFinancials(updatedContract);
      
      if (recalculatedContract.total_amount !== updatedContract.total_amount ||
          !updatedContract.contract_data?.originalAmount ||
          recalculatedContract.contract_data?.extensionAmount !== updatedContract.contract_data?.extensionAmount ||
          recalculatedContract.contract_data?.overdueAmount !== updatedContract.contract_data?.overdueAmount) {
        await contractsRepository.update(id, {
          total_amount: recalculatedContract.total_amount,
          contract_data: recalculatedContract.contract_data
        });
      }
      
      setContracts(prev => 
        prev.map(contract => 
          contract.id === id ? recalculatedContract : contract
        )
      );

      toast({
        title: "Succès",
        description: "Le contrat a été mis à jour avec succès"
      });

      return recalculatedContract;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du contrat",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteContract = async (id: string) => {
    try {
      await contractsRepository.delete(id);
      setContracts(prev => prev.filter(contract => contract.id !== id));
      toast({
        title: "Succès",
        description: "Le contrat a été supprimé avec succès"
      });
      return true;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du contrat",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return {
    contracts,
    loading,
    addContract,
    updateContract,
    deleteContract,
    refetch: fetchContracts
  };
};
