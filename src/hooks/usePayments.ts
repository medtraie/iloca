import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Payment, PaymentSummary } from "@/types/payment";
import { Contract } from "@/hooks/useContracts";
import { getContractSummaryWithPayments } from "@/utils/contractMath";

export function usePayments() {
  const [payments] = useLocalStorage<Payment[]>("payments", []);

  // Calculate payment summary for a contract using centralized logic
  const getContractPaymentSummary = (contractId: string, contracts: Contract[]): PaymentSummary => {
    const summary = getContractSummaryWithPayments(contractId, contracts);
    return {
      totalPaid: summary.avance,
      remainingAmount: summary.reste,
      isFullyPaid: summary.isFullyPaid,
      payments: summary.payments
    };
  };

  return {
    payments,
    getContractPaymentSummary
  };
}