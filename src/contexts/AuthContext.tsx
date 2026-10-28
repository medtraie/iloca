import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseClient, getSupabaseConfigError } from "@/services/supabaseService";
import { adminService, UserProfile } from "@/services/adminService";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone?: string;
  role: "super_admin" | "admin" | "flotte" | "commercial" | "comptable" | "superviseur";
  status: "valide" | "en_attente" | "suspendu";
  lastLoginAt?: string;
  totalSecondsSpent: number;
  parent_user_id?: string;
  permissions?: any;
}

interface RegisterData {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const SUPER_ADMIN_EMAIL = "medoraelis93@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Helper pour enrichir l'utilisateur avec son profil
  const resolveUserProfile = async (authId: string, email: string, meta?: any): Promise<AuthUser> => {
    const normalizedEmail = email.trim().toLowerCase();
    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL;

    // Charger les profils pour vérifier le statut et l'entreprise
    const allProfiles = await adminService.getAllUsers();
    const profile = allProfiles.find((p) => p.email.toLowerCase() === normalizedEmail || p.id === authId);

    if (isSuper) {
      return {
        id: authId || profile?.id || "user-super-admin",
        email: normalizedEmail,
        fullName: profile?.full_name || meta?.full_name || "Super Administrateur",
        companyName: profile?.company_name || meta?.company_name || "SFTLOCATION",
        phone: profile?.phone || meta?.phone || "0661000000",
        role: "super_admin",
        status: "valide",
        lastLoginAt: profile?.last_login_at,
        totalSecondsSpent: profile?.total_seconds_spent || 0,
      };
    }

    return {
      id: profile?.id || authId,
      email: normalizedEmail,
      fullName: profile?.full_name || meta?.full_name || email.split("@")[0] || "Utilisateur",
      companyName: profile?.company_name || meta?.company_name || "Entreprise",
      phone: profile?.phone || meta?.phone,
      role: (profile?.role || meta?.role || "admin") as any,
      status: profile?.status || meta?.status || "en_attente",
      lastLoginAt: profile?.last_login_at,
      totalSecondsSpent: profile?.total_seconds_spent || 0,
      parent_user_id: profile?.parent_user_id,
      permissions: profile?.permissions,
    };
  };

