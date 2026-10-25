import { getSupabaseClient } from "@/services/supabaseService";
import { MiscellaneousExpense } from "@/hooks/useMiscellaneousExpenses";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

const STORAGE_KEY_LOCAL_MISC = "iloca:misc_expenses:local";

function getLocalMisc(userId?: string | null): MiscellaneousExpense[] {
  return getScopedLocalStorage<MiscellaneousExpense>(STORAGE_KEY_LOCAL_MISC, userId);
}

function saveLocalMisc(expenses: MiscellaneousExpense[], userId?: string | null): void {
  saveScopedLocalStorage(STORAGE_KEY_LOCAL_MISC, expenses, userId);
}

export const miscellaneousExpensesRepository = {
  async getAll(): Promise<MiscellaneousExpense[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const localList = getLocalMisc(activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("miscellaneous_expenses")
          .select("*")
          .eq("user_id", activeUserId)
          .order("expense_date", { ascending: false });
        if (!error && data) {
          const remoteList = data as MiscellaneousExpense[];
          saveLocalMisc(remoteList, activeUserId);
          return remoteList;
        }
      }
    } catch (err) {
      console.warn("Error loading misc expenses:", err);
    }
    return localList;
  },

  async create(expense: Omit<MiscellaneousExpense, "id" | "created_at">): Promise<MiscellaneousExpense> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }

    const now = new Date().toISOString();
    const fallbackExpense: MiscellaneousExpense = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `misc-${Date.now()}`,
      ...expense,
      created_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload: Record<string, any> = {
          ...expense,
          user_id: activeUserId,
        };

        const { data, error } = await supabase
          .from("miscellaneous_expenses")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved = data as MiscellaneousExpense;
          const local = getLocalMisc(activeUserId).filter((m) => m.id !== saved.id);
          saveLocalMisc([saved, ...local], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase misc expense create exception (storing locally):", err);
    }

    const currentLocal = getLocalMisc(activeUserId).filter((m) => m.id !== fallbackExpense.id);
    saveLocalMisc([fallbackExpense, ...currentLocal], activeUserId);
    return fallbackExpense;
  },

  async update(id: string, updates: Partial<MiscellaneousExpense>): Promise<MiscellaneousExpense> {
    const activeUserId = getActiveTenantUserId();
    let updatedExpense: MiscellaneousExpense | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("miscellaneous_expenses").update(updates).eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { data, error } = await query.select().single();
        if (!error && data) updatedExpense = data as MiscellaneousExpense;
      }
    } catch (err) {
      console.warn("Supabase misc expense update exception:", err);
    }

    const local = getLocalMisc(activeUserId);
    const existing = local.find((m) => m.id === id);
    const now = new Date().toISOString();
    const merged: MiscellaneousExpense = updatedExpense || {
      ...(existing || { id, title: "", amount: 0, category: "Autre", expense_date: now, payment_method: "Espèces", created_at: now }),
      ...updates,
    };

    const nextLocal = local.map((m) => (m.id === id ? merged : m));
    if (!existing && !updatedExpense) nextLocal.push(merged);
    saveLocalMisc(nextLocal, activeUserId);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("miscellaneous_expenses").delete().eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        await query;
      }
    } catch (err) {
      console.warn("Supabase misc expense delete exception:", err);
    }
    const local = getLocalMisc(activeUserId).filter((m) => m.id !== id);
    saveLocalMisc(local, activeUserId);
    return true;
  }
};
