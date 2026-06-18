import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabaseService";

export const supabase = getSupabaseClient() as SupabaseClient;
