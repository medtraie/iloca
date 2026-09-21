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
}

const STORAGE_KEY_PROFILES = "iloca:admin:profiles";
const STORAGE_KEY_SESSIONS = "iloca:admin:sessions";
const SUPER_ADMIN_ID = "5096a8c8-178e-4829-827d-b4881713435b";

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
    last_login_at: "2026-09-21T23:24:12",
    total_seconds_spent: 1830,
    created_at: "2026-09-01T10:00:00",
  },
  {
    id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    email: "med@meira.com",
    full_name: "med",
    company_name: "meira",
    phone: "0662345678",
    role: "admin",
    status: "valide",
    last_login_at: "2026-09-19T14:12:04",
    total_seconds_spent: 10,
    created_at: "2026-09-10T12:00:00",
  },
];

const SEED_SESSIONS: UserSession[] = [
  {
    id: "sess-1",
    user_id: SUPER_ADMIN_ID,
    email: "medoraelis93@gmail.com",
    full_name: "Super Administrateur",
    company_name: "SFTLOCATION",
    login_at: "2026-09-21T23:24:12",
    duration_seconds: 1830,
    is_active: true,
  },
  {
    id: "sess-2",
    user_id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
    email: "med@meira.com",
    full_name: "med",
    company_name: "meira",
    login_at: "2026-09-19T14:12:04",
    duration_seconds: 10,
    is_active: false,
  },
];

