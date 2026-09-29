import { getSupabaseClient } from "@/services/supabaseService";
import { Expense, MonthlyExpense, ExpenseBudget, ExpenseAuditLog } from "@/types/expense";

const STORAGE_KEY_EXPENSES = "iloca:expenses:local";
const STORAGE_KEY_MONTHLY_EXPENSES = "iloca:monthly_expenses:local";
const STORAGE_KEY_BUDGETS = "iloca:budgets:local";

function getLocalData<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalData<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Could not save local data for ${key}:`, e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const buildExpenseWritePayload = (expense: Partial<Expense>) => ({
  vehicle_id: expense.vehicle_id,
  type: expense.type,
  total_cost: expense.total_cost,
  start_date: expense.start_date,
  end_date: expense.end_date,
  period_months: expense.period_months,
  monthly_cost: expense.monthly_cost,
  document_url: expense.document_url ?? null,
  notes: expense.notes ?? null,
  tags: expense.tags ?? [],
  recurring_enabled: Boolean(expense.recurring_enabled),
  recurring_frequency: expense.recurring_frequency ?? "yearly",
  archived: Boolean(expense.archived),
  parent_expense_id: expense.parent_expense_id ?? null,
  next_due_date: expense.next_due_date ?? null,
});

const buildExpenseUpdatePayload = (expense: Partial<Expense>) =>
  Object.fromEntries(
    Object.entries(buildExpenseWritePayload(expense)).filter(([, value]) => value !== undefined)
  );

export const expensesRepository = {
  async getAllExpenses(): Promise<Expense[]> {
    const localList = getLocalData<Expense>(STORAGE_KEY_EXPENSES);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
        if (!error && data) {
          const remoteList = data as Expense[];
          const remoteIds = new Set(remoteList.map((e) => e.id));
          const combined = [...remoteList, ...localList.filter((e) => !remoteIds.has(e.id))];
          saveLocalData(STORAGE_KEY_EXPENSES, combined);
          return combined;
        }
      }
    } catch (err) {
      console.warn("Error loading expenses from Supabase, using local cache:", err);
    }
    return localList;
  },

  async createExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
    }

    const now = new Date().toISOString();
    const fallbackExpense: Expense = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `exp-${Date.now()}`,
      ...expense,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const payload: Record<string, any> = { ...buildExpenseWritePayload(expense) };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase.from("expenses").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as Expense;
          const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES).filter((e) => e.id !== saved.id);
          saveLocalData(STORAGE_KEY_EXPENSES, [saved, ...local]);
          return saved;
        }
        if (error) console.warn("Supabase expense insert rejected (storing locally):", error);
      }
    } catch (err) {
      console.warn("Supabase expense create exception (storing locally):", err);
    }

    const currentLocal = getLocalData<Expense>(STORAGE_KEY_EXPENSES).filter((e) => e.id !== fallbackExpense.id);
    saveLocalData(STORAGE_KEY_EXPENSES, [fallbackExpense, ...currentLocal]);
    return fallbackExpense;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    let updatedExpense: Expense | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const payload = buildExpenseUpdatePayload(updates);
        const { data, error } = await supabase.from("expenses").update(payload).eq("id", id).select().single();
        if (!error && data) {
          updatedExpense = data as Expense;
        }
      }
    } catch (err) {
      console.warn("Supabase expense update exception:", err);
    }

    const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES);
    const existing = local.find((e) => e.id === id);
    const now = new Date().toISOString();
    const merged: Expense = updatedExpense || {
      ...(existing || { id, vehicle_id: "", type: "Autre", total_cost: 0, start_date: now, monthly_cost: 0, created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((e) => (e.id === id ? merged : e));
    if (!existing && !updatedExpense) {
      nextLocal.push(merged);
    }
    saveLocalData(STORAGE_KEY_EXPENSES, nextLocal);
    return merged;
  },

  async deleteExpense(id: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("expenses").delete().eq("id", id);
      }
    } catch (err) {
      console.warn("Supabase expense delete exception:", err);
    }
    const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES).filter((e) => e.id !== id);
    saveLocalData(STORAGE_KEY_EXPENSES, local);
    return true;
  },

  // Monthly Expenses
  async getAllMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("monthly_expenses").select("*");
        if (!error && data) {
          saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, data as MonthlyExpense[]);
          return data as MonthlyExpense[];
        }
      }
    } catch (err) {
      console.warn("Error loading monthly expenses:", err);
    }
    return local;
  },

  async createMonthlyExpense(record: Omit<MonthlyExpense, "id" | "created_at" | "updated_at">): Promise<MonthlyExpense> {
    const now = new Date().toISOString();
    const fallback: MonthlyExpense = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mexp-${Date.now()}`,
      ...record,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = isValidUuid(authData.user?.id) ? authData.user?.id : null;
        const payload: Record<string, any> = { ...record };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase.from("monthly_expenses").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as MonthlyExpense;
          const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES).filter((m) => m.id !== saved.id);
          saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, [saved, ...local]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase monthly expense insert exception:", err);
    }

    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES).filter((m) => m.id !== fallback.id);
    saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, [fallback, ...local]);
    return fallback;
  },

  async deleteMonthlyExpensesByExpenseId(expenseId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("monthly_expenses").delete().eq("expense_id", expenseId);
      }
    } catch (err) {
      console.warn("Supabase deleteMonthlyExpenses exception:", err);
    }
    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES).filter((m) => m.expense_id !== expenseId);
    saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, local);
    return true;
  },

  // Budgets
  async getAllBudgets(): Promise<ExpenseBudget[]> {
    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("expense_budgets").select("*");
        if (!error && data) {
          saveLocalData(STORAGE_KEY_BUDGETS, data as ExpenseBudget[]);
          return data as ExpenseBudget[];
        }
      }
    } catch (err) {
      console.warn("Error loading budgets:", err);
    }
    return local;
  },

  async createBudget(budget: Omit<ExpenseBudget, "id" | "created_at" | "updated_at">): Promise<ExpenseBudget> {
    const now = new Date().toISOString();
    const fallback: ExpenseBudget = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `bgt-${Date.now()}`,
      ...budget,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const userId = isValidUuid(authData.user?.id) ? authData.user?.id : null;
        const payload: Record<string, any> = { ...budget };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase.from("expense_budgets").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as ExpenseBudget;
          const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS).filter((b) => b.id !== saved.id);
          saveLocalData(STORAGE_KEY_BUDGETS, [saved, ...local]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase createBudget exception:", err);
    }

    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS).filter((b) => b.id !== fallback.id);
    saveLocalData(STORAGE_KEY_BUDGETS, [fallback, ...local]);
    return fallback;
  },

  async updateBudget(id: string, updates: Partial<ExpenseBudget>): Promise<ExpenseBudget> {
    let updated: ExpenseBudget | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("expense_budgets").update(updates).eq("id", id).select().single();
        if (!error && data) updated = data as ExpenseBudget;
      }
    } catch (err) {
      console.warn("Supabase updateBudget exception:", err);
    }

    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS);
    const existing = local.find((b) => b.id === id);
    const now = new Date().toISOString();
    const merged: ExpenseBudget = updated || {
      ...(existing || { id, category: "Autre", monthly_limit: 0, year: new Date().getFullYear(), month: new Date().getMonth() + 1, created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((b) => (b.id === id ? merged : b));
    if (!existing && !updated) nextLocal.push(merged);
    saveLocalData(STORAGE_KEY_BUDGETS, nextLocal);
    return merged;
  },

  // Audit Logs
  async getAllAuditLogs(): Promise<ExpenseAuditLog[]> {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("expense_audit_logs").select("*").order("created_at", { ascending: false });
        if (!error && data) return data as ExpenseAuditLog[];
      }
    } catch (err) {
      console.warn("Supabase getAllAuditLogs exception:", err);
    }
    return [];
  },

  async createAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at" | "updated_at">): Promise<ExpenseAuditLog> {
    const now = new Date().toISOString();
    const fallback: ExpenseAuditLog = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `alog-${Date.now()}`,
      ...log,
      created_at: now,
      updated_at: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("expense_audit_logs").insert([log]).select().single();
        if (!error && data) return data as ExpenseAuditLog;
      }
    } catch (err) {
      console.warn("Supabase createAuditLog exception:", err);
    }

    return fallback;
  }
};

