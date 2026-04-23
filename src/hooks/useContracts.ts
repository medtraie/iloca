import { useState, useEffect } from 'react';
import { localStorageService, Contract } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';
import { recalculateContractFinancials } from '@/utils/contractFinancialStatus';

export type { Contract };

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Force recalculation of all contracts in localStorage (run once on app start)
  const forceRecalculateAllContracts = () => {
    console.log("[useContracts] Force recalculating all contracts...");
    const allContracts = localStorageService.getAll<Contract>('contracts');
    
    const recalculatedContracts = allContracts.map(contract => {
      const recalculatedContract = recalculateContractFinancials(contract);
      
      // Always update to ensure consistency with new calculation logic
      localStorageService.update<Contract>('contracts', contract.id, {
        total_amount: recalculatedContract.total_amount,
        contract_data: recalculatedContract.contract_data
      });
      
      console.log(`[forceRecalculateAllContracts] Contract ${contract.id} recalculated:`, {
        originalAmount: recalculatedContract.contract_data?.originalAmount,
        extensionAmount: recalculatedContract.contract_data?.extensionAmount,
        overdueAmount: recalculatedContract.contract_data?.overdueAmount,
        totalAmount: recalculatedContract.total_amount
      });
      
      return recalculatedContract;
    });

    // Save all recalculated contracts back to localStorage
    localStorage.setItem('contracts', JSON.stringify(recalculatedContracts));
    console.log("[forceRecalculateAllContracts] All contracts force recalculated and saved");
  };

  const fetchContracts = async () => {
    try {
      setLoading(true);
      console.log("[useContracts][fetchContracts] Fetching contracts from localStorage...");
      const data = localStorageService.getAll<Contract>('contracts');
      
      // Recalculate financials for all contracts to ensure data consistency
      const recalculatedContracts = data.map(contract => {
        const recalculatedContract = recalculateContractFinancials(contract);
        
        // Always update if amounts or extension data changed or if original amount is missing
        const shouldUpdate = 
          recalculatedContract.total_amount !== contract.total_amount ||
          !contract.contract_data?.originalAmount ||
          recalculatedContract.contract_data?.extensionAmount !== contract.contract_data?.extensionAmount ||
          recalculatedContract.contract_data?.overdueAmount !== contract.contract_data?.overdueAmount;
          
        if (shouldUpdate) {
          localStorageService.update<Contract>('contracts', contract.id, {
            total_amount: recalculatedContract.total_amount,
            contract_data: recalculatedContract.contract_data
          });
          console.log(`[fetchContracts] Contract ${contract.id} financials updated:`, {
            originalAmount: contract.total_amount,
            newAmount: recalculatedContract.total_amount,
            extensionAmount: recalculatedContract.contract_data?.extensionAmount,
            overdueAmount: recalculatedContract.contract_data?.overdueAmount
          });
        }
        
        return recalculatedContract;
      });
      
      setContracts(recalculatedContracts);
      console.log("[useContracts][fetchContracts] contracts loaded and recalculated:", recalculatedContracts.length);
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
  };

  const addContract = async (contractData: Omit<Contract, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log("[useContracts][addContract] Creating contract with data:", contractData);

      // Use provided contract_number or generate one if not provided
      let contractNumber = contractData.contract_number;
      if (!contractNumber || contractNumber.trim() === "") {
        contractNumber = localStorageService.generateContractNumber();
        console.log("[addContract] Generated contract number:", contractNumber);
      } else {
        console.log("[addContract] Using provided contract number:", contractNumber);
      }

      const contractWithNumber = {
        ...contractData,
        contract_number: contractNumber,
      };

      const newContract = localStorageService.create<Contract>('contracts', contractWithNumber);
      
      // Recalculate financial data immediately after creation
      const recalculatedContract = recalculateContractFinancials(newContract);
      
      // Save the recalculated contract back to localStorage if amounts changed
      if (recalculatedContract.total_amount !== newContract.total_amount) {
        localStorageService.update<Contract>('contracts', recalculatedContract.id, {
          total_amount: recalculatedContract.total_amount,
          contract_data: recalculatedContract.contract_data
        });
        console.log(`[useContracts] New contract ${recalculatedContract.id} amount updated: ${newContract.total_amount} -> ${recalculatedContract.total_amount}`);
      }
      
      setContracts(prev => [recalculatedContract, ...prev]);
      console.log("[useContracts][addContract] Contract added with financial recalculation. Contracts count now:", contracts.length + 1);

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
      const updatedContract = localStorageService.update<Contract>('contracts', id, updates);
      if (!updatedContract) {
        toast({
          title: "Erreur",
          description: "Contrat non trouvé",
          variant: "destructive"
        });
        return null;
      }

      // Recalculer les données financières pour les contrats avec prolongations/retards
      const recalculatedContract = recalculateContractFinancials(updatedContract);
      
      // Always save the recalculated contract back to localStorage to ensure consistency
      if (recalculatedContract.total_amount !== updatedContract.total_amount ||
          !updatedContract.contract_data?.originalAmount ||
          recalculatedContract.contract_data?.extensionAmount !== updatedContract.contract_data?.extensionAmount ||
          recalculatedContract.contract_data?.overdueAmount !== updatedContract.contract_data?.overdueAmount) {
        localStorageService.update<Contract>('contracts', id, {
          total_amount: recalculatedContract.total_amount,
          contract_data: recalculatedContract.contract_data
        });
        console.log(`[useContracts] Contract ${id} financials updated on update:`, {
          originalAmount: updatedContract.total_amount,
          newAmount: recalculatedContract.total_amount,
          extensionAmount: recalculatedContract.contract_data?.extensionAmount,
          overdueAmount: recalculatedContract.contract_data?.overdueAmount
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
      const deleted = localStorageService.delete('contracts', id);
      if (!deleted) {
        toast({
          title: "Erreur",
          description: "Contrat non trouvé",
          variant: "destructive"
        });
        return false;
      }

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
    // Force recalculation on first load to apply new calculation logic
    forceRecalculateAllContracts();
    fetchContracts();
  }, []);

  return {
    contracts,
    loading,
    addContract,
    updateContract,
    deleteContract,
    refetch: fetchContracts
  };
};