import { getSupabaseClient } from "@/services/supabaseService";
import { Expense, MonthlyExpense, ExpenseBudget, ExpenseAuditLog } from "@/types/expense";
import {
  getActiveTenantUserId,
  getDatabaseTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

const STORAGE_KEY_EXPENSES = "iloca:expenses:local";
const STORAGE_KEY_MONTHLY_EXPENSES = "iloca:monthly_expenses:local";
const STORAGE_KEY_BUDGETS = "iloca:budgets:local";

function getLocalData<T>(key: string, userId?: string | null): T[] {
  return getScopedLocalStorage<T>(key, userId);
}

function saveLocalData<T>(key: string, data: T[], userId?: string | null): void {
  saveScopedLocalStorage<T>(key, data, userId);
}

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
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const dbUserId = getDatabaseTenantUserId() || activeUserId;
    const targetIds = [activeUserId, ...(dbUserId !== activeUserId ? [dbUserId] : [])];
    const localList = getLocalData<Expense>(STORAGE_KEY_EXPENSES, activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expenses").select("*");
        if (targetIds.length === 1) {
          query = query.eq("user_id", targetIds[0]);
        } else {
          query = query.in("user_id", targetIds);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && data) {
          const remoteList = data as Expense[];
          saveLocalData(STORAGE_KEY_EXPENSES, remoteList, activeUserId);
          return remoteList;
        }
      }
    } catch (err) {
      console.warn("Error loading expenses from Supabase, using local cache:", err);
    }
    return localList;
  },

  async createExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }
    const dbUserId = getDatabaseTenantUserId() || activeUserId;

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
        const payload: Record<string, any> = {
          ...buildExpenseWritePayload(expense),
          user_id: dbUserId,
        };

        const { data, error } = await supabase.from("expenses").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as Expense;
          const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES, activeUserId).filter((e) => e.id !== saved.id);
          saveLocalData(STORAGE_KEY_EXPENSES, [saved, ...local], activeUserId);
          return saved;
        }
        if (error) console.warn("Supabase expense insert rejected (storing locally):", error);
      }
    } catch (err) {
      console.warn("Supabase expense create exception (storing locally):", err);
    }

    const currentLocal = getLocalData<Expense>(STORAGE_KEY_EXPENSES, activeUserId).filter((e) => e.id !== fallbackExpense.id);
    saveLocalData(STORAGE_KEY_EXPENSES, [fallbackExpense, ...currentLocal], activeUserId);
    return fallbackExpense;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const activeUserId = getActiveTenantUserId();
    let updatedExpense: Expense | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expenses").update(buildExpenseUpdatePayload(updates)).eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { data, error } = await query.select().single();
        if (!error && data) {
          updatedExpense = data as Expense;
        }
      }
    } catch (err) {
      console.warn("Supabase expense update exception:", err);
    }

    const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES, activeUserId);
    const existing = local.find((e) => e.id === id);
    const now = new Date().toISOString();
    const merged: Expense = updatedExpense || {
      ...(existing || { id, vehicle_id: "", type: "Assurance", total_cost: 0, start_date: "", end_date: "", period_months: 1, monthly_cost: 0, created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((e) => (e.id === id ? merged : e));
    if (!existing && !updatedExpense) {
      nextLocal.push(merged);
    }
    saveLocalData(STORAGE_KEY_EXPENSES, nextLocal, activeUserId);
    return merged;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expenses").delete().eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        await query;
      }
    } catch (err) {
      console.warn("Supabase expense delete exception:", err);
    }
    const local = getLocalData<Expense>(STORAGE_KEY_EXPENSES, activeUserId).filter((e) => e.id !== id);
    saveLocalData(STORAGE_KEY_EXPENSES, local, activeUserId);
    return true;
  },

  // Monthly Expenses
  async getAllMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES, activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("monthly_expenses")
          .select("*")
          .eq("user_id", activeUserId);
        if (!error && data) {
          saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, data as MonthlyExpense[], activeUserId);
          return data as MonthlyExpense[];
        }
      }
    } catch (err) {
      console.warn("Error loading monthly expenses:", err);
    }
    return local;
  },

  async createMonthlyExpense(record: Omit<MonthlyExpense, "id" | "created_at" | "updated_at">): Promise<MonthlyExpense> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }
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
        const payload: Record<string, any> = {
          ...record,
          user_id: activeUserId,
        };

        const { data, error } = await supabase.from("monthly_expenses").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as MonthlyExpense;
          const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES, activeUserId).filter((m) => m.id !== saved.id);
          saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, [saved, ...local], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase monthly expense insert exception:", err);
    }

    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES, activeUserId).filter((m) => m.id !== fallback.id);
    saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, [fallback, ...local], activeUserId);
    return fallback;
  },

  async deleteMonthlyExpensesByExpenseId(expenseId: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("monthly_expenses").delete().eq("expense_id", expenseId);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        await query;
      }
    } catch (err) {
      console.warn("Supabase deleteMonthlyExpenses exception:", err);
    }
    const local = getLocalData<MonthlyExpense>(STORAGE_KEY_MONTHLY_EXPENSES, activeUserId).filter((m) => m.expense_id !== expenseId);
    saveLocalData(STORAGE_KEY_MONTHLY_EXPENSES, local, activeUserId);
    return true;
  },

  // Budgets
  async getAllBudgets(): Promise<ExpenseBudget[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS, activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("expense_budgets")
          .select("*")
          .eq("user_id", activeUserId);
        if (!error && data) {
          saveLocalData(STORAGE_KEY_BUDGETS, data as ExpenseBudget[], activeUserId);
          return data as ExpenseBudget[];
        }
      }
    } catch (err) {
      console.warn("Error loading budgets:", err);
    }
    return local;
  },

  async createBudget(budget: Omit<ExpenseBudget, "id" | "created_at" | "updated_at">): Promise<ExpenseBudget> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
    }
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
        const payload: Record<string, any> = {
          ...budget,
          user_id: activeUserId,
        };

        const { data, error } = await supabase.from("expense_budgets").insert([payload]).select().single();
        if (!error && data) {
          const saved = data as ExpenseBudget;
          const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS, activeUserId).filter((b) => b.id !== saved.id);
          saveLocalData(STORAGE_KEY_BUDGETS, [saved, ...local], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase createBudget exception:", err);
    }

    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS, activeUserId).filter((b) => b.id !== fallback.id);
    saveLocalData(STORAGE_KEY_BUDGETS, [fallback, ...local], activeUserId);
    return fallback;
  },

  async updateBudget(id: string, updates: Partial<ExpenseBudget>): Promise<ExpenseBudget> {
    const activeUserId = getActiveTenantUserId();
    let updated: ExpenseBudget | null = null;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expense_budgets").update(updates).eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        const { data, error } = await query.select().single();
        if (!error && data) updated = data as ExpenseBudget;
      }
    } catch (err) {
      console.warn("Supabase updateBudget exception:", err);
    }

    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS, activeUserId);
    const existing = local.find((b) => b.id === id);
    const now = new Date().toISOString();
    const merged: ExpenseBudget = updated || {
      ...(existing || { id, category: "Autre", monthly_limit: 0, year: new Date().getFullYear(), month: new Date().getMonth() + 1, created_at: now, updated_at: now }),
      ...updates,
      updated_at: now,
    };

    const nextLocal = local.map((b) => (b.id === id ? merged : b));
    if (!existing && !updated) nextLocal.push(merged);
    saveLocalData(STORAGE_KEY_BUDGETS, nextLocal, activeUserId);
    return merged;
  },

  async deleteBudget(id: string): Promise<boolean> {
    const activeUserId = getActiveTenantUserId();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expense_budgets").delete().eq("id", id);
        if (activeUserId) query = query.eq("user_id", activeUserId);
        await query;
      }
    } catch (err) {
      console.warn("Supabase deleteBudget exception:", err);
    }
    const local = getLocalData<ExpenseBudget>(STORAGE_KEY_BUDGETS, activeUserId).filter((b) => b.id !== id);
    saveLocalData(STORAGE_KEY_BUDGETS, local, activeUserId);
    return true;
  },

  // Audit Logs
  async getAllAuditLogs(): Promise<ExpenseAuditLog[]> {
    return this.getAuditLogs();
  },

  async getAuditLogs(): Promise<ExpenseAuditLog[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const dbUserId = getDatabaseTenantUserId() || activeUserId;
    const targetIds = [activeUserId, ...(dbUserId !== activeUserId ? [dbUserId] : [])];
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        let query = supabase.from("expense_audit_logs").select("*");
        if (targetIds.length === 1) {
          query = query.eq("user_id", targetIds[0]);
        } else {
          query = query.in("user_id", targetIds);
        }
        const { data, error } = await query.order("created_at", { ascending: false });
        if (!error && data) return data as ExpenseAuditLog[];
      }
    } catch (err) {
      console.warn("Error loading expense audit logs:", err);
    }
    return [];
  },

  async createAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at" | "updated_at">): Promise<ExpenseAuditLog> {
    const activeUserId = getActiveTenantUserId();
    const dbUserId = getDatabaseTenantUserId() || activeUserId;
    const now = new Date().toISOString();
    const created: ExpenseAuditLog = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}`,
      ...log,
      created_at: now,
      updated_at: now,
      user_id: dbUserId || undefined,
    } as ExpenseAuditLog;

    if (!activeUserId) return created;
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from("expense_audit_logs").insert([{ ...log, user_id: dbUserId }]);
      }
    } catch (err) {
      console.warn("Supabase createAuditLog exception:", err);
    }
    return created;
  },

  async addAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at">): Promise<void> {
    await this.createAuditLog(log as any);
  }
};
