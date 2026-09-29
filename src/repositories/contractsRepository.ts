import { getSupabaseClient } from "@/services/supabaseService";
import { Contract } from "@/types/appData";

const STORAGE_KEY_LOCAL_CONTRACTS = "iloca:contracts:local";

function getLocalContracts(): Contract[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_CONTRACTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalContracts(contracts: Contract[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_CONTRACTS, JSON.stringify(contracts));
  } catch (e) {
    console.warn("Could not save local contracts:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const contractsRepository = {
  async getAll(): Promise<Contract[]> {
    const localList = getLocalContracts();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const remoteList = data as Contract[];
          const remoteIds = new Set(remoteList.map((c) => c.id));
          const combined = [...remoteList, ...localList.filter((c) => !remoteIds.has(c.id))];
          saveLocalContracts(combined);
          return combined;
        }
      }
    } catch (err) {
      console.warn("Error loading contracts from Supabase, using local cache:", err);
    }
    return localList;
  },

  async getById(id: string): Promise<Contract | null> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();
        if (!error && data) return data as Contract;
      }
    } catch (err) {
      console.warn("Error getting contract by ID:", err);
    }
    const local = getLocalContracts();
    return local.find((c) => c.id === id) || null;
  },

  async create(contract: Omit<Contract, "id" | "created_at" | "updated_at">): Promise<Contract> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
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
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const payload: Record<string, any> = { ...contract };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase
          .from("contracts")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved = data as Contract;
          const local = getLocalContracts().filter((c) => c.id !== saved.id);
          saveLocalContracts([saved, ...local]);
          return saved;
        }
        if (error) console.warn("Supabase contract insert rejected (storing locally):", error);
      }
    } catch (err) {
      console.warn("Supabase contract create exception (storing locally):", err);
    }

    const currentLocal = getLocalContracts().filter((c) => c.id !== fallbackContract.id);
    saveLocalContracts([fallbackContract, ...currentLocal]);
    return fallbackContract;
  },

  async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    let updatedContract: Contract | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("contracts")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) {
          updatedContract = data as Contract;
        }
      }
    } catch (err) {
      console.warn("Supabase contract update exception:", err);
    }

    const local = getLocalContracts();
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
    saveLocalContracts(nextLocal);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("contracts").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase contract delete exception:", err);
    }
    const local = getLocalContracts().filter((c) => c.id !== id);
    saveLocalContracts(local);
    return true;
  }
};

