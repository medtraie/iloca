import { getSupabaseClient } from "@/services/supabaseService";

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  amount?: number;
  reference?: string;
  createdAt: string;
}

const STORAGE_KEY_AUDIT_LOGS = "iloca:audit_logs:local";

function getLocalAuditLogs(): AuditLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAuditLogs(logs: AuditLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(logs.slice(0, 300)));
  } catch (e) {
    console.warn("Could not save local audit logs:", e);
  }
}

const isValidUuid = (id: string | null | undefined): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const auditLogsRepository = {
  async getAll(): Promise<AuditLogEntry[]> {
    const local = getLocalAuditLogs();
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
        if (!error && data) {
          const remote = data.map(row => ({
            id: row.id,
            action: row.action,
            details: row.details,
            amount: row.amount,
            reference: row.reference,
            createdAt: row.created_at,
          })) as AuditLogEntry[];
          saveLocalAuditLogs(remote);
          return remote;
        }
      }
    } catch (err) {
      console.warn("Error loading audit logs:", err);
    }
    return local;
  },

  async create(log: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const activeUserStr = typeof window !== "undefined" ? localStorage.getItem("iloca:active_user") : null;
    let activeUserId: string | null = null;
    if (activeUserStr) {
      try {
        activeUserId = JSON.parse(activeUserStr)?.id || null;
      } catch {}
    }

    const now = new Date().toISOString();
    const fallbackEntry: AuditLogEntry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `log-${Date.now()}`,
      ...log,
      createdAt: now,
    };

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser();
        const candidateUserId = authData.user?.id || activeUserId;
        const userId = isValidUuid(candidateUserId) ? candidateUserId : null;

        const payload: Record<string, any> = {
          action: log.action,
          details: log.details,
          amount: log.amount,
          reference: log.reference,
        };
        if (userId) payload.user_id = userId;

        const { data, error } = await supabase
          .from("audit_logs")
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          const saved: AuditLogEntry = {
            id: data.id,
            action: data.action,
            details: data.details,
            amount: data.amount,
            reference: data.reference,
            createdAt: data.created_at,
          };
          const current = getLocalAuditLogs().filter((l) => l.id !== saved.id);
          saveLocalAuditLogs([saved, ...current]);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase audit log create exception (storing locally):", err);
    }

    const current = getLocalAuditLogs().filter((l) => l.id !== fallbackEntry.id);
    saveLocalAuditLogs([fallbackEntry, ...current]);
    return fallbackEntry;
  }
};

