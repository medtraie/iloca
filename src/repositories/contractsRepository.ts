import { getSupabaseClient } from "@/services/supabaseService";
import { Contract } from "@/types/appData";

export const contractsRepository = {
  async getAll(): Promise<Contract[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("contracts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Contract[];
  },

  async getById(id: string): Promise<Contract | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("contracts").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw error;
    return data as Contract | null;
  },

  async create(contract: Omit<Contract, "id" | "created_at" | "updated_at">): Promise<Contract> {
    const supabase = getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("contracts")
      .insert([{ ...contract, user_id: user?.id }])
      .select()
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async update(id: string, updates: Partial<Contract>): Promise<Contract> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("contracts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Contract;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
