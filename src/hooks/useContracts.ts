import { useState, useEffect, useCallback } from 'react';
import { Contract } from '@/types/appData';
import { contractsRepository } from '@/repositories/contractsRepository';
import { paymentsRepository } from '@/repositories/paymentsRepository';
import { localStorageService } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';
import { recalculateContractFinancials } from '@/utils/contractFinancialStatus';

export type { Contract };

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contractsRepository.getAll();
      
      const recalculatedContracts = data.map(contract => {
        const recalculatedContract = recalculateContractFinancials(contract);
        
        const shouldUpdate = 
          recalculatedContract.total_amount !== contract.total_amount ||
          !contract.contract_data?.originalAmount ||
          recalculatedContract.contract_data?.extensionAmount !== contract.contract_data?.extensionAmount ||
          recalculatedContract.contract_data?.overdueAmount !== contract.contract_data?.overdueAmount;
          
        if (shouldUpdate) {
          contractsRepository.update(contract.id, {
            total_amount: recalculatedContract.total_amount,
            contract_data: recalculatedContract.contract_data
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

      // Create initial payment if advance_payment > 0
      if (newContract.advance_payment && newContract.advance_payment > 0) {
        try {
          // #region debug-point addContract-payment
          fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"contracts-avance-recette",runId:"pre-fix",hypothesisId:"H2",location:"useContracts.ts:addContract",msg:"[DEBUG] Attempting initial payment creation",data:{contractId:newContract.id,amount:newContract.advance_payment,method:contractData.payment_method},ts:Date.now()})}).catch(()=>{});
          // #endregion
          
          await paymentsRepository.create({
            contractId: newContract.id,
            contractNumber: newContract.contract_number,
            customerName: newContract.customer_name,
            amount: newContract.advance_payment,
            paymentMethod: (contractData.payment_method as any) || 'Espèces',
            paymentDate: newContract.start_date ? newContract.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: 'Avance initiale',
            createdAt: new Date().toISOString()
          });
          
          // #region debug-point addContract-payment-success
          fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"contracts-avance-recette",runId:"pre-fix",hypothesisId:"H2",location:"useContracts.ts:addContract",msg:"[DEBUG] Initial payment created successfully",data:{contractId:newContract.id},ts:Date.now()})}).catch(()=>{});
          // #endregion
        } catch (paymentError: any) {
          console.error('[useContracts][addContract] Error creating initial payment:', paymentError);
          // #region debug-point addContract-payment-error
          fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"contracts-avance-recette",runId:"pre-fix",hypothesisId:"H2",location:"useContracts.ts:addContract",msg:"[DEBUG] Error creating initial payment",data:{error:paymentError.message||String(paymentError)},ts:Date.now()})}).catch(()=>{});
          // #endregion
        }
      }

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