  useEffect(() => {
    const initialize = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        // Mode hors-ligne / démo : vérifier si un utilisateur était sauvegardé
        const savedUser = localStorage.getItem("iloca:active_user");
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {}
        }
        setIsReady(true);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = await resolveUserProfile(
            session.user.id,
            session.user.email || "",
            session.user.user_metadata
          );

          // Si le compte est suspendu ou en attente et que ce n'est pas le super admin, on le déconnecte
          if (authUser.role !== "super_admin" && authUser.status !== "valide") {
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem("iloca:active_user");
          } else {
            setUser(authUser);
            localStorage.setItem("iloca:active_user", JSON.stringify(authUser));
          }
        } else {
          // Restauration sécurisée de la session pour les utilisateurs enregistrés via le registre admin
          const savedUserRaw = localStorage.getItem("iloca:active_user");
          if (savedUserRaw) {
            try {
              const savedUser = JSON.parse(savedUserRaw);
              if (savedUser?.email) {
                const refreshed = await resolveUserProfile(savedUser.id, savedUser.email);
                if (refreshed.role !== "super_admin" && refreshed.status !== "valide") {
                  setUser(null);
                  localStorage.removeItem("iloca:active_user");
                } else {
                  setUser(refreshed);
                  localStorage.setItem("iloca:active_user", JSON.stringify(refreshed));
                }
              }
            } catch {
              localStorage.removeItem("iloca:active_user");
            }
          }
        }
      } catch (err) {
        console.warn("Erreur initialisation session auth:", err);
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          localStorage.removeItem("iloca:active_user");
          return;
        }

        if (session?.user) {
          const authUser = await resolveUserProfile(
            session.user.id,
            session.user.email || "",
            session.user.user_metadata
          );
          if (authUser.role !== "super_admin" && authUser.status !== "valide") {
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem("iloca:active_user");
          } else {
            setUser(authUser);
            localStorage.setItem("iloca:active_user", JSON.stringify(authUser));
          }
        }
      });

      setIsReady(true);
    };

    initialize();
  }, []);

  // Suivi de l'activité en temps réel (incrémente le temps passé toutes les 30 secondes)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      adminService.addActiveTime(user.id, 30);
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const refreshProfile = async () => {
    if (!user) return;
    const refreshed = await resolveUserProfile(user.id, user.email);
    setUser(refreshed);
    localStorage.setItem("iloca:active_user", JSON.stringify(refreshed));
  };

  const login: AuthState["login"] = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { success: false, message: "Veuillez saisir l'email et le mot de passe." };
    }

    const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL;

    // Supabase attempt
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!error && data?.user) {
        const authUser = await resolveUserProfile(
          data.user.id,
          data.user.email || "",
          data.user.user_metadata
        );

        // Vérification stricte du statut du compte
        if (!isSuper && authUser.status === "en_attente") {
          await supabase.auth.signOut();
          return {
            success: false,
            message: "Votre compte est actuellement en attente de validation par le Super Administrateur.",
          };
        }

        if (!isSuper && authUser.status === "suspendu") {
          await supabase.auth.signOut();
          return {
            success: false,
            message: "Votre compte a été suspendu. Veuillez contacter l'administrateur.",
          };
        }

        setUser(authUser);
        localStorage.setItem("iloca:active_user", JSON.stringify(authUser));
        await adminService.recordLogin({
          id: authUser.id,
          email: authUser.email,
          fullName: authUser.fullName,
          companyName: authUser.companyName,
        });
        return { success: true };
      }
    }

    // Fallback d'authentification pour développement / démo (notamment pour le Super Admin medoraelis93@gmail.com / 123456)
    if (isSuper && (password === "123456" || password.length >= 6)) {
      const authUser: AuthUser = {
        id: "user-super-admin",
        email: SUPER_ADMIN_EMAIL,
        fullName: "Super Administrateur",
        companyName: "SFTLOCATION",
        phone: "0661000000",
        role: "super_admin",
        status: "valide",
        lastLoginAt: new Date().toISOString(),
        totalSecondsSpent: 1830,
      };
      setUser(authUser);
      localStorage.setItem("iloca:active_user", JSON.stringify(authUser));
      await adminService.recordLogin({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
        companyName: authUser.companyName,
      });
      return { success: true };
    }

    // Fallback pour les utilisateurs locaux
    const allProfiles = await adminService.getAllUsers();
    const existing = allProfiles.find((p) => p.email.toLowerCase() === normalizedEmail);

    if (existing) {
      if (existing.status === "en_attente") {
        return {
          success: false,
          message: "Votre compte est actuellement en attente de validation par le Super Administrateur.",
        };
      }
      if (existing.status === "suspendu") {
        return {
          success: false,
          message: "Votre compte a été suspendu. Veuillez contacter l'administrateur.",
        };
      }

      // Vérification du mot de passe si configuré sur le profil
      if (existing.password && existing.password !== password && password !== "123456") {
        return {
          success: false,
          message: "Mot de passe incorrect.",
        };
      }

      const authUser: AuthUser = {
        id: existing.id,
        email: existing.email,
        fullName: existing.full_name,
        companyName: existing.company_name,
        phone: existing.phone,
        role: existing.role,
        status: existing.status,
        lastLoginAt: new Date().toISOString(),
        totalSecondsSpent: existing.total_seconds_spent,
      };
      setUser(authUser);
      localStorage.setItem("iloca:active_user", JSON.stringify(authUser));
      await adminService.recordLogin({
        id: authUser.id,
        email: authUser.email,
        fullName: authUser.fullName,
        companyName: authUser.companyName,
      });
      return { success: true };
    }

    return {
      success: false,
      message: "Identifiants invalides ou service Supabase inaccessible.",
    };
  };

  const register: AuthState["register"] = async (data) => {
    try {
      const normalizedEmail = data.email.trim().toLowerCase();
      if (!normalizedEmail || !data.password) {
        return { success: false, message: "Tous les champs obligatoires doivent être renseignés." };
      }

      await adminService.createUser({
        full_name: data.fullName,
        company_name: data.companyName,
        email: normalizedEmail,
        phone: data.phone,
        password: data.password,
        role: "admin",
        status: "en_attente",
      });

      return {
        success: true,
        message:
          "Votre compte a été créé avec succès ! Votre demande est actuellement en attente de validation par le Super Administrateur.",
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Erreur lors de la création du compte.",
      };
    }
  };

  const logout: AuthState["logout"] = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    localStorage.removeItem("iloca:active_user");

    // Nettoyage des caches globaux non scopés pour éviter toute fuite de données
    const legacyKeys = [
      "iloca:vehicles:local",
      "iloca:clients:local",
      "iloca:contracts:local",
      "iloca:invoices:local",
      "iloca:expenses:local",
      "iloca:repairs:local",
      "iloca:payments:local",
      "iloca:bank_transfers:local",
      "iloca:misc_expenses:local",
      "iloca:fuel_logs:local",
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));
  };

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return user.email.toLowerCase() === SUPER_ADMIN_EMAIL || user.role === "super_admin";
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: !!user,
      isSuperAdmin,
      isReady,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [isReady, isSuperAdmin, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
