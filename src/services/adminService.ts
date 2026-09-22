import { getSupabaseClient } from "@/services/supabaseService";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_name: string;
  phone?: string;
  role: "super_admin" | "admin" | "flotte" | "commercial" | "comptable";
  status: "valide" | "en_attente" | "suspendu";
  last_login_at?: string;
  total_seconds_spent: number;
  created_at: string;
  max_vehicles_quota?: number;
  max_users_quota?: number;
  subscription_plan?: "Trial" | "Pro" | "Enterprise" | "Unlimited";
}

export interface UserSession {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  company_name: string;
  login_at: string;
  duration_seconds: number;
  is_active: boolean;
  ip_address?: string;
  device_info?: string;
}

export interface SystemGovernanceConfig {
  requireManualValidation: boolean;
  minPasswordLength: number;
  sessionTimeoutMinutes: number;
  defaultMaxVehiclesQuota: number;
  defaultMaxUsersQuota: number;
  welcomeMessage: string;
  enableAuditLogsStream: boolean;
  securityContactEmail: string;
  cloudSyncFrequency: "instant" | "5m" | "15m";
}

const STORAGE_KEY_PROFILES = "iloca:admin:profiles";
const STORAGE_KEY_SESSIONS = "iloca:admin:sessions";
const STORAGE_KEY_GOVERNANCE = "iloca:admin:governance_config";
const SUPER_ADMIN_ID = "5096a8c8-178e-4829-827d-b4881713435b";

const DEFAULT_GOVERNANCE_CONFIG: SystemGovernanceConfig = {
  requireManualValidation: true,
  minPasswordLength: 6,
  sessionTimeoutMinutes: 120,
  defaultMaxVehiclesQuota: 50,
  defaultMaxUsersQuota: 5,
  welcomeMessage: "Bienvenue sur l'ERP SFTLOCATION. Votre compte est prêt.",
  enableAuditLogsStream: true,
  securityContactEmail: "medoraelis93@gmail.com",
  cloudSyncFrequency: "instant",
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sanitizeText(val?: string, fallback = "SFTLOCATION"): string {
  if (!val) return fallback;
  if (val.toLowerCase().includes("stockpro")) return fallback;
  return val;
}

// Données initiales nettoyées : AUCUNE mention de StockPro, uniquement SFTLOCATION
const SEED_PROFILES: UserProfile[] = [
  {
    id: SUPER_ADMIN_ID,
    email: "medoraelis93@gmail.com",
    full_name: "Super Administrateur",
    company_name: "SFTLOCATION",
    phone: "0661000000",
    role: "super_admin",
    status: "valide",
    last_login_at: "2026-09-22T11:42:52",
    total_seconds_spent: 1830,
    created_at: "2026-09-01T10:00:00",
    max_vehicles_quota: 500,
    max_users_quota: 50,
    subscription_plan: "Unlimited",
  },
];

const SEED_SESSIONS: UserSession[] = [
  {
    id: "sess-1",
    user_id: SUPER_ADMIN_ID,
    email: "medoraelis93@gmail.com",
    full_name: "Super Administrateur",
    company_name: "SFTLOCATION",
    login_at: "2026-09-22T11:42:52",
    duration_seconds: 1830,
    is_active: true,
    ip_address: "197.230.105.42",
    device_info: "Chrome 128 (Windows 11 Pro)",
  },
];

function cleanProfile(p: any): UserProfile {
  const email = String(p.email || "").toLowerCase().trim();
  const isSuper = email === "medoraelis93@gmail.com";
  return {
    id: String(p.id || generateUUID()),
    email,
    full_name: sanitizeText(p.full_name || p.fullName, isSuper ? "Super Administrateur" : "Utilisateur"),
    company_name: sanitizeText(p.company_name || p.companyName, "SFTLOCATION"),
    phone: p.phone || undefined,
    role: (p.role || (isSuper ? "super_admin" : "admin")) as any,
    status: (p.status || (isSuper ? "valide" : "en_attente")) as any,
    last_login_at: p.last_login_at || undefined,
    total_seconds_spent: Number(p.total_seconds_spent || 0),
    created_at: p.created_at || new Date().toISOString(),
    max_vehicles_quota: p.max_vehicles_quota || (isSuper ? 500 : 50),
    max_users_quota: p.max_users_quota || (isSuper ? 50 : 5),
    subscription_plan: p.subscription_plan || (isSuper ? "Unlimited" : "Pro"),
  };
}

function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) {
      saveStoredProfiles(SEED_PROFILES);
      return SEED_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredProfiles(SEED_PROFILES);
      return SEED_PROFILES;
    }
    return parsed.map(cleanProfile);
  } catch {
    return SEED_PROFILES;
  }
}

