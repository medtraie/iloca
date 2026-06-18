import { getSupabaseClient } from "@/services/supabaseService";
import { Expense, MonthlyExpense, ExpenseBudget, ExpenseAuditLog } from "@/types/expense";

export const expensesRepository = {
  async getAllExpenses(): Promise<Expense[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Expense[];
  },

  async createExpense(expense: Omit<Expense, "id" | "created_at" | "updated_at">): Promise<Expense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expenses").insert([expense]).select().single();
    if (error) throw error;
    return data as Expense;
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expenses").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as Expense;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // Monthly Expenses
  async getAllMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("monthly_expenses").select("*");
    if (error) throw error;
    return data as MonthlyExpense[];
  },

  async createMonthlyExpense(record: Omit<MonthlyExpense, "id" | "created_at" | "updated_at">): Promise<MonthlyExpense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("monthly_expenses").insert([record]).select().single();
    if (error) throw error;
    return data as MonthlyExpense;
  },

  async deleteMonthlyExpensesByExpenseId(expenseId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("monthly_expenses").delete().eq("expense_id", expenseId);
    if (error) throw error;
    return true;
  },

  // Budgets
  async getAllBudgets(): Promise<ExpenseBudget[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").select("*");
    if (error) throw error;
    return data as ExpenseBudget[];
  },

  async createBudget(budget: Omit<ExpenseBudget, "id" | "created_at" | "updated_at">): Promise<ExpenseBudget> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").insert([budget]).select().single();
    if (error) throw error;
    return data as ExpenseBudget;
  },

  async updateBudget(id: string, updates: Partial<ExpenseBudget>): Promise<ExpenseBudget> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_budgets").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return data as ExpenseBudget;
  },

  // Audit Logs
  async getAllAuditLogs(): Promise<ExpenseAuditLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_audit_logs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as ExpenseAuditLog[];
  },

  async createAuditLog(log: Omit<ExpenseAuditLog, "id" | "created_at" | "updated_at">): Promise<ExpenseAuditLog> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("expense_audit_logs").insert([log]).select().single();
    if (error) throw error;
    return data as ExpenseAuditLog;
  }
};
