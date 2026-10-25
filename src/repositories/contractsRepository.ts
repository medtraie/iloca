import { getSupabaseClient } from "@/services/supabaseService";
import { Contract } from "@/types/appData";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

const STORAGE_KEY_LOCAL_CONTRACTS = "iloca:contracts:local";

function getLocalContracts(userId?: string | null): Contract[] {
  return getScopedLocalStorage<Contract>(STORAGE_KEY_LOCAL_CONTRACTS, userId);
}

function saveLocalContracts(contracts: Contract[], userId?: string | null): void {
  saveScopedLocalStorage(STORAGE_KEY_LOCAL_CONTRACTS, contracts, userId);
}

export const contractsRepository = {
  async getAll(): Promise<Contract[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const localList = getLocalContracts(activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("contracts")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false });
        if (!error && data) {
          const remoteList = data as Contract[];
          saveLocalContracts(remoteList, activeUserId);
          return remoteList;
        }
      }
    } catch (err) {
      console.warn("Error loading contracts from Supabase, using local cache:", err);
    }
    return localList;
  },

  async getById(id: string): Promise<Contract | null> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("contracts").select("*").eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { data, error } = await query.single();
        if (!error && data) return data as Contract;
      }
    } catch (err) {
      console.warn("Error getting contract by ID:", err);
    }
    const local = getLocalContracts(activeUserId);
    return local.find((c) => c.id === id) || null;
  },

  async create(contract: Omit<Contract, "id" | "created_at" | "updated_at">): Promise<Contract> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }

    const now = new Date().toISOString();
    const fallbackContract: Contract = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `cnt-${Date.now()}`,
      ...contract,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: Record<string, any> = {
          ...contract,
          user_id: activeUserId,
        };

        const { data, error } = await supabase
          .from("contracts")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved = data as Contract;
          const local = getLocalContracts(activeUserId).filter((c) => c.id !== saved.id);
          saveLocalContracts([saved, ...local], activeUserId);
          return saved;
        }
        if (error) console.warn("Supabase contract insert rejected (storing locally):", error);
      }
    } catch (err) {
      console.warn("Supabase contract create exception (storing locally):", err);
    }

    const currentLocal = getLocalContracts(activeUserId).filter((c) => c.id !== fallbackContract.id);
    saveLocalContracts([fallbackContract, ...currentLocal], activeUserId);
    return fallbackContract;
  },

  async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    const activeUserId = getActiveTenantUserId();
    let updatedContract: Contract | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("contracts").update(updates).eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { data, error } = await query.select().single();
        if (!error && data) {
          updatedContract = data as Contract;
        }
      }
    } catch (err) {
      console.warn("Supabase contract update exception:", err);
    }

    const local = getLocalContracts(activeUserId);
    const existing = local.find((c) => c.id === id);
    const now = new Date().toISOString();
    const merged: Contract = updatedContract || {
      ...(existing || { id, contract_number: "", vehicle_id: "", client_id: "", start_date: "", end_date: "", total_amount: 0, status: "actif", created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((c) => (c.id === id ? merged : c));
    if (!existing && !updatedContract) {
      nextLocal.push(merged);
    }
    saveLocalContracts(nextLocal, activeUserId);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("contracts").delete().eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        await query;
      }
    } catch (err) {
      console.warn("Supabase contract delete exception:", err);
    }
    const local = getLocalContracts(activeUserId).filter((c) => c.id !== id);
    saveLocalContracts(local, activeUserId);
    return true;
  }
};
