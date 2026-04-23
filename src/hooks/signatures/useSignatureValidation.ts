
import { useToast } from '@/hooks/use-toast';

export const useSignatureValidation = () => {
  const { toast } = useToast();

  const validateSignatureToken = async (token: string) => {
    try {
      // Mock validation since we removed Supabase
      return {
        token,
        contract_id: 'mock-contract-id',
        contracts: { id: 'mock-contract-id' }
      };
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  return {
    validateSignatureToken
  };
};
