import { useState, useEffect } from "react";
import type { Payment, PaymentSummary } from "@/types/payment";
import { Contract } from "@/hooks/useContracts";
import { paymentsRepository } from "@/repositories/paymentsRepository";
import { getContractSummaryWithPayments } from "@/utils/contractMath";

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentsRepository.getAll();
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // Calculate payment summary for a contract using centralized logic
  const getContractPaymentSummary = (contractId: string, contracts: Contract[]): PaymentSummary => {
    const summary = getContractSummaryWithPayments(contractId, contracts, payments);
    if (!summary) return { totalPaid: 0, remainingAmount: 0, isFullyPaid: false, payments: [] };
    
    return {
      totalPaid: summary.avance,
      remainingAmount: summary.reste,
      isFullyPaid: summary.isFullyPaid,
      payments: summary.payments
    };
  };

  return {
    payments,
    loading,
    getContractPaymentSummary,
    refetch: fetchPayments
  };
}
