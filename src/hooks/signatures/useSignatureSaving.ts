
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useSignatureSaving = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const saveSignature = async (
    contractId: string,
    token: string,
    signatureData: string,
    signerName: string,
    signerEmail: string,
    signatureType: "delivery" | "return" = "delivery"
  ) => {
    try {
      setLoading(true);

      // Mock signature saving
      const signature = {
        id: Date.now().toString(),
        contract_id: contractId,
        signature_data: signatureData,
        signer_name: signerName,
        signer_email: signerEmail,
        ip_address: null,
        user_agent: navigator.userAgent,
        signature_type: signatureType,
        signature_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      toast({
        title: "تم بنجاح",
        description: "تم حفظ التوقيع بنجاح"
      });

      return signature;
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التوقيع",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    saveSignature
  };
};