function cleanProfile(p: any): UserProfile {
  const email = String(p.email || "").toLowerCase().trim();
  const isSuper = email === "medoraelis93@gmail.com";
  return {
    id: String(p.id || generateUUID()),
    email,
    full_name: sanitizeText(p.full_name, isSuper ? "Super Administrateur" : "Utilisateur"),
    company_name: sanitizeText(p.company_name, "SFTLOCATION"),
    phone: p.phone || undefined,
    role: (p.role || (isSuper ? "super_admin" : "admin")) as any,
    status: (p.status || (isSuper ? "valide" : "en_attente")) as any,
    last_login_at: p.last_login_at || undefined,
    total_seconds_spent: Number(p.total_seconds_spent || 0),
    created_at: p.created_at || new Date().toISOString(),
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
   * Synchronise la liste des utilisateurs dans le Cloud Supabase (app_settings).
   * Accessible de n'importe quel navigateur sans contrainte de clé étrangère.
   */
  async syncUsersToCloud(users: UserProfile[]): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = user?.id || SUPER_ADMIN_ID;

      const sanitized = users.map(cleanProfile);
      const { error } = await supabase.from("app_settings").upsert(
        {
          user_id: targetUserId,
          setting_key: "global_admin_users",
          setting_value: JSON.stringify(sanitized),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,setting_key" }
      );

      if (error) {
        console.warn("Erreur upsert app_settings global_admin_users:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Exception syncUsersToCloud:", err);
      return false;
    }
  },

  /**
   * Récupère tous les utilisateurs depuis Supabase (Cloud) avec fallback local.
   * La base Supabase fait autorité universelle entre tous les navigateurs.
   */
  async getAllUsers(): Promise<UserProfile[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // 1. Lire les utilisateurs enregistrés dans app_settings
        const { data: settingsData, error } = await supabase
          .from("app_settings")
          .select("setting_value")
          .eq("setting_key", "global_admin_users")
          .maybeSingle();

        let cloudUsers: UserProfile[] | null = null;
        if (!error && settingsData?.setting_value) {
          try {
            const parsed = JSON.parse(settingsData.setting_value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              cloudUsers = parsed.map(cleanProfile);
            }
          } catch (e) {
            console.warn("Erreur parsing global_admin_users:", e);
          }
        }

        // 2. Vérifier les nouvelles demandes d'inscription depuis audit_logs
        const { data: auditLogs } = await supabase
          .from("audit_logs")
          .select("id, payload, created_at")
          .eq("action", "user_registration_request");

        let activeList: UserProfile[] = cloudUsers ? [...cloudUsers] : [...getStoredProfiles()];

        if (auditLogs && auditLogs.length > 0) {
          let hasNew = false;
          for (const item of auditLogs) {
            const p = item.payload;
            if (p && p.email) {
              const emailNormalized = String(p.email).toLowerCase().trim();
              if (!activeList.some((u) => u.email.toLowerCase() === emailNormalized)) {
                activeList.push(
                  cleanProfile({
                    id: p.id || item.id,
                    email: emailNormalized,
                    full_name: p.full_name || "Utilisateur",
                    company_name: sanitizeText(p.company_name, "SFTLOCATION"),
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

  /**
   * Valider ou suspendre un compte
   */
  async updateUserStatus(userId: string, status: "valide" | "en_attente" | "suspendu"): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, status } : p));
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);
    return true;
  },

  /**
   * Modifier le rôle d'un utilisateur
   */
  async updateUserRole(userId: string, role: UserProfile["role"]): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, role } : p));
    saveStoredProfiles(updated);
    await adminService.syncUsersToCloud(updated);
    return true;
  },

  /**
   * Créer un nouvel utilisateur (+ Nouvel utilisateur)
   */
  async createUser(data: {
    full_name: string;
    company_name: string;
    email: string;
    phone?: string;
    role: UserProfile["role"];
    status: UserProfile["status"];
    password?: string;
  }): Promise<UserProfile> {
    const newId = generateUUID();
    const newProfile: UserProfile = cleanProfile({
      id: newId,
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      company_name: sanitizeText(data.company_name, "SFTLOCATION"),
      phone: data.phone?.trim() || "",
      role: data.role || "admin",
      status: data.status || "valide",
      total_seconds_spent: 0,
      created_at: new Date().toISOString(),
    });

    // 1. Sauvegarde locale immédiate
    const currentUsers = getStoredProfiles();
    const updated = [
      newProfile,
      ...currentUsers.filter((p) => p.email.toLowerCase() !== newProfile.email.toLowerCase()),
    ];
    saveStoredProfiles(updated);

    // 2. Synchronisation Cloud Supabase
    await adminService.syncUsersToCloud(updated);

    // 3. Si création depuis un compte non-admin (ex: formulaire d'inscription sur /login)
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
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

  /**
   * Supprimer définitivement un utilisateur.
   * Il ne réapparaîtra jamais, même en ouvrant un autre navigateur.
   */
  async deleteUser(userId: string): Promise<boolean> {
    const currentUsers = getStoredProfiles();
    const target = currentUsers.find((p) => p.id === userId);
    const updated = currentUsers.filter((p) => p.id !== userId);

    // 1. Mise à jour locale
    saveStoredProfiles(updated);

    // 2. Mise à jour Cloud Supabase
    await adminService.syncUsersToCloud(updated);

    // 3. Nettoyer les demandes d'inscription dans audit_logs si existant
    const supabase = getSupabaseClient();
    if (supabase && target) {
      try {
        const { data: logs } = await supabase
          .from("audit_logs")
          .select("id, payload")
          .eq("action", "user_registration_request");

        if (logs && logs.length > 0) {
          for (const log of logs) {
            const p = log.payload;
            if (p && (p.id === userId || String(p.email).toLowerCase() === target.email.toLowerCase())) {
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

  /**
   * Changer le mot de passe utilisateur
   */
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

  /**
   * Synchronise les sessions dans le Cloud Supabase
   */
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

  /**
   * Récupère l'historique des sessions
   */
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

  /**
   * Enregistre une connexion active
   */
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
    };
    const updatedSessions = [newSession, ...sessions.slice(0, 19)];
    saveStoredSessions(updatedSessions);
    await adminService.syncSessionsToCloud(updatedSessions);
  },

  /**
   * Ajoute du temps actif au profil
   */
  async addActiveTime(userId: string, seconds: number): Promise<void> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) =>
      p.id === userId ? { ...p, total_seconds_spent: (p.total_seconds_spent || 0) + seconds } : p
    );
    saveStoredProfiles(updated);
  },
};
