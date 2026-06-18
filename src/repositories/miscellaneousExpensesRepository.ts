import { getSupabaseClient } from "@/services/supabaseService";
import { MiscellaneousExpense } from "@/hooks/useMiscellaneousExpenses";

export const miscellaneousExpensesRepository = {
  async getAll(): Promise<MiscellaneousExpense[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("miscellaneous_expenses").select("*").order("expense_date", { ascending: false });
    if (error) throw error;
    
    return data as MiscellaneousExpense[];
  },

  async create(expense: Omit<MiscellaneousExpense, "id" | "created_at">): Promise<MiscellaneousExpense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("miscellaneous_expenses")
      .insert([expense])
      .select()
      .single();
    if (error) throw error;
    
    return data as MiscellaneousExpense;
  },

  async update(id: string, updates: Partial<MiscellaneousExpense>): Promise<MiscellaneousExpense> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("miscellaneous_expenses")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    
    return data as MiscellaneousExpense;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("miscellaneous_expenses").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
