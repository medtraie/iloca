import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/services/supabaseService";

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsReady(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          fullName: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Utilisateur"
        });
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            fullName: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Utilisateur"
          });
        } else {
          setUser(null);
        }
      });

      setIsReady(true);
    };

    initialize();
  }, []);

  const login: AuthState["login"] = async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, message: "Service d'authentification non configuré." };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { success: false, message: "Veuillez saisir l'email et le mot de passe." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return { success: false, message: "Identifiants invalides." };
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || "",
        fullName: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Utilisateur"
      });
      return { success: true };
    }

    return { success: false, message: "Erreur inattendue." };
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: !!user,
      isReady,
      login,
      logout
    }),
    [isReady, user]
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
