import { getSupabaseClient } from "@/services/supabaseService";
import type { Payment } from "@/types/payment";

export const paymentsRepository = {
  async getAll(): Promise<Payment[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("payments").select("*").order("payment_date", { ascending: false });
    if (error) throw error;
    
    return data.map(row => ({
      id: row.id,
      contractId: row.contract_id,
      repairId: row.repair_id,
      amount: row.amount,
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
      customerName: row.customer_name,
      contractNumber: row.contract_number,
      checkReference: row.check_reference,
      checkName: row.check_name,
      checkDepositDate: row.check_deposit_date,
      checkDepositStatus: row.check_deposit_status,
      checkDirection: row.check_direction,
      checkReturnReason: row.check_return_reason,
      checkReturnDate: row.check_return_date,
      partiallyCollectedAmount: row.partially_collected_amount,
      relanceLevel: row.relance_level,
      relanceHistory: row.relance_history || [],
      auditTrail: row.audit_trail || [],
      createdAt: row.created_at,
      notes: row.notes,
    })) as Payment[];
  },

  async create(payment: Omit<Payment, "id">): Promise<Payment> {
    const supabase = getSupabaseClient();
    const { data: authData } = await supabase.auth.getUser();
    
    // #region debug-point A:payments-create-payload
    fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"recette-payment-refresh",runId:"pre-fix",hypothesisId:"A",location:"paymentsRepository.ts:create",msg:"[DEBUG] paymentsRepository create payload",data:{authUserId:authData.user?.id||null,contractId:payment.contractId||null,contractNumber:payment.contractNumber,amount:payment.amount,paymentMethod:payment.paymentMethod},ts:Date.now()})}).catch(()=>{});
    // #endregion
    const { data, error } = await supabase
      .from("payments")
      .insert([{
        user_id: authData.user?.id,
        contract_id: payment.contractId,
        repair_id: payment.repairId,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_method: payment.paymentMethod,
        customer_name: payment.customerName,
        contract_number: payment.contractNumber,
        check_reference: payment.checkReference,
        check_name: payment.checkName,
        check_deposit_date: payment.checkDepositDate,
        check_deposit_status: payment.checkDepositStatus,
        check_direction: payment.checkDirection,
        check_return_reason: payment.checkReturnReason,
        check_return_date: payment.checkReturnDate,
        partially_collected_amount: payment.partiallyCollectedAmount,
        relance_level: payment.relanceLevel,
        relance_history: payment.relanceHistory || [],
        audit_trail: payment.auditTrail || [],
        notes: payment.notes,
      }])
      .select()
      .single();
    // #region debug-point D:payments-create-response
    fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"recette-payment-refresh",runId:"pre-fix",hypothesisId:"D",location:"paymentsRepository.ts:create",msg:"[DEBUG] paymentsRepository create response",data:{hasData:Boolean(data),errorMessage:error?.message||null,errorCode:error?.code||null,errorHint:error?.hint||null},ts:Date.now()})}).catch(()=>{});
    // #endregion
    if (error) throw error;
    
    return {
      id: data.id,
      contractId: data.contract_id,
      repairId: data.repair_id,
      amount: data.amount,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      customerName: data.customer_name,
      contractNumber: data.contract_number,
      checkReference: data.check_reference,
      checkName: data.check_name,
      checkDepositDate: data.check_deposit_date,
      checkDepositStatus: data.check_deposit_status,
      checkDirection: data.check_direction,
      checkReturnReason: data.check_return_reason,
      checkReturnDate: data.check_return_date,
      partiallyCollectedAmount: data.partially_collected_amount,
      relanceLevel: data.relance_level,
      relanceHistory: data.relance_history || [],
      auditTrail: data.audit_trail || [],
      createdAt: data.created_at,
      notes: data.notes,
    } as Payment;
  },

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    const supabase = getSupabaseClient();
    const payload: any = {};
    if (updates.contractId !== undefined) payload.contract_id = updates.contractId;
    if (updates.repairId !== undefined) payload.repair_id = updates.repairId;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.paymentDate !== undefined) payload.payment_date = updates.paymentDate;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
    if (updates.contractNumber !== undefined) payload.contract_number = updates.contractNumber;
    if (updates.checkReference !== undefined) payload.check_reference = updates.checkReference;
    if (updates.checkName !== undefined) payload.check_name = updates.checkName;
    if (updates.checkDepositDate !== undefined) payload.check_deposit_date = updates.checkDepositDate;
    if (updates.checkDepositStatus !== undefined) payload.check_deposit_status = updates.checkDepositStatus;
    if (updates.checkDirection !== undefined) payload.check_direction = updates.checkDirection;
    if (updates.checkReturnReason !== undefined) payload.check_return_reason = updates.checkReturnReason;
    if (updates.checkReturnDate !== undefined) payload.check_return_date = updates.checkReturnDate;
    if (updates.partiallyCollectedAmount !== undefined) payload.partially_collected_amount = updates.partiallyCollectedAmount;
    if (updates.relanceLevel !== undefined) payload.relance_level = updates.relanceLevel;
    if (updates.relanceHistory !== undefined) payload.relance_history = updates.relanceHistory;
    if (updates.auditTrail !== undefined) payload.audit_trail = updates.auditTrail;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const { data, error } = await supabase
      .from("payments")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      contractId: data.contract_id,
      repairId: data.repair_id,
      amount: data.amount,
      paymentDate: data.payment_date,
      paymentMethod: data.payment_method,
      customerName: data.customer_name,
      contractNumber: data.contract_number,
      checkReference: data.check_reference,
      checkName: data.check_name,
      checkDepositDate: data.check_deposit_date,
      checkDepositStatus: data.check_deposit_status,
      checkDirection: data.check_direction,
      checkReturnReason: data.check_return_reason,
      checkReturnDate: data.check_return_date,
      partiallyCollectedAmount: data.partially_collected_amount,
      relanceLevel: data.relance_level,
      relanceHistory: data.relance_history || [],
      auditTrail: data.audit_trail || [],
      createdAt: data.created_at,
      notes: data.notes,
    } as Payment;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
