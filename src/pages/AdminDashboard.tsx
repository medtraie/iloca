import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Shield,
  Clock,
  UserCheck,
  PauseCircle,
  Trash2,
  KeyRound,
  Search,
  CheckCircle2,
  Radio,
  Sparkles,
  Plus,
  RefreshCw,
  Eye,
  Activity,
  Zap,
  Building2,
  Mail,
  Phone,
  ShieldAlert,
  HardDrive,
  Globe,
  Monitor,
  Layers,
  Check,
  SlidersHorizontal,
  FileText,
  Car,
  Receipt,
  Wrench,
  BarChart3,
  CreditCard,
  Wallet,
  MapPin,
  Lock,
  ChevronRight,
  ShieldCheck,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminService, UserProfile, UserSession } from "@/services/adminService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "valide" | "en_attente" | "suspendu">("all");

  // Modals & Drawers
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToInspect, setUserToInspect] = useState<UserProfile | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  // Quota Edit state
  const [editMaxVehicles, setEditMaxVehicles] = useState(50);
  const [editSubscription, setEditSubscription] = useState<UserProfile["subscription_plan"]>("Pro");
  const [isSavingQuotas, setIsSavingQuotas] = useState(false);

  // Form state for new user
  const [newFullName, setNewFullName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserProfile["role"]>("admin");
  const [newStatus, setNewStatus] = useState<UserProfile["status"]>("valide");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newMaxVehicles, setNewMaxVehicles] = useState(50);
  const [newSubscription, setNewSubscription] = useState<UserProfile["subscription_plan"]>("Pro");
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
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "0s";
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
      return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
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

  const validatedCount = useMemo(() => users.filter((u) => u.status === "valide").length, [users]);
  const pendingUsers = useMemo(() => users.filter((u) => u.status === "en_attente"), [users]);
  const suspendedCount = useMemo(() => users.filter((u) => u.status === "suspendu").length, [users]);

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
      if (statusFilter === "suspendu") return u.status === "suspendu";
      return true;
    });
  }, [users, searchTerm, statusFilter]);

  // Actions
  const handleValidateUser = async (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "valide" } : u)));
    await adminService.updateUserStatus(userId, "valide");
    toast({ title: "Compte validé avec succès", description: "L'utilisateur a désormais accès à l'ERP SFTLOCATION." });
    await loadData();
  };

  const handleSuspendUser = async (userId: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "suspendu" } : u)));
    await adminService.updateUserStatus(userId, "suspendu");
    toast({ title: "Compte suspendu", description: "L'accès de cet utilisateur a été verrouillé.", variant: "destructive" });
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
    toast({ title: "Rôle mis à jour", description: `Nouveau rôle assigné : ${newRoleValue}` });
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

  const handleOpenInspectModal = (u: UserProfile) => {
    setUserToInspect(u);
    setEditMaxVehicles(u.max_vehicles_quota || 50);
    setEditSubscription(u.subscription_plan || "Pro");
    setIsInspectModalOpen(true);
  };

  const handleSaveQuotas = async () => {
    if (!userToInspect) return;
    setIsSavingQuotas(true);
    try {
      await adminService.updateUserQuotas(userToInspect.id, {
        max_vehicles_quota: editMaxVehicles,
        subscription_plan: editSubscription,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToInspect.id
            ? { ...u, max_vehicles_quota: editMaxVehicles, subscription_plan: editSubscription }
            : u
        )
      );
      toast({ title: "Quotas mis à jour", description: `Quotas modifiés pour ${userToInspect.company_name}.` });
      setIsInspectModalOpen(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour les quotas.", variant: "destructive" });
    } finally {
      setIsSavingQuotas(false);
    }
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
        max_vehicles_quota: newMaxVehicles,
        subscription_plan: newSubscription,
      });

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
    <div className="space-y-8 font-tajawal pb-20">
      {/* 1. Header 2026 Edition avec gradient d'excellence & commandes */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/30">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              <span>Gouvernance SFTLOCATION 2026 en Direct</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Panel Super Administrateur</span>
              <Sparkles className="h-6 w-6 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
              Contrôle global des accès, audit des sessions en temps réel et validation des comptes agences de la plateforme ERP SFTLOCATION.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-bold gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualiser</span>
            </Button>

            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/25 text-xs gap-2 px-4">
                  <Plus className="h-4 w-4" />
                  <span>Nouvel Utilisateur</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg font-tajawal rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                    <UserCheck className="h-5 w-5 text-emerald-600" />
                    Créer un nouveau compte d'accès ERP
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Créez immédiatement un compte entreprise. Il apparaîtra instantanément dans le panneau et Supabase.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateUserSubmit} className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullname">Nom & Prénom</Label>
                      <Input
                        id="fullname"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Ex: Mohamed Alami"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="company">Société / Agence</Label>
                      <Input
                        id="company"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="Ex: SFTLOCATION"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email professionnel</Label>
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
                        placeholder="0661000000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
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
                    <div className="space-y-1.5">
                      <Label>Rôle ERP</Label>
                      <Select value={newRole} onValueChange={(val: UserProfile["role"]) => setNewRole(val)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-tajawal text-xs">
                          <SelectItem value="admin">Administrateur Agence</SelectItem>
                          <SelectItem value="flotte">Gestionnaire Flotte</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="comptable">Comptable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Statut d'Accès</Label>
                      <Select value={newStatus} onValueChange={(val: UserProfile["status"]) => setNewStatus(val)}>
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-tajawal text-xs">
                          <SelectItem value="valide">Validé / Actif immédiat</SelectItem>
                          <SelectItem value="en_attente">En attente de validation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Formule Licence</Label>
                      <Select
                        value={newSubscription}
                        onValueChange={(val: UserProfile["subscription_plan"]) => setNewSubscription(val)}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-tajawal text-xs">
                          <SelectItem value="Trial">Essai 14 jours</SelectItem>
                          <SelectItem value="Pro">Professionnel (50 véhicules)</SelectItem>
                          <SelectItem value="Enterprise">Enterprise (200 véhicules)</SelectItem>
                          <SelectItem value="Unlimited">Illimité SFT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isCreating}>
                      Annuler
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isCreating}>
                      {isCreating ? "Création..." : "Créer le compte"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards 2026 Style (4 Cards KPI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Temps global */}
        <Card className="rounded-2xl border border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Temps Global Utilisé</span>
              </p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                {formatDuration(totalGlobalSeconds)}
              </h2>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                Cumul actif des sessions
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Sessions ouvertes */}
        <Card className="rounded-2xl border border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                <span>Sessions Actives</span>
              </p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                {totalOpenSessions} session{totalOpenSessions > 1 ? "s" : ""}
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">En direct sur la plateforme</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Globe className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total utilisateurs */}
        <Card className="rounded-2xl border border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Comptes Enregistrés</span>
              </p>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{users.length}</h2>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-emerald-600 font-bold">{validatedCount} validé(s)</span>
                {suspendedCount > 0 && <span className="text-rose-500 font-bold">• {suspendedCount} suspendu(s)</span>}
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <UserCheck className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: En attente */}
        <Card
          className={`rounded-2xl border shadow-sm transition-shadow ${
            pendingUsers.length > 0
              ? "border-amber-500/40 bg-amber-500/5 shadow-amber-500/5"
              : "border-border/50 bg-card"
          }`}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                <span>En Attente de Validation</span>
              </p>
              <h2 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                {pendingUsers.length} demande{pendingUsers.length > 1 ? "s" : ""}
              </h2>
              <p className="text-[11px] text-amber-600/90 font-medium">
                {pendingUsers.length > 0 ? "Action requise ci-dessous" : "Aucune demande en attente"}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Banner animée des demandes d'inscription en attente */}
      {pendingUsers.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-2 border-amber-500/30 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-bold shrink-0 shadow-md">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">
                  Demandes d'inscription en attente de validation ({pendingUsers.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ces utilisateurs ont soumis un formulaire et attendent la confirmation du Super Administrateur.
                </p>
              </div>
            </div>

            <Badge className="bg-amber-500 text-black font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 self-start sm:self-auto">
              ACTION REQUISE
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
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
                  className="p-4 rounded-2xl bg-background border border-amber-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-center text-sm shrink-0 border border-amber-500/30">
                      {initials || "U"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-foreground">{pending.full_name}</span>
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-300">
                          {pending.company_name}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{pending.email}</p>
                      <p className="text-[11px] text-muted-foreground/80">Soumis le : {formatDate(pending.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserToDelete(pending)}
                      className="h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1 font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Rejeter
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleValidateUser(pending.id)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold shadow-md shadow-emerald-600/20"
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

      {/* 4. Table des Utilisateurs & Accès (PLEINE LARGEUR 100% WIDTH - 2026 DESIGN) */}
      <Card className="rounded-3xl border border-border/50 shadow-md overflow-hidden bg-card">
        <CardHeader className="bg-muted/20 pb-4 border-b border-border/40 space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold text-foreground tracking-tight">
                  Répertoire des Utilisateurs & Accès (Pleine Largeur)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Gérez les comptes, les statuts d'accès, les autorisations et les quotas d'utilisation en temps réel.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-extrabold px-3 py-1 bg-background shadow-sm">
                Total: {users.length} Compte{users.length > 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Search Bar & Status Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par société, nom ou adresse email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-xs rounded-2xl bg-background border-border/60"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shrink-0 ${
                  statusFilter === "all"
                    ? "bg-foreground text-background shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Tous ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("valide")}
                className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shrink-0 ${
                  statusFilter === "valide"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                Validés ({validatedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("en_attente")}
                className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shrink-0 ${
                  statusFilter === "en_attente"
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                En attente ({pendingUsers.length})
              </button>
              {suspendedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("suspendu")}
                  className={`px-4 py-2 text-xs rounded-xl font-bold transition-all shrink-0 ${
                    statusFilter === "suspendu"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Suspendus ({suspendedCount})
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border/40">
                <tr>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[250px]">Entreprise & Société</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[200px]">Utilisateur Principal</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[150px]">Rôle & Permissions</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[150px]">Formule & Quota</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[140px]">Dernière Connexion</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[110px]">Temps Actif</th>
                  <th className="py-4 px-4 whitespace-nowrap min-w-[130px]">Statut d'Accès</th>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[220px] text-right">Actions du Compte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground italic">
                      Aucun utilisateur ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.email.toLowerCase() === "medoraelis93@gmail.com";
                    const initials = (u.full_name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase();

                    return (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        {/* Entreprise & Société */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20 shadow-sm">
                              {initials || "U"}
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-extrabold text-foreground text-sm flex items-center gap-2">
                                <span>{u.company_name}</span>
                                {isSelf && (
                                  <Badge className="text-[9px] px-2 py-0 bg-emerald-600 text-white font-extrabold uppercase">
                                    Super Admin
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">ID: {u.id.substring(0, 13)}...</p>
                            </div>
                          </div>
                        </td>

                        {/* Utilisateur Principal */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground text-xs">{u.full_name}</span>
                            <p className="text-[11px] font-mono text-muted-foreground">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-muted-foreground">{u.phone}</p>}
                          </div>
                        </td>

                        {/* Rôle */}
                        <td className="py-4 px-4">
                          {isSelf ? (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 font-extrabold text-xs">
                              Super Admin
                            </Badge>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(val: UserProfile["role"]) => handleRoleChange(u.id, val)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[140px] rounded-xl font-medium">
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

                        {/* Formule & Quota */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-[10px] bg-background font-bold">
                              {u.subscription_plan || "Pro"} ({u.max_vehicles_quota || 50} Véhic.)
                            </Badge>
                          </div>
                        </td>

                        {/* Dernière Connexion */}
                        <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground">
                          {formatDate(u.last_login_at)}
                        </td>

                        {/* Temps Passé */}
                        <td className="py-4 px-4 font-extrabold text-foreground">
                          {formatDuration(u.total_seconds_spent)}
                        </td>

                        {/* Statut */}
                        <td className="py-4 px-4">
                          {u.status === "valide" && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 gap-1.5 font-bold py-1 px-2.5"
                            >
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Validé / Actif
                            </Badge>
                          )}
                          {u.status === "en_attente" && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1.5 font-bold py-1 px-2.5"
                            >
                              <Clock className="h-3 w-3" />
                              En attente
                            </Badge>
                          )}
                          {u.status === "suspendu" && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 gap-1.5 font-bold py-1 px-2.5"
                            >
                              <PauseCircle className="h-3 w-3" />
                              Suspendu
                            </Badge>
                          )}
                        </td>

                        {/* Actions du compte */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inspecter le compte */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInspectModal(u)}
                              className="h-8 text-xs bg-muted/40 hover:bg-muted font-bold gap-1 px-2.5 rounded-xl border-border/60"
                              title="Inspecter les détails & quotas"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>Inspecter</span>
                            </Button>

                            {!isSelf && (
                              <>
                                {u.status === "valide" ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSuspendUser(u.id)}
                                    className="h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 font-bold rounded-xl"
                                    title="Suspendre l'accès"
                                  >
                                    <PauseCircle className="h-3.5 w-3.5" />
                                    <span>Suspendre</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleReactivateUser(u.id)}
                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold rounded-xl shadow-md shadow-emerald-600/20"
                                    title="Valider le compte"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Valider</span>
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
                              className="h-8 text-xs hover:bg-muted gap-1 text-muted-foreground hover:text-foreground rounded-xl"
                              title="Changer le mot de passe"
                            >
                              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                              <span>Mdps</span>
                            </Button>

                            {!isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUserToDelete(u)}
                                className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl"
                                title="Supprimer définitivement"
                              >
                                <Trash2 className="h-4 w-4" />
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

      {/* 5. Matrice des Rôles & Sécurité ERP 2026 (PLACÉE EN BAS SUR 100% DE LARGEUR) */}
      <Card className="rounded-3xl border border-border/50 shadow-lg overflow-hidden bg-card">
        <CardHeader className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold tracking-tight text-white">
                  Matrice des Rôles & Sécurité ERP SFTLOCATION (Édition 2026)
                </CardTitle>
                <CardDescription className="text-xs text-emerald-200/80">
                  Vue détaillée des autorisations par module métiers pour chaque profil de l'ERP Location.
                </CardDescription>
              </div>
            </div>

            <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs px-3 py-1">
              MATRICE NATIVE 2026
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="super_admin" className="w-full space-y-6">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-muted/60 p-1.5 rounded-2xl h-auto gap-1">
              <TabsTrigger value="super_admin" className="py-2.5 text-xs font-extrabold rounded-xl gap-2">
                <ShieldCheck className="h-4 w-4 text-rose-500" />
                <span>Super Admin</span>
              </TabsTrigger>
              <TabsTrigger value="admin" className="py-2.5 text-xs font-extrabold rounded-xl gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Admin Agence</span>
              </TabsTrigger>
              <TabsTrigger value="flotte" className="py-2.5 text-xs font-extrabold rounded-xl gap-2">
                <Car className="h-4 w-4 text-blue-600" />
                <span>Gest. Flotte</span>
              </TabsTrigger>
              <TabsTrigger value="commercial" className="py-2.5 text-xs font-extrabold rounded-xl gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <span>Vendeur / Commercial</span>
              </TabsTrigger>
            </TabsList>

            {/* Content Super Admin */}
            <TabsContent value="super_admin" className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 font-extrabold flex items-center justify-between">
                <span>Profil Super Administrateur Système (Propriétaire de la Plateforme)</span>
                <Badge className="bg-rose-600 text-white font-extrabold">Accès Absolu (CRUD)</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-rose-500" />
                    Gouvernance & Comptes
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Validation & Suspension des Comptes
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Modification des Rôles & Quotas
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Supervision des Sessions & Activités
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-600" />
                    Flotte, Contrats & GPS
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Gestion Intégrale Parc Automobile
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Contrats, Signatures Tactiles & Cautions
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Suivi GPSwox & Coupure Moteur
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600" />
                    Finances & Paramètres
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Facturation, Reçus & TVA
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Chèques de Garantie & Trésorerie
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Paramètres Système SFTLOCATION
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Content Admin Agence */}
            <TabsContent value="admin" className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold flex items-center justify-between">
                <span>Administrateur d'Agence de Location</span>
                <Badge className="bg-emerald-600 text-white font-extrabold">Accès Métier Agence</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-600" />
                    Flotte & Restitution
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Ajout / Modification Véhicules
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Contrôle Dégâts & Cartes Grises
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Contrats & Clients
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Création Contrats & Devis
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Fiches Clients (CIN / Permis)
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-500" />
                    Restrictions Sécurité
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Pas d'accès au Panel de Gouvernance
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Pas de modification des quotas globaux
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Content Gest. Flotte */}
            <TabsContent value="flotte" className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 font-extrabold flex items-center justify-between">
                <span>Gestionnaire de Flotte & Parc Automobile</span>
                <Badge className="bg-blue-600 text-white font-extrabold">Spécialiste Flotte</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Fonctionnalités Autorisées
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Tableau de bord Flotte & Disponibilité
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Gestion des Réparations & Vidanges
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Carte GPSwox & Suivi Traqueurs
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-500" />
                    Modules Restreints
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Masquage des données financières et factures
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Masquage du contrôle des utilisateurs
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Content Commercial */}
            <TabsContent value="commercial" className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold flex items-center justify-between">
                <span>Agent Commercial & Comptoir</span>
                <Badge className="bg-amber-600 text-white font-extrabold">Comptoir & Devis</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Fonctionnalités Autorisées
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Création Contrats & Signatures Client
                    </li>
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Saisie Nouveaux Clients (CIN / Permis)
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-2">
                  <h4 className="font-extrabold text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-rose-500" />
                    Modules Restreints
                  </h4>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Impossibilité de supprimer des véhicules
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground/70">
                      <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                      Impossibilité de modifier les paramètres d'agence
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 6. Modal Inspecteur de Compte */}
      <Dialog open={isInspectModalOpen} onOpenChange={setIsInspectModalOpen}>
        <DialogContent className="sm:max-w-xl font-tajawal rounded-3xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-extrabold">
              <Eye className="h-5 w-5 text-blue-600" />
              <span>Inspecteur Détaillé de Compte</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Métadonnées de connexion, quotas d'utilisation et formule de licence pour l'agence.
            </DialogDescription>
          </DialogHeader>

          {userToInspect && (
            <div className="space-y-5 pt-3">
              {/* Entête Fiche utilisateur */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 text-emerald-700 font-extrabold flex items-center justify-center text-base shrink-0 border border-emerald-500/20">
                    {(userToInspect.full_name || "U")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
                      <span>{userToInspect.company_name}</span>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {userToInspect.subscription_plan || "Pro"}
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground">{userToInspect.full_name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{userToInspect.email}</p>
                  </div>
                </div>

                <Badge
                  className={
                    userToInspect.status === "valide"
                      ? "bg-emerald-600 text-white"
                      : userToInspect.status === "en_attente"
                      ? "bg-amber-500 text-black"
                      : "bg-rose-600 text-white"
                  }
                >
                  {userToInspect.status}
                </Badge>
              </div>

              {/* Grid 2 colonnes: Sécurité & Quotas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Métadonnées Sécurité */}
                <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2.5 text-xs">
                  <h5 className="font-extrabold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <Monitor className="h-4 w-4 text-emerald-600" />
                    <span>Appareil & Connexion</span>
                  </h5>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Adresse IP:</span>
                      <span className="font-mono text-foreground font-semibold">197.230.105.42</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Appareil:</span>
                      <span className="text-foreground font-semibold">Chrome / Windows 11</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dernière activité:</span>
                      <span className="text-foreground font-semibold">{formatDate(userToInspect.last_login_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Temps total actif:</span>
                      <span className="text-foreground font-semibold">{formatDuration(userToInspect.total_seconds_spent)}</span>
                    </div>
                  </div>
                </div>

                {/* Quotas & Formule */}
                <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3 text-xs">
                  <h5 className="font-extrabold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    <HardDrive className="h-4 w-4 text-blue-600" />
                    <span>Quotas & Autorisations</span>
                  </h5>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Quota Véhicules Max</Label>
                      <Input
                        type="number"
                        value={editMaxVehicles}
                        onChange={(e) => setEditMaxVehicles(Number(e.target.value))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px]">Formule d'Abonnement</Label>
                      <Select
                        value={editSubscription}
                        onValueChange={(val: UserProfile["subscription_plan"]) => setEditSubscription(val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-tajawal text-xs">
                          <SelectItem value="Trial">Essai (14 jours)</SelectItem>
                          <SelectItem value="Pro">Professionnel (50 Véhicules)</SelectItem>
                          <SelectItem value="Enterprise">Enterprise (200 Véhicules)</SelectItem>
                          <SelectItem value="Unlimited">Illimité SFTLOCATION</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setIsInspectModalOpen(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={handleSaveQuotas}
                  disabled={isSavingQuotas}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSavingQuotas ? "Enregistrement..." : "Mettre à jour les quotas"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Modal Confirmation Suppression */}
      <Dialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-md font-tajawal rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600 font-bold flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Confirmer la suppression définitive
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Êtes-vous sûr de vouloir supprimer définitivement le compte{" "}
              <strong className="text-foreground">{userToDelete?.full_name} ({userToDelete?.company_name})</strong> ?
              Cette action est irréversible et retirera le compte de la base Supabase Cloud.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteUserConfirmed} className="font-bold">
              Supprimer le compte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Modal Changement Mot de Passe */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md font-tajawal rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="h-5 w-5 text-emerald-600" />
              Réinitialiser le mot de passe
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assigner un nouveau mot de passe pour {selectedUserForPassword?.email}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">Nouveau mot de passe</Label>
              <Input
                id="new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Mettre à jour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
