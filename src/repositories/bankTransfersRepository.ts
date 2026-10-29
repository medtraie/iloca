import { getSupabaseClient } from "@/services/supabaseService";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

export interface BankTransfer {
  id: string;
  date: string;
  type: 'cash' | 'check' | 'bank_to_cash';
  amount: number;
  fees: number;
  netAmount: number;
  reference?: string;
  clientName?: string;
  contractNumber?: string;
  checkDate?: string;
  checkDepositDate?: string;
  createdAt?: string;
}

const STORAGE_KEY_LOCAL_TRANSFERS = "iloca:bank_transfers:local";

function getLocalTransfers(userId?: string | null): BankTransfer[] {
  return getScopedLocalStorage<BankTransfer>(STORAGE_KEY_LOCAL_TRANSFERS, userId);
}

function saveLocalTransfers(transfers: BankTransfer[], userId?: string | null): void {
  saveScopedLocalStorage(STORAGE_KEY_LOCAL_TRANSFERS, transfers, userId);
}

export const bankTransfersRepository = {
  async getAll(): Promise<BankTransfer[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const localList = getLocalTransfers(activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("bank_transfers")
          .select("*")
          .eq("user_id", activeUserId)
          .order("date", { ascending: false });
        if (!error && data) {
          const remoteList = data.map(row => ({
            id: row.id,
            date: row.date,
            type: row.type,
            amount: row.amount,
            fees: row.fees,
            netAmount: row.net_amount,
            reference: row.reference,
            clientName: row.client_name,
            contractNumber: row.contract_number,
            checkDate: row.check_date,
            checkDepositDate: row.check_deposit_date,
            createdAt: row.created_at,
          })) as BankTransfer[];

          saveLocalTransfers(remoteList, activeUserId);
          return remoteList;
        }
      }
    } catch (err) {
      console.warn("Error loading bank transfers:", err);
    }
    return localList;
  },

  async create(transfer: Omit<BankTransfer, "id" | "createdAt">): Promise<BankTransfer> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }

    const now = new Date().toISOString();
    const fallbackTransfer: BankTransfer = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bt-${Date.now()}`,
      ...transfer,
      createdAt: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: Record<string, any> = {
          date: transfer.date,
          type: transfer.type,
          amount: transfer.amount,
          fees: transfer.fees,
          net_amount: transfer.netAmount,
          reference: transfer.reference,
          client_name: transfer.clientName,
          contract_number: transfer.contractNumber,
          check_date: transfer.checkDate,
          check_deposit_date: transfer.checkDepositDate,
          user_id: activeUserId,
        };

        const { data, error } = await supabase
          .from("bank_transfers")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved: BankTransfer = {
            id: data.id,
            date: data.date,
            type: data.type,
            amount: data.amount,
            fees: data.fees,
            netAmount: data.net_amount,
            reference: data.reference,
            clientName: data.client_name,
            contractNumber: data.contract_number,
            checkDate: data.check_date,
            checkDepositDate: data.check_deposit_date,
            createdAt: data.created_at,
          };
          const local = getLocalTransfers(activeUserId).filter((t) => t.id !== saved.id);
          saveLocalTransfers([saved, ...local], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase bank transfer insert exception (storing locally):", err);
    }

    const currentLocal = getLocalTransfers(activeUserId).filter((t) => t.id !== fallbackTransfer.id);
    saveLocalTransfers([fallbackTransfer, ...currentLocal], activeUserId);
    return fallbackTransfer;
  },

  async delete(id: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("bank_transfers").delete().eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { error } = await query;
        if (error) {
          console.warn("Supabase bank transfer delete with user_id failed, retrying without filter:", error);
          await supabase.from("bank_transfers").delete().eq("id", id);
        }
      }
    } catch (err) {
      console.warn("Supabase bank transfer delete exception:", err);
    }
    const local = getLocalTransfers(activeUserId).filter((t) => t.id !== id);
    saveLocalTransfers(local, activeUserId);
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOCAL_TRANSFERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((t: any) => t?.id !== id);
          localStorage.setItem(STORAGE_KEY_LOCAL_TRANSFERS, JSON.stringify(filtered));
        }
      }
    } catch (_) {}
    return true;
  }
};
