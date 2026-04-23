
import { useState, useEffect } from "react";

export interface DigitalSignature {
  id: string;
  contract_id: string;
  signature_data: string;
  signer_name: string;
  signer_email: string;
  signature_date: string;
  user_agent?: string;
  signature_type: string;
  created_at: string;
}

export function useContractSignatures(contractId?: string | null) {
  const [signatures, setSignatures] = useState<DigitalSignature[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contractId) {
      setSignatures([]);
      return;
    }
    
    setLoading(true);
    // Mock signatures data since we removed Supabase
    const mockSignatures: DigitalSignature[] = [];
    setSignatures(mockSignatures);
    setLoading(false);
  }, [contractId]);

  return { signatures, loading };
}
