import { getSupabaseClient } from "@/services/supabaseService";
import {
  getActiveTenantUserId,
  isValidUuid,
  getScopedLocalStorage,
  saveScopedLocalStorage,
} from "./repositoryUtils";

export interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  amount?: number;
  reference?: string;
  createdAt: string;
}

const STORAGE_KEY_AUDIT_LOGS = "iloca:audit_logs:local";

function getLocalAuditLogs(userId?: string | null): AuditLogEntry[] {
  return getScopedLocalStorage<AuditLogEntry>(STORAGE_KEY_AUDIT_LOGS, userId);
}

function saveLocalAuditLogs(logs: AuditLogEntry[], userId?: string | null): void {
  saveScopedLocalStorage(STORAGE_KEY_AUDIT_LOGS, logs.slice(0, 300), userId);
}

export const auditLogsRepository = {
  async getAll(): Promise<AuditLogEntry[]> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) return [];
    const local = getLocalAuditLogs(activeUserId);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("user_id", activeUserId)
          .order("created_at", { ascending: false })
          .limit(300);
        if (!error && data) {
          const remote = data.map(row => ({
            id: row.id,
            action: row.action,
            details: row.details,
            amount: row.amount,
            reference: row.reference,
            createdAt: row.created_at,
          })) as AuditLogEntry[];
          saveLocalAuditLogs(remote, activeUserId);
          return remote;
        }
      }
    } catch (err) {
      console.warn("Error loading audit logs:", err);
    }
    return local;
  },

  async create(log: Omit<AuditLogEntry, "id" | "createdAt">): Promise<AuditLogEntry> {
    const activeUserId = getActiveTenantUserId();
    if (!activeUserId) {
      throw new Error("Action impossible: utilisateur non authentifié.");
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
        const payload: Record<string, any> = {
          action: log.action,
          details: log.details,
          amount: log.amount,
          reference: log.reference,
          user_id: activeUserId,
        };

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
          const current = getLocalAuditLogs(activeUserId).filter((l) => l.id !== saved.id);
          saveLocalAuditLogs([saved, ...current], activeUserId);
          return saved;
        }
      }
    } catch (err) {
      console.warn("Supabase audit log create exception (storing locally):", err);
    }

    const current = getLocalAuditLogs(activeUserId).filter((l) => l.id !== fallbackEntry.id);
    saveLocalAuditLogs([fallbackEntry, ...current], activeUserId);
    return fallbackEntry;
  }
};
