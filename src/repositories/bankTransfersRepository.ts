import { getSupabaseClient } from "@/services/supabaseService";

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

function getLocalTransfers(): BankTransfer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_TRANSFERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransfers(transfers: BankTransfer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_TRANSFERS, JSON.stringify(transfers));
  } catch (e) {
    console.warn("Could not save local transfers:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const bankTransfersRepository = {
  async getAll(): Promise<BankTransfer[]> {
    const localList = getLocalTransfers();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("bank_transfers").select("*").order("date", { ascending: false });
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

          const remoteIds = new Set(remoteList.map((t) => t.id));
          const combined = [...remoteList, ...localList.filter((t) => !remoteIds.has(t.id))];
          saveLocalTransfers(combined);
          return combined;
        }
      }
    } catch (err) {
      console.warn("Error loading bank transfers:", err);
    }
    return localList;
  },

  async create(transfer: Omit<BankTransfer, "id" | "createdAt">): Promise<BankTransfer> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
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
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

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
        };
        if (userId) payload.user_id = userId;

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
          const local = getLocalTransfers().filter((t) => t.id !== saved.id);
          saveLocalTransfers([saved, ...local]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase bank transfer insert exception (storing locally):", err);
    }

    const currentLocal = getLocalTransfers().filter((t) => t.id !== fallbackTransfer.id);
    saveLocalTransfers([fallbackTransfer, ...currentLocal]);
    return fallbackTransfer;
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("bank_transfers").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase bank transfer delete exception:", err);
    }
    const local = getLocalTransfers().filter((t) => t.id !== id);
    saveLocalTransfers(local);
    return true;
  }
};

