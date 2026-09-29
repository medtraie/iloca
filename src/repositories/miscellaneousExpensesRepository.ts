import { getSupabaseClient } from "@/services/supabaseService";
import { MiscellaneousExpense } from "@/hooks/useMiscellaneousExpenses";

const STORAGE_KEY_LOCAL_MISC = "iloca:misc_expenses:local";

function getLocalMisc(): MiscellaneousExpense[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_MISC);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMisc(expenses: MiscellaneousExpense[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_LOCAL_MISC, JSON.stringify(expenses));
  } catch (e) {
    console.warn("Could not save local misc expenses:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const miscellaneousExpensesRepository = {
  async getAll(): Promise<MiscellaneousExpense[]> {
    const localList = getLocalMisc();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("miscellaneous_expenses").select("*").order("expense_date", { ascending: false });
        if (!error && data) {
          const remoteList = data as MiscellaneousExpense[];
          const remoteIds = new Set(remoteList.map((m) => m.id));
          const combined = [...remoteList, ...localList.filter((m) => !remoteIds.has(m.id))];
          saveLocalMisc(combined);
          return combined;
        }
      }
    } catch (err) {
      console.warn("Error loading misc expenses:", err);
    }
    return localList;
  },

  async create(expense: Omit<MiscellaneousExpense, "id" | "created_at">): Promise<MiscellaneousExpense> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
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
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const payload: Record<string, any> = { ...expense };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase
          .from("miscellaneous_expenses")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved = data as MiscellaneousExpense;
          const local = getLocalMisc().filter((m) => m.id !== saved.id);
          saveLocalMisc([saved, ...local]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase misc expense create exception (storing locally):", err);
    }

    const currentLocal = getLocalMisc().filter((m) => m.id !== fallbackExpense.id);
    saveLocalMisc([fallbackExpense, ...currentLocal]);
    return fallbackExpense;
  },

  async update(id: string, updates: Partial<MiscellaneousExpense>): Promise<MiscellaneousExpense> {
    let updatedExpense: MiscellaneousExpense | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("miscellaneous_expenses")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (!error && data) updatedExpense = data as MiscellaneousExpense;
      }
    } catch (err) {
      console.warn("Supabase misc expense update exception:", err);
    }

    const local = getLocalMisc();
    const existing = local.find((m) => m.id === id);
    const now = new Date().toISOString();
    const merged: MiscellaneousExpense = updatedExpense || {
      ...(existing || { id, title: "", amount: 0, category: "Autre", expense_date: now, payment_method: "Espèces", created_at: now }),
      ...updates,
    };

    const nextLocal = local.map((m) => (m.id === id ? merged : m));
    if (!existing && !updatedExpense) nextLocal.push(merged);
    saveLocalMisc(nextLocal);
    return merged;
  },

  async delete(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("miscellaneous_expenses").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase misc expense delete exception:", err);
    }
    const local = getLocalMisc().filter((m) => m.id !== id);
    saveLocalMisc(local);
    return true;
  }
};

