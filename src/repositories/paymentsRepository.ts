import { getSupabaseClient } from "@/services/supabaseService";
import type { Payment } from "@/types/payment";

const STORAGE_KEY_LOCAL_PAYMENTS = "iloca:payments:local";

function getLocalPayments(): Payment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_PAYMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(payments: Payment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.warn("Could not save local payments:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const normalizeNotes = (value?: string | null) => (value || "").trim().toLowerCase();

export const paymentsRepository = {
  async getAll(): Promise<Payment[]> {
    const localList = getLocalPayments();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("payments").select("*").order("payment_date", { ascending: false });
        if (!error && data) {
          const remoteList = data.map(row => ({
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

          const remoteIds = new Set(remoteList.map((p) => p.id));
          const combined = [...remoteList, ...localList.filter((p) => !remoteIds.has(p.id))];
          saveLocalPayments(combined);
          return combined.filter((payment) => normalizeNotes(payment.notes) !== "avance initiale");
        }
      }
    } catch (err) {
      console.warn("Error loading payments from Supabase, using local cache:", err);
    }
    return localList.filter((payment) => normalizeNotes(payment.notes) !== "avance initiale");
  },

  async create(payment: Omit<Payment, "id">): Promise<Payment> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
    }

    const now = new Date().toISOString();
    const fallbackPayment: Payment = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`,
      ...payment,
      createdAt: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const insertPayload: Record<string, any> = {
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
        };
        if (userId) insertPayload.user_id = userId;

        const { data, error } = await supabase
          .from("payments")
          .insert([insertPayload])
          .select()
          .single();
        if (!error && data) {
          const saved: Payment = {
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
          };
          const local = getLocalPayments().filter((p) => p.id !== saved.id);
          saveLocalPayments([saved, ...local]);
          return saved;
        }
        if (error) console.warn("Supabase payment insert rejected (storing locally):", error);
      }
    } catch (err) {
      console.warn("Supabase payment create exception (storing locally):", err);
    }

    const currentLocal = getLocalPayments().filter((p) => p.id !== fallbackPayment.id);
    saveLocalPayments([fallbackPayment, ...currentLocal]);
    return fallbackPayment;
  },

  async update(id: string, updates: Partial<Payment>): Promise<Payment> {
    let updatedPayment: Payment | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
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
        if (!error && data) {
          updatedPayment = {
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
          };
        }
      }
    } catch (err) {
      console.warn("Supabase payment update exception:", err);
    }

    const local = getLocalPayments();
    const existing = local.find((p) => p.id === id);
    const now = new Date().toISOString();
    const merged: Payment = updatedPayment || {
      ...(existing || { id, amount: 0, paymentDate: now, paymentMethod: "Espèces" }),
      ...updates,
    };

    const nextLocal = local.map((p) => (p.id === id ? merged : p));
    if (!existing && !updatedPayment) {
      nextLocal.push(merged);
    }
    saveLocalPayments(nextLocal);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("payments").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase payment delete exception:", err);
    }
    const local = getLocalPayments().filter((p) => p.id !== id);
    saveLocalPayments(local);
    return true;
  }
};

