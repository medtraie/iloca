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

// Données initiales reflétant la maquette de l'utilisateur
const SEED_PROFILES: UserProfile[] = [
  {
    id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    email: "medoraelis93@gmail.com",
    full_name: "Super Administrateur",
    company_name: "StockPro SARL",
    phone: "0661000000",
    role: "super_admin",
    status: "valide",
    last_login_at: "2026-09-21T22:25:25",
    total_seconds_spent: 1830, // 30m 30s
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
  {
    id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
    email: "contact@stockpro.ma",
    full_name: "StockPro SARL",
    company_name: "StockPro SARL",
    phone: "0522001122",
    role: "admin",
    status: "valide",
    last_login_at: undefined,
    total_seconds_spent: 0,
    created_at: "2026-09-12T09:00:00",
  },
  {
    id: "d4e5f6a7-b89c-0d1e-2f3a-4b5c6d7e8f9a",
    email: "sms@gmail.com",
    full_name: "somia",
    company_name: "smar",
    phone: "0670123456",
    role: "admin",
    status: "en_attente",
    last_login_at: undefined,
    total_seconds_spent: 0,
    created_at: "2026-09-21T21:40:00",
  },
];

const SEED_SESSIONS: UserSession[] = [
  {
    id: "sess-1",
    user_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    email: "medoraelis93@gmail.com",
    full_name: "Super Administrateur",
    company_name: "StockPro SARL",
    login_at: "2026-09-21T22:25:25",
    duration_seconds: 1820,
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
    return parsed;
  } catch {
    return SEED_PROFILES;
  }
}

function saveStoredProfiles(profiles: UserProfile[]) {
  try {
    if (Array.isArray(profiles) && profiles.length > 0) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    }
  } catch (e) {
    console.error("Erreur sauvegarde profils:", e);
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
    return parsed;
  } catch {
    return SEED_SESSIONS;
  }
}

function saveStoredSessions(sessions: UserSession[]) {
  try {
    if (Array.isArray(sessions) && sessions.length > 0) {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    }
  } catch (e) {
    console.error("Erreur sauvegarde sessions:", e);
  }
}

