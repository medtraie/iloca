import { getSupabaseClient } from "@/services/supabaseService";

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  amount?: number;
  reference?: string;
  createdAt: string;
}

export const auditLogsRepository = {
  async getAll(): Promise<AuditLogEntry[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    
    return data.map(row => ({
      id: row.id,
      action: row.action,
      details: row.details,
      amount: row.amount,
      reference: row.reference,
      createdAt: row.created_at,
    })) as AuditLogEntry[];
  },

  async create(log: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .insert([{
        action: log.action,
        details: log.details,
        amount: log.amount,
        reference: log.reference,
      }])
      .select()
      .single();
    if (error) throw error;
    
    return {
      id: data.id,
      action: data.action,
      details: data.details,
      amount: data.amount,
      reference: data.reference,
      createdAt: data.created_at,
    } as AuditLogEntry;
  }
};
