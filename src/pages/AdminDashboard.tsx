import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Shield,
  Users,
  UserCheck,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  CheckCircle2,
  PauseCircle,
  Check,
  Radio,
  Car,
  FileText,
  Receipt,
  Wrench,
  Activity,
  CreditCard,
  Building,
} from "lucide-react";
import { adminService, UserProfile, UserSession } from "@/services/adminService";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "valide" | "en_attente">("all");

  // Modal states
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  // Form state for new user
  const [newFullName, setNewFullName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserProfile["role"]>("admin");
  const [newStatus, setNewStatus] = useState<UserProfile["status"]>("valide");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    try {
      const [u, s] = await Promise.all([adminService.getAllUsers(), adminService.getSessions()]);
      if (Array.isArray(u) && u.length > 0) {
        setUsers(u);
      }
      if (Array.isArray(s) && s.length > 0) {
        setSessions(s);
      }
    } catch (err) {
      console.error("Erreur chargement données admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to "30m 30s" or "2h 15m"
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "Jamais connecté";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Jamais";
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR")}`;
    } catch {
      return "Jamais";
    }
  };

  // Metrics
  const totalGlobalSeconds = useMemo(() => {
    return users.reduce((sum, u) => sum + (u.total_seconds_spent || 0), 0);
  }, [users]);

  const totalOpenSessions = useMemo(() => {
    return Math.max(1, sessions.filter((s) => s.is_active).length || sessions.length);
  }, [sessions]);

  const avgSessionsPerAccount = useMemo(() => {
    if (users.length === 0) return "0.0";
    return (Math.max(1, sessions.length) / users.length).toFixed(1);
  }, [sessions, users]);

  const validatedCount = useMemo(() => users.filter((u) => u.status === "valide").length, [users]);
  const pendingUsers = useMemo(() => users.filter((u) => u.status === "en_attente"), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const company = (u.company_name || "").toLowerCase();
      const query = (searchTerm || "").toLowerCase().trim();

      const matchesSearch = !query || name.includes(query) || email.includes(query) || company.includes(query);

      if (!matchesSearch) return false;
      if (statusFilter === "valide") return u.status === "valide";
      if (statusFilter === "en_attente") return u.status === "en_attente";
      return true;
    });
  }, [users, searchTerm, statusFilter]);

  // Actions
  const handleValidateUser = async (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "valide" } : u)));
    await adminService.updateUserStatus(userId, "valide");
    toast({ title: "Compte validé", description: "L'utilisateur a désormais un accès complet à la plateforme." });
    await loadData();
  };

  const handleSuspendUser = async (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "suspendu" } : u)));
    await adminService.updateUserStatus(userId, "suspendu");
    toast({ title: "Compte suspendu", description: "L'accès de cet utilisateur a été bloqué.", variant: "destructive" });
    await loadData();
  };

  const handleReactivateUser = async (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "valide" } : u)));
    await adminService.updateUserStatus(userId, "valide");
    toast({ title: "Compte réactivé", description: "L'utilisateur peut de nouveau se connecter." });
    await loadData();
  };

  const handleRoleChange = async (userId: string, newRoleValue: UserProfile["role"]) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRoleValue } : u)));
    await adminService.updateUserRole(userId, newRoleValue);
    toast({ title: "Rôle mis à jour", description: `Le rôle a été changé en : ${newRoleValue}` });
    await loadData();
  };

  const handleDeleteUserConfirmed = async () => {
    if (!userToDelete) return;
    const idToDelete = userToDelete.id;
    setUsers((prev) => prev.filter((u) => u.id !== idToDelete));
    await adminService.deleteUser(idToDelete);
    toast({ title: "Utilisateur supprimé", description: "Le compte a été retiré définitivement." });
    setUserToDelete(null);
    await loadData();
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName || !newCompany) {
      toast({ title: "Erreur", description: "Veuillez renseigner le nom, l'entreprise et l'email.", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const created = await adminService.createUser({
        full_name: newFullName,
        company_name: newCompany,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        status: newStatus,
        password: newUserPassword || "123456",
      });

      // Mise à jour optimiste immédiate de la liste
      setUsers((prev) => [created, ...prev.filter((p) => p.email.toLowerCase() !== created.email.toLowerCase())]);

      toast({
        title: "Utilisateur créé avec succès",
        description: `Le compte pour ${created.full_name} (${created.company_name}) est prêt.`,
      });

      setIsAddUserOpen(false);
      setNewFullName("");
      setNewCompany("");
      setNewEmail("");
      setNewPhone("");
      setNewUserPassword("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Impossible de créer l'utilisateur.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit comporter au moins 6 caractères.", variant: "destructive" });
      return;
    }
    await adminService.updateUserPassword(selectedUserForPassword.id, newPassword);
    toast({ title: "Mot de passe mis à jour", description: `Nouveau mot de passe assigné à ${selectedUserForPassword.email}` });
    setIsPasswordModalOpen(false);
    setSelectedUserForPassword(null);
    setNewPassword("");
  };

  return (
    <div className="space-y-6 font-tajawal pb-12">
      {/* 1. Header with green bar accent and live pill */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 sm:p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-7 bg-emerald-500 rounded-full shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            Centre d'Analyse d'Utilisation & Sessions Actives
          </h1>
        </div>

        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
          <span>Contrôle d'accès en direct</span>
        </div>
      </div>

      {/* 2. Top Metric Cards (3 KPI Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Temps global d'utilisation
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {formatDuration(totalGlobalSeconds)}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total des sessions ouvertes
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {totalOpenSessions} session{totalOpenSessions > 1 ? "s" : ""}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Shield className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3 */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Moyenne de sessions par compte
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
                {avgSessionsPerAccount}
              </h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. FLUX DE CONNEXION & ACTIVITÉ RÉCENTE */}
      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Flux de connexion & activité récente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">Aucune session récente enregistrée.</p>
          ) : (
            sessions.slice(0, 4).map((sess) => (
              <div
                key={sess.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40 gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="font-bold text-sm text-foreground">{sess.full_name}</span>
                  <span className="text-muted-foreground">|</span>
                  <Badge variant="outline" className="text-xs font-medium bg-background/80">
                    {sess.company_name}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground self-end sm:self-auto font-mono">
                  <span>Connexion: {formatDate(sess.login_at)}</span>
                  <span className="font-semibold text-emerald-600">
                    Actif: {sess.duration_seconds > 0 ? formatDuration(sess.duration_seconds) : "En cours"}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* 4. User Summary Counters (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total utilisateurs
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">{users.length}</h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-foreground">
              <Users className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Comptes validés & actifs
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{validatedCount}</h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                En attente de validation
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-500 mt-1">{pendingUsers.length}</h2>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Demandes d'inscription en attente de validation */}
      {pendingUsers.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-400/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Demandes d'inscription en attente de validation ({pendingUsers.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ces utilisateurs ne peuvent pas accéder à l'ERP tant que vous ne validez pas leur compte.
                </p>
              </div>
            </div>

            <Badge className="bg-amber-500 text-black font-bold uppercase text-[10px] tracking-wider self-start sm:self-auto px-2.5 py-1">
              Action requise
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingUsers.map((pending) => {
              const initials = (pending.full_name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={pending.id}
                  className="p-4 rounded-xl bg-background border border-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm shrink-0">
                      {initials || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{pending.full_name}</span>
                        <Badge variant="outline" className="text-[10px] bg-muted/30">
                          {pending.role === "admin" ? "Administrateur" : pending.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{pending.email}</p>
                      <p className="text-[11px] text-muted-foreground/80">{pending.company_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUserToDelete(pending);
                      }}
                      className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Rejeter / Supprimer
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleValidateUser(pending.id)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valider le compte
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. Two Columns: Répertoire des Utilisateurs (Left) & Matrice des Rôles (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Répertoire des utilisateurs (8 of 12 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base font-bold uppercase tracking-wider text-foreground">
                      Répertoire des utilisateurs
                    </CardTitle>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contrôlez les statuts (Valider / Suspendre) et les suppressions
                  </p>
                </div>

                {/* Bouton + Nouvel utilisateur avec DialogTrigger direct */}
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 self-start sm:self-auto shadow-sm"
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      + Nouvel utilisateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="font-tajawal max-w-md">
                    <DialogHeader>
                      <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
                      <DialogDescription>
                        Créez un compte entreprise directement pour donner accès à la plateforme.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateUserSubmit} className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullname">Nom complet</Label>
                        <Input
                          id="fullname"
                          value={newFullName}
                          onChange={(e) => setNewFullName(e.target.value)}
                          placeholder="Ex: Youssef Bennani"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="company">Entreprise / Société</Label>
                        <Input
                          id="company"
                          value={newCompany}
                          onChange={(e) => setNewCompany(e.target.value)}
                          placeholder="Ex: AutoRent SARL"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="nom@societe.com"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Téléphone</Label>
                          <Input
                            id="phone"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="0661..."
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="password">Mot de passe temporaire</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="123456"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Rôle</Label>
                          <Select value={newRole} onValueChange={(val: UserProfile["role"]) => setNewRole(val)}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-tajawal text-xs">
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="flotte">Gestionnaire Flotte</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="comptable">Comptable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label>Statut d'accès</Label>
                          <Select value={newStatus} onValueChange={(val: UserProfile["status"]) => setNewStatus(val)}>
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="font-tajawal text-xs">
                              <SelectItem value="valide">Validé / Actif direct</SelectItem>
                              <SelectItem value="en_attente">En attente de validation</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DialogFooter className="pt-3">
                        <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isCreating}>
                          Annuler
                        </Button>
                        <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isCreating}>
                          {isCreating ? "Création..." : "Créer l'utilisateur"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Search & Filter pills */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                      statusFilter === "all"
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tous ({users.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("valide")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                      statusFilter === "valide"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Validés ({validatedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusFilter("en_attente")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all ${
                      statusFilter === "en_attente"
                        ? "bg-amber-500 text-black shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    En attente ({pendingUsers.length})
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/20 border-y border-border/50 text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Entreprise / Société</th>
                      <th className="py-3 px-3">Rôle</th>
                      <th className="py-3 px-3">Dernière Connexion</th>
                      <th className="py-3 px-3">Temps Passé</th>
                      <th className="py-3 px-3">Statut</th>
                      <th className="py-3 px-4 text-right">Actions du compte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground italic">
                          Aucun utilisateur trouvé.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelf = (u.email || "").toLowerCase() === "medoraelis93@gmail.com";

                        return (
                          <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                            {/* Entreprise / Société */}
                            <td className="py-3.5 px-4 font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 font-bold text-xs">
                                  {u.company_name ? u.company_name[0].toUpperCase() : "E"}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{u.company_name || "Entreprise"}</div>
                                  <div className="text-[11px] text-muted-foreground font-normal">
                                    {u.full_name} • {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Rôle */}
                            <td className="py-3.5 px-3">
                              {isSelf ? (
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 font-bold">
                                  Super Admin
                                </Badge>
                              ) : (
                                <Select
                                  value={u.role}
                                  onValueChange={(val: UserProfile["role"]) => handleRoleChange(u.id, val)}
                                >
                                  <SelectTrigger className="h-7 text-xs w-[130px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="font-tajawal text-xs">
                                    <SelectItem value="admin">Administrateur</SelectItem>
                                    <SelectItem value="flotte">Gest. Flotte</SelectItem>
                                    <SelectItem value="commercial">Commercial</SelectItem>
                                    <SelectItem value="comptable">Comptable</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </td>

                            {/* Dernière Connexion */}
                            <td className="py-3.5 px-3 font-mono text-[11px] text-muted-foreground">
                              {formatDate(u.last_login_at)}
                            </td>

                            {/* Temps Passé */}
                            <td className="py-3.5 px-3 font-semibold text-foreground">
                              {formatDuration(u.total_seconds_spent)}
                            </td>

                            {/* Statut */}
                            <td className="py-3.5 px-3">
                              {u.status === "valide" && (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Validé / Actif
                                </Badge>
                              )}
                              {u.status === "en_attente" && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-300 gap-1 font-medium"
                                >
                                  <Clock className="h-3 w-3" />
                                  En attente
                                </Badge>
                              )}
                              {u.status === "suspendu" && (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-50 text-rose-700 border-rose-300 gap-1 font-medium"
                                >
                                  <PauseCircle className="h-3 w-3" />
                                  Suspendu
                                </Badge>
                              )}
                            </td>

                            {/* Actions du compte */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isSelf && (
                                  <>
                                    {u.status === "valide" ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSuspendUser(u.id)}
                                        className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1"
                                      >
                                        <PauseCircle className="h-3 w-3" />
                                        Suspendre
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleReactivateUser(u.id)}
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                      >
                                        <Check className="h-3 w-3" />
                                        Valider
                                      </Button>
                                    )}
                                  </>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForPassword(u);
                                    setIsPasswordModalOpen(true);
                                  }}
                                  className="h-7 text-xs hover:bg-muted gap-1 text-muted-foreground hover:text-foreground"
                                  title="Changer mot de passe"
                                >
                                  <KeyRound className="h-3 w-3" />
                                  Mdps
                                </Button>

                                {!isSelf && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUserToDelete(u)}
                                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    title="Supprimer définitivement"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Matrice des Rôles & Sécurité (Sections exactes de l'application de location) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Matrice des rôles & sécurité
                </CardTitle>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Permissions par module de l'ERP de location
              </p>
            </CardHeader>

            <CardContent className="p-4 space-y-5 text-xs">
              {/* Rôle 1: Administrateur Système / Gérant */}
              <div className="space-y-2">
                <div className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold w-fit">
                  Administrateur Système (Gérant)
                </div>
                <ul className="space-y-1.5 pl-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-foreground/90">Tableau de bord & Rapports d'activité</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Gestion intégrale de la Flotte & Véhicules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Gestion des Contrats & Signature électronique</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Fiches Clients, Locataires & Documents (CIN/Permis)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Réparations, Ordres d'Atelier & Suivi GPS en direct</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Facturation, Revenus, Dépenses & Trésorerie</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Gestion des Chèques de garantie & Caisses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Contrôle Utilisateurs (Valider, Suspendre, Supprimer)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Paramètres Fiscaux, Entreprise (ICE, RC) & Tarifs</span>
                  </li>
                </ul>
              </div>

              {/* Rôle 2: Gestionnaire de Flotte */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold w-fit">
                  Gestionnaire de Flotte
                </div>
                <ul className="space-y-1.5 pl-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-foreground/90">Tableau de bord Flotte & Disponibilité</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Fiches Véhicules, Kilométrage & Cartes grises</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Gestion des Réparations & Ateliers mécaniques</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Carte de la flotte & Suivi GPS en temps réel</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Alertes d'échéances (Assurance, Vidange, Visite)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Fiches de retour véhicules & Contrôle dégâts</span>
                  </li>
                </ul>
              </div>

              {/* Rôle 3: Commercial / Agent de comptoir */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold w-fit">
                  Vendeur / Commercial
                </div>
                <ul className="space-y-1.5 pl-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-foreground/90">Consultation du parc & Réservations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Création, Prolongation & Signature Contrats</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Fiches Clients, CRM & Contrôle CIN / Permis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Enregistrement des Avances & Cautions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Émission des Devis & Factures de location</span>
                  </li>
                </ul>
              </div>

              {/* Rôle 4: Comptable / Audit */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold w-fit">
                  Comptable / Audit Financier
                </div>
                <ul className="space-y-1.5 pl-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-foreground/90">Suivi des Revenus & Recettes journalières</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Pointage & Saisie des Dépenses (Carburant, charges)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Facturation (Factures clients, Déclarations TVA)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Gestion des Chèques (Cautions & Encaissements)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Suivi de la Trésorerie, Comptes bancaires & Caisses</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Rapports financiers, Balances & Exports</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Modifier mot de passe */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="font-tajawal max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier le mot de passe</DialogTitle>
            <DialogDescription>
              Assigner un nouveau mot de passe pour {selectedUserForPassword?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pass">Nouveau mot de passe</Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                Enregistrer le mot de passe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Confirmer Suppression */}
      <AlertDialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le compte de{" "}
              <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email}) ? Toutes ses données associées
              seront purgées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUserConfirmed}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