export const adminService = {
  async getAllUsers(): Promise<UserProfile[]> {
    const stored = getStoredProfiles();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: UserProfile[] = data.map((row: any) => ({
            id: String(row.id),
            email: String(row.email || "").toLowerCase(),
            full_name: String(row.full_name || row.email?.split("@")[0] || "Utilisateur"),
            company_name: String(row.company_name || "Entreprise"),
            phone: row.phone || undefined,
            role: (row.role || (row.email?.toLowerCase() === "medoraelis93@gmail.com" ? "super_admin" : "admin")) as any,
            status: (row.status || (row.email?.toLowerCase() === "medoraelis93@gmail.com" ? "valide" : "en_attente")) as any,
            last_login_at: row.last_login_at || undefined,
            total_seconds_spent: Number(row.total_seconds_spent || 0),
            created_at: row.created_at || new Date().toISOString(),
          }));

          // Fusionner intelligemment Supabase et stored pour ne rien perdre
          const mergedMap = new Map<string, UserProfile>();
          stored.forEach((p) => mergedMap.set(p.email.toLowerCase(), p));
          mapped.forEach((p) => mergedMap.set(p.email.toLowerCase(), p));
          const merged = Array.from(mergedMap.values());
          saveStoredProfiles(merged);
          return merged;
        }
      } catch (err) {
        console.warn("Supabase profiles non accessible, utilisation du cache local", err);
      }
    }

    return stored;
  },

  async updateUserStatus(userId: string, status: "valide" | "en_attente" | "suspendu"): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, status } : p));
    saveStoredProfiles(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("profiles").update({ status, updated_at: new Date().toISOString() }).eq("id", userId);
      } catch (err) {
        console.warn("Erreur Supabase updateUserStatus:", err);
      }
    }

    return true;
  },

  async updateUserRole(userId: string, role: UserProfile["role"]): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) => (p.id === userId ? { ...p, role } : p));
    saveStoredProfiles(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("profiles").update({ role, updated_at: new Date().toISOString() }).eq("id", userId);
      } catch (err) {
        console.warn("Erreur Supabase updateUserRole:", err);
      }
    }

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
  }): Promise<UserProfile> {
    const newId = generateUUID();
    const newProfile: UserProfile = {
      id: newId,
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      company_name: data.company_name.trim(),
      phone: data.phone?.trim() || "",
      role: data.role || "admin",
      status: data.status || "valide",
      total_seconds_spent: 0,
      created_at: new Date().toISOString(),
    };

    // Sauvegarder immédiatement en local (garantit la réactivité 100%)
    const profiles = getStoredProfiles();
    const updated = [newProfile, ...profiles.filter((p) => p.email.toLowerCase() !== newProfile.email.toLowerCase())];
    saveStoredProfiles(updated);

    // Tenter d'insérer dans Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("profiles").upsert({
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          company_name: newProfile.company_name,
          phone: newProfile.phone,
          role: newProfile.role,
          status: newProfile.status,
          total_seconds_spent: 0,
          created_at: newProfile.created_at,
          updated_at: newProfile.created_at,
        });
      } catch (err) {
        console.warn("Erreur insertion Supabase profile:", err);
      }
    }

    return newProfile;
  },

  async deleteUser(userId: string): Promise<boolean> {
    const profiles = getStoredProfiles();
    const updated = profiles.filter((p) => p.id !== userId);
    saveStoredProfiles(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("profiles").delete().eq("id", userId);
      } catch (err) {
        console.warn("Erreur Supabase deleteUser:", err);
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

  async getSessions(): Promise<UserSession[]> {
    const stored = getStoredSessions();
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("user_sessions_log")
          .select("*")
          .order("login_at", { ascending: false })
          .limit(10);

        if (!error && data && data.length > 0) {
          const mapped: UserSession[] = data.map((r: any) => ({
            id: String(r.id),
            user_id: String(r.user_id),
            email: String(r.email || ""),
            full_name: String(r.full_name || ""),
            company_name: String(r.company_name || ""),
            login_at: String(r.login_at || ""),
            duration_seconds: Number(r.duration_seconds || 0),
            is_active: Boolean(r.is_active),
          }));
          saveStoredSessions(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn("Sessions Supabase non disponibles, fallback local", err);
      }
    }

    return stored;
  },

  async recordLogin(user: { id: string; email: string; fullName: string; companyName?: string }): Promise<void> {
    const nowIso = new Date().toISOString();
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) =>
      p.email.toLowerCase() === user.email.toLowerCase()
        ? { ...p, last_login_at: nowIso }
        : p
    );
    saveStoredProfiles(updated);

    const sessions = getStoredSessions();
    const newSession: UserSession = {
      id: "sess-" + Date.now(),
      user_id: user.id,
      email: user.email,
      full_name: user.fullName,
      company_name: user.companyName || "Entreprise",
      login_at: nowIso,
      duration_seconds: 0,
      is_active: true,
    };
    saveStoredSessions([newSession, ...sessions.slice(0, 19)]);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from("profiles").update({ last_login_at: nowIso }).eq("id", user.id);
        await supabase.from("user_sessions_log").insert({
          user_id: user.id,
          email: user.email,
          full_name: user.fullName,
          company_name: user.companyName || "Entreprise",
          login_at: nowIso,
          duration_seconds: 0,
          is_active: true,
        });
      } catch {}
    }
  },

  async addActiveTime(userId: string, seconds: number): Promise<void> {
    const profiles = getStoredProfiles();
    const updated = profiles.map((p) =>
      p.id === userId ? { ...p, total_seconds_spent: (p.total_seconds_spent || 0) + seconds } : p
    );
    saveStoredProfiles(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const user = profiles.find((p) => p.id === userId);
        if (user) {
          await supabase
            .from("profiles")
            .update({ total_seconds_spent: user.total_seconds_spent + seconds })
            .eq("id", userId);
        }
      } catch {}
    }
  },
};