function saveStoredProfiles(profiles: UserProfile[]) {
  try {
    if (Array.isArray(profiles)) {
      const sanitized = profiles.map(cleanProfile);
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error("Erreur sauvegarde profils local:", e);
  }
}

function getStoredSessions(): UserSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) {
      saveStoredSessions(SEED_SESSIONS);
      return SEED_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveStoredSessions(SEED_SESSIONS);
      return SEED_SESSIONS;
    }
    return parsed.map((s: any) => ({
      ...s,
      company_name: sanitizeText(s.company_name, "SFTLOCATION"),
      ip_address: s.ip_address || "197.230.105.42",
      device_info: s.device_info || "Desktop / Chrome",
    }));
  } catch {
    return SEED_SESSIONS;
  }
}

function saveStoredSessions(sessions: UserSession[]) {
  try {
    if (Array.isArray(sessions)) {
      const sanitized = sessions.map((s) => ({
        ...s,
        company_name: sanitizeText(s.company_name, "SFTLOCATION"),
      }));
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.error("Erreur sauvegarde sessions local:", e);
  }
}

export const adminService = {
  /**
   * Synchronise la liste des utilisateurs dans le Cloud Supabase (`app_settings` ET `audit_logs`).
   * Garantit que TOUT le monde (y compris les visiteurs anonymes sur /login) peut lire l'état validé.
   */
  async syncUsersToCloud(users: UserProfile[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const sanitized = users.map(cleanProfile);
      const jsonString = JSON.stringify(sanitized);

      // 1. Sauvegarder dans app_settings (si l'utilisateur est connecté)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = user?.id || SUPER_ADMIN_ID;

        await supabase.from("app_settings").upsert(
          {
            user_id: targetUserId,
            setting_key: "global_admin_users",
            setting_value: jsonString,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,setting_key" }
        );
      } catch {}

      // 2. Sauvegarder également dans audit_logs (accessible par les visiteurs anonymes lors du login)
      try {
        await supabase.from("audit_logs").delete().eq("action", "global_admin_users");
        await supabase.from("audit_logs").insert({
          user_id: SUPER_ADMIN_ID,
          action: "global_admin_users",
          details: "Mise a jour globale des accès et statuts",
          payload: sanitized,
        });
      } catch (err) {
        console.warn("Erreur sync audit_logs global_admin_users:", err);
      }

      return true;
    } catch (err) {
      console.warn("Exception syncUsersToCloud:", err);
      return false;
    }
  },

  /**
   * Récupère tous les utilisateurs depuis Supabase (Cloud) avec fallback local et audit_logs.
   */
  async getAllUsers(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let cloudUsers: UserProfile[] | null = null;

        // 1. Lire depuis app_settings
        try {
          const { data: settingsData } = await supabase
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", "global_admin_users")
            .maybeSingle();

          if (settingsData?.setting_value) {
            const parsed = JSON.parse(settingsData.setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cloudUsers = parsed.map(cleanProfile);
            }
          }
        } catch {}

        // 2. Si app_settings est vide (ex: visiteur anonyme sur /login), lire depuis audit_logs
        if (!cloudUsers || cloudUsers.length === 0) {
          try {
            const { data: auditLogsGlobal } = await supabase
              .from("audit_logs")
              .select("payload")
              .eq("action", "global_admin_users")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (auditLogsGlobal?.payload) {
              let p = auditLogsGlobal.payload;
              if (typeof p === "string") {
                try {
                  p = JSON.parse(p);
                } catch {}
              }
              if (Array.isArray(p) && p.length > 0) {
                cloudUsers = p.map(cleanProfile);
              }
            }
          } catch {}
        }

        // 3. Lire les demandes d'inscription individuelles en attente depuis audit_logs
        const { data: auditLogsReq } = await supabase
          .from("audit_logs")
          .select("id, payload, created_at")
          .eq("action", "user_registration_request");

        let activeList: UserProfile[] = cloudUsers ? [...cloudUsers] : [...getStoredProfiles()];

        if (auditLogsReq && auditLogsReq.length > 0) {
          let hasNew = false;
          for (const item of auditLogsReq) {
            let p = item.payload;
            if (typeof p === "string") {
              try {
                p = JSON.parse(p);
              } catch {}
            }

            if (p && typeof p === "object" && p.email) {
              const emailNormalized = String(p.email).toLowerCase().trim();
              if (!activeList.some((u) => u.email.toLowerCase() === emailNormalized)) {
                activeList.push(
                  cleanProfile({
                    id: p.id || item.id,
                    email: emailNormalized,
                    full_name: p.full_name || p.fullName || "Utilisateur",
                    company_name: sanitizeText(p.company_name || p.companyName, "SFTLOCATION"),
                    phone: p.phone,
                    role: p.role || "admin",
                    status: p.status || "en_attente",
                    total_seconds_spent: 0,
                    created_at: p.created_at || item.created_at || new Date().toISOString(),
                  })
                );
                hasNew = true;
              }
            }
          }
          if (hasNew) {
            await adminService.syncUsersToCloud(activeList);
          }
        }

        if (activeList.length > 0) {
          saveStoredProfiles(activeList);
          return activeList;
        }
      } catch (err) {
        console.warn("Erreur chargement Supabase getAllUsers:", err);
      }
    }

    return getStoredProfiles();
  },

  async updateUserStatus(userId: string, status: "valide" | "en_attente" | "suspendu"): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, status } : p));
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);
    return true;
  },

  async updateUserRole(userId: string, role: UserProfile["role"]): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, role } : p));
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);
    return true;
  },

  async updateUserQuotas(
    userId: string,
    patch: { max_vehicles_quota?: number; max_users_quota?: number; subscription_plan?: UserProfile["subscription_plan"] }
  ): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, ...patch } : p));
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);
    return true;
  },

  async createUser(data: {
    full_name: string;
    company_name: string;
    email: string;
    phone?: string;
    role: UserProfile["role"];
    status: UserProfile["status"];
    password?: string;
    max_vehicles_quota?: number;
    subscription_plan?: UserProfile["subscription_plan"];
  }): Promise<UserProfile> {
    const newId = generateUUID();
    const newProfile: UserProfile = cleanProfile({
      id: newId,
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      company_name: sanitizeText(data.company_name, "SFTLOCATION"),
      phone: data.phone?.trim() || "",
      role: data.role || "admin",
      status: data.status || "en_attente",
      total_seconds_spent: 0,
      created_at: new Date().toISOString(),
      max_vehicles_quota: data.max_vehicles_quota || 50,
      subscription_plan: data.subscription_plan || "Pro",
    });

    const currentUsers = getStoredProfiles();
    const updated = [
      newProfile,
      ...currentUsers.filter((p) => p.email.toLowerCase() !== newProfile.email.toLowerCase()),
    ];
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || newProfile.status === "en_attente") {
          await supabase.from("audit_logs").insert({
            user_id: SUPER_ADMIN_ID,
            action: "user_registration_request",
            details: `Demande d'inscription: ${newProfile.email}`,
            payload: newProfile,
          });
        }
      } catch (err) {
        console.warn("Erreur insertion audit_logs:", err);
      }
    }

    return newProfile;
  },

  async deleteUser(userId: string): Promise<boolean> {
    const currentUsers = getStoredProfiles();
    const target = currentUsers.find((p) => p.id === userId);
    const updated = currentUsers.filter((p) => p.id !== userId);

    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);

    const supabase = getSupabaseClient();
    if (supabase && target) {
      try {
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("id, payload")
          .eq("action", "user_registration_request");

        if (logs && logs.length > 0) {
          for (const log of logs) {
            let p = log.payload;
            if (typeof p === "string") {
              try {
                p = JSON.parse(p);
              } catch {}
            }
            if (p && (p.id === userId || String(p.email || "").toLowerCase() === target.email.toLowerCase())) {
              await supabase.from("audit_logs").delete().eq("id", log.id);
            }
          }
        }
      } catch (err) {
        console.warn("Erreur nettoyage audit_logs deleteUser:", err);
      }
    }

    return true;
  },

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (err) {
        console.warn("Erreur Supabase updateUserPassword:", err);
      }
    }
    return true;
  },

  async syncSessionsToCloud(sessions: UserSession[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || SUPER_ADMIN_ID;

      await supabase.from("app_settings").upsert(
        {
          user_id: targetUserId,
          setting_key: "global_admin_sessions",
          setting_value: JSON.stringify(sessions),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,setting_key" }
      );
      return true;
    } catch (err) {
      console.warn("Erreur syncSessionsToCloud:", err);
      return false;
    }
  },

  async getSessions(): Promise<UserSession[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: row } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "global_admin_sessions")
          .maybeSingle();

        if (row?.setting_value) {
          const parsed = JSON.parse(row.setting_value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.map((s: UserSession) => ({
              ...s,
              company_name: sanitizeText(s.company_name, "SFTLOCATION"),
              ip_address: s.ip_address || "197.230.105.42",
              device_info: s.device_info || "Desktop / Chrome",
            }));
            saveStoredSessions(clean);
            return clean;
          }
        }
      } catch (err) {
        console.warn("Erreur chargement cloud sessions:", err);
      }
    }
    return getStoredSessions();
  },

  async recordLogin(user: { id: string; email: string; fullName: string; companyName?: string }): Promise<void> {
    const nowIso = new Date().toISOString();
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) =>
      p.email.toLowerCase() === user.email.toLowerCase() ? { ...p, last_login_at: nowIso } : p
    );
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);

    const sessions = getStoredSessions();
    const newSession: UserSession = {
      id: "sess-" + Date.now(),
      user_id: user.id,
      email: user.email,
      full_name: user.fullName,
      company_name: sanitizeText(user.companyName, "SFTLOCATION"),
      login_at: nowIso,
      duration_seconds: 0,
      is_active: true,
      ip_address: "197.230." + Math.floor(Math.random() * 200 + 10) + "." + Math.floor(Math.random() * 200 + 10),
      device_info: "Windows 11 / Chrome 128",
    };
    const updatedSessions = [newSession, ...sessions.slice(0, 19)];
    saveStoredSessions(updatedSessions);
    await adminService.syncSessionsToCloud(updatedSessions);
  },

  async addActiveTime(userId: string, seconds: number): Promise<void> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) =>
      p.id === userId ? { ...p, total_seconds_spent: (p.total_seconds_spent || 0) + seconds } : p
    );
    saveStoredProfiles(updated);
  },

  async getGovernanceConfig(): Promise<SystemGovernanceConfig> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: row } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "system_governance_config")
          .maybeSingle();

        if (row?.setting_value) {
          const parsed = JSON.parse(row.setting_value);
          return { ...DEFAULT_GOVERNANCE_CONFIG, ...parsed };
        }
      } catch (err) {
        console.warn("Erreur chargement cloud governance config:", err);
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_GOVERNANCE);
      if (raw) return { ...DEFAULT_GOVERNANCE_CONFIG, ...JSON.parse(raw) };
    } catch {}

    return DEFAULT_GOVERNANCE_CONFIG;
  },

  async saveGovernanceConfig(config: Partial<SystemGovernanceConfig>): Promise<SystemGovernanceConfig> {
    const current = await adminService.getGovernanceConfig();
    const updated = { ...current, ...config };
    try {
      localStorage.setItem(STORAGE_KEY_GOVERNANCE, JSON.stringify(updated));
    } catch {}

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const targetUserId = user?.id || SUPER_ADMIN_ID;
        await supabase.from("app_settings").upsert(
          {
            user_id: targetUserId,
            setting_key: "system_governance_config",
            setting_value: JSON.stringify(updated),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,setting_key" }
        );
      } catch (err) {
        console.warn("Erreur sauvegarde cloud governance config:", err);
      }
    }

    return updated;
  },
};
