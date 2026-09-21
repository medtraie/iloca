import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserPlus, LogIn, Building2, User, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseConfigError, isSupabaseConfigured } from "@/services/supabaseService";

const Login = () => {
  const { isAuthenticated, isReady, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const configError = !isSupabaseConfigured() ? getSupabaseConfigError() : "";

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  const onLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Échec de connexion.");
      setIsSubmitting(false);
      return;
    }
    navigate(from, { replace: true });
  };

  const onRegisterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");

    if (registerPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setIsSubmitting(false);
      return;
    }

    if (registerPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      setIsSubmitting(false);
      return;
    }

    const res = await register({
      fullName,
      companyName,
      email: registerEmail,
      phone,
      password: registerPassword,
    });

    setIsSubmitting(false);
    if (!res.success) {
      setError(res.message || "Erreur lors de la création du compte.");
      return;
    }

    setSuccessMessage(
      res.message || "Votre compte a été créé avec succès ! Il est actuellement en attente de validation par le Super Administrateur."
    );
    // Reset form
    setFullName("");
    setCompanyName("");
    setPhone("");
    setRegisterEmail("");
    setRegisterPassword("");
    setConfirmPassword("");
  };

  if (!isReady) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground font-tajawal">Chargement...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-8 bg-gradient-to-b from-background via-muted/20 to-background safe-pt safe-pb font-tajawal">
      <Card className="w-full max-w-lg shadow-xl border-border/60">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Plateforme de Gestion & Accès</span>
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight">
            {mode === "login" ? "Connexion à votre espace" : "Créer un nouveau compte"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Accédez à votre tableau de bord et à la gestion de votre flotte."
              : "Remplissez le formulaire pour soumettre votre demande d'accès à l'administrateur."}
          </CardDescription>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl mt-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setSuccessMessage("");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
                setSuccessMessage("");
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Créer un compte
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Demande transmise avec succès</p>
                <p className="leading-relaxed">{successMessage}</p>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 underline"
                >
                  Retourner à la page de connexion
                </button>
              </div>
            </div>
          )}

          {mode === "login" ? (
            <form className="space-y-4" onSubmit={onLoginSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@entreprise.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              {configError ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {configError}
                  <div className="mt-1 text-[11px]">
                    Configurez `VITE_SUPABASE_PUBLISHABLE_KEY` dans `.env` pour la synchronisation en ligne.
                  </div>
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Connexion..." : "Se connecter"}
              </Button>

              <div className="pt-2 text-center text-xs text-muted-foreground">
                Compte Super Administrateur :{" "}
                <button
                  type="button"
                  onClick={() => {
                    setEmail("medoraelis93@gmail.com");
                    setPassword("123456");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  medoraelis93@gmail.com
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={onRegisterSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-fullname">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-fullname"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Mohamed Alami"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-company">Entreprise / Société</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Ex: StockPro SARL"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email professionnel</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="contact@societe.com"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0661..."
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass">Mot de passe</Label>
                  <Input
                    id="reg-pass"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Min. 6 caractères"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm">Confirmer mot de passe</Label>
                  <Input
                    id="reg-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                <span className="font-bold">Information importante :</span> À la soumission, votre compte sera placé en statut <strong>En attente de validation</strong>. L'accès aux fonctionnalités sera activé dès la confirmation par le Super Administrateur.
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
                {isSubmitting ? "Création en cours..." : "Soumettre la demande d'inscription"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
