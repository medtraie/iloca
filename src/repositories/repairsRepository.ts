import { getSupabaseClient } from "@/services/supabaseService";
import { Repair } from "@/types/repair";

export const repairsRepository = {
  async getAll(): Promise<Repair[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("repairs").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Repair[];
  },

  async getById(id: string): Promise<Repair | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("repairs").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") throw error;
    return data as Repair | null;
  },

  async getByVehicleId(vehicleId: string): Promise<Repair[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("repairs").select("*").eq("vehicleId", vehicleId).order("created_at", { ascending: false });
    if (error) throw error;
    return data as Repair[];
  },

  async create(repair: Omit<Repair, "id" | "created_at" | "updated_at">): Promise<Repair> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("repairs")
      .insert([repair])
      .select()
      .single();
    if (error) throw error;
    return data as Repair;
  },

  async update(id: string, updates: Partial<Repair>): Promise<Repair> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("repairs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Repair;
  },

  async delete(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("repairs").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};
