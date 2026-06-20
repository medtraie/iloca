import { getSupabaseClient } from "@/services/supabaseService";
import { Expense, MonthlyExpense, ExpenseBudget, ExpenseAuditLog } from "@/types/expense";

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
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as Expense[];
  },

  async createExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense> {
    const supabase = getSupabaseClient();
    const payload = buildExpenseWritePayload(expense);
    const { data, error } = await supabase.from("expenses").insert([payload]).select().single();
    if (error) throw new Error(error.message);
    return data as Expense;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const supabase = getSupabaseClient();
    const payload = buildExpenseUpdatePayload(updates);
    const { data, error } = await supabase.from("expenses").update(payload).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as Expense;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // Monthly Expenses
  async getAllMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("monthly_expenses").select("*");
    if (error) throw new Error(error.message);
    return data as MonthlyExpense[];
  },

  async createMonthlyExpense(record: Omit<MonthlyExpense, "id" | "created_at" | "updated_at">): Promise<MonthlyExpense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("monthly_expenses").insert([record]).select().single();
    if (error) throw new Error(error.message);
    return data as MonthlyExpense;
  },

  async deleteMonthlyExpensesByExpenseId(expenseId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("monthly_expenses").delete().eq("expense_id", expenseId);
    if (error) throw new Error(error.message);
    return true;
  },

  // Budgets
  async getAllBudgets(): Promise<ExpenseBudget[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").select("*");
    if (error) throw new Error(error.message);
    return data as ExpenseBudget[];
  },

  async createBudget(budget: Omit<ExpenseBudget, "id" | "created_at" | "updated_at">): Promise<ExpenseBudget> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").insert([budget]).select().single();
    if (error) throw new Error(error.message);
    return data as ExpenseBudget;
  },

  async updateBudget(id: string, updates: Partial<ExpenseBudget>): Promise<ExpenseBudget> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").update(updates).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as ExpenseBudget;
  },

  // Audit Logs
  async getAllAuditLogs(): Promise<ExpenseAuditLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_audit_logs").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as ExpenseAuditLog[];
  },

  async createAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at" | "updated_at">): Promise<ExpenseAuditLog> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_audit_logs").insert([log]).select().single();
    if (error) throw new Error(error.message);
    return data as ExpenseAuditLog;
  }
};
