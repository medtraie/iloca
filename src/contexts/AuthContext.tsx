import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
}

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

const AUTH_USERS_KEY = "auth:users";
const AUTH_SESSION_KEY = "auth:session";

const AuthContext = createContext<AuthState | undefined>(undefined);

const hashPassword = async (plainText: string) => {
  const normalized = plainText.trim();
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(normalized);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return btoa(normalized);
};

const toAuthUser = (stored: StoredUser): AuthUser => ({
  id: stored.id,
  email: stored.email,
  fullName: stored.fullName
});

const getUsersFromStorage = (): StoredUser[] => {
  try {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
};

const setUsersInStorage = (users: StoredUser[]) => {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
};

const setSessionInStorage = (user: AuthUser | null) => {
  if (!user) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(user));
};

const getSessionFromStorage = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const users = getUsersFromStorage();
      if (!users.length) {
        const defaultUser: StoredUser = {
          id: "u-admin",
          email: "admin@sftlocation.ma",
          passwordHash: await hashPassword("admin123"),
          fullName: "Administrateur"
        };
        setUsersInStorage([defaultUser]);
      }
      setUser(getSessionFromStorage());
      setIsReady(true);
    };
    initialize();
  }, []);

  const login: AuthState["login"] = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return { success: false, message: "Veuillez saisir l'email et le mot de passe." };
    }

    const users = getUsersFromStorage();
    const candidate = users.find((stored) => stored.email.toLowerCase() === normalizedEmail);
    if (!candidate) {
      return { success: false, message: "Identifiants invalides." };
    }

    const incomingHash = await hashPassword(password);
    if (incomingHash !== candidate.passwordHash) {
      return { success: false, message: "Identifiants invalides." };
    }

    const authUser = toAuthUser(candidate);
    setUser(authUser);
    setSessionInStorage(authUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setSessionInStorage(null);
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

