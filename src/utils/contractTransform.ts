
import { Contract } from "@/hooks/useContracts";

export interface NewDialogContract {
  customerName: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate?: number;
  totalAmount: string;
  status: string;
  statusColor?: string;
  paymentMethod?: string;
  notes?: string;
  contractNumber?: string;
  advance_payment?: number; // CRITICAL: Add advance payment field
  // CRITICAL: Interactive data preservation
  delivery_fuel_level?: number;
  return_fuel_level?: number;
  delivery_damages?: Array<{id: string; x: number; y: number}>;
  return_damages?: Array<{id: string; x: number; y: number}>;
  contract_data?: any;
}

// Convert user dialog data to Contract data for Supabase
export function convertFromNewDialogContract(dialogContract: NewDialogContract): Omit<Contract, 'id' | 'created_at' | 'updated_at'> {
  let totalAmountNumber = 0;
  if (typeof dialogContract.totalAmount === 'string') {
    totalAmountNumber = Number(dialogContract.totalAmount.replace(/[^0-9.]/g, ""));
  } else {
    totalAmountNumber = Number(dialogContract.totalAmount) || 0;
  }

  let normalizedStatus: Contract['status'] = 'ouvert';
  const rawStatus = dialogContract.status ? dialogContract.status.toLowerCase() : '';
  if (["draft", "مسودة", "ouvert", "open"].includes(rawStatus)) normalizedStatus = "ouvert";
  else if (["completed", "مكتمل", "ferme", "fermé", "closed"].includes(rawStatus)) normalizedStatus = "ferme";
  else if (["sent", "مرسل"].includes(rawStatus)) normalizedStatus = "sent";
  else if (["signed", "موقع"].includes(rawStatus)) normalizedStatus = "signed";
  else if (["cancelled", "ملغي"].includes(rawStatus)) normalizedStatus = "cancelled";

  function fixEmptyValue<T>(val: T | "" | undefined | null): T | null {
    return val === undefined || val === "" ? null : val;
  }

  let dailyRate: number | null = null;
  if (typeof dialogContract.dailyRate === "number") {
    dailyRate = dialogContract.dailyRate;
  } else if (typeof dialogContract.dailyRate === "string" && dialogContract.dailyRate !== "") {
    dailyRate = Number(dialogContract.dailyRate);
    if (isNaN(dailyRate)) dailyRate = null;
  }

  const contract_number = dialogContract.contractNumber
    ? dialogContract.contractNumber.trim()
    : "";

  return {
    contract_number,
    customer_name: dialogContract.customerName,
    customer_phone: fixEmptyValue(dialogContract.customerPhone),
    customer_email: null,
    customer_national_id: fixEmptyValue(dialogContract.customerNationalId),
    vehicle: dialogContract.vehicle,
    start_date: dialogContract.startDate,
    end_date: dialogContract.endDate,
    daily_rate: dailyRate,
    total_amount: totalAmountNumber,
    advance_payment: dialogContract.advance_payment || 0, // CRITICAL: Include advance payment
    status: normalizedStatus,
    payment_method: dialogContract.paymentMethod === 'Espèces' || dialogContract.paymentMethod === 'Chèque' || dialogContract.paymentMethod === 'Virement' 
      ? dialogContract.paymentMethod as 'Espèces' | 'Chèque' | 'Virement' 
      : undefined,
    notes: fixEmptyValue(dialogContract.notes),
    // CRITICAL: Preserve interactive data
    delivery_fuel_level: dialogContract.delivery_fuel_level,
    return_fuel_level: dialogContract.return_fuel_level,
    delivery_damages: dialogContract.delivery_damages,
    return_damages: dialogContract.return_damages,
    contract_data: dialogContract.contract_data,
  };
}

// Helper to map database status to UI status
export function getUIStatus(status: Contract["status"]) {
  if (status === "ouvert" || status === "draft" || status === "sent" || status === "signed") return "ouvert";
  if (status === "ferme" || status === "completed") return "ferme";
  if (status === "cancelled") return "cancelled";
  return "ouvert"; // Default to ouvert for any unknown status
}
