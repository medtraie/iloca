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
    <div className="space-y-6 font-tajawal pb-16">
      {/* 1. Header 2026 Edition avec gradient doux & contrôles */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
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
              <DialogContent className="sm:max-w-lg font-tajawal rounded-2xl">
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

      {/* 4. Table des utilisateurs & Matrice des rôles (2 colonnes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Répertoire des Utilisateurs (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="rounded-3xl border border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/20 pb-4 border-b border-border/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-extrabold text-foreground">
                      Répertoire des Utilisateurs & Accès
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Contrôlez les statuts (Valider / Suspendre), les quotas et les autorisations.
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-xs font-bold self-start sm:self-auto bg-background">
                  {filteredUsers.length} compte{filteredUsers.length > 1 ? "s" : ""}
                </Badge>
              </div>

              {/* Filtres & Recherche */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, email ou société..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all shrink-0 ${
                      statusFilter === "all"
                        ? "bg-foreground text-background shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Tous ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("valide")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all shrink-0 ${
                      statusFilter === "valide"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Validés ({validatedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("en_attente")}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all shrink-0 ${
                      statusFilter === "en_attente"
                        ? "bg-amber-500 text-black shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    En attente ({pendingUsers.length})
                  </button>
                  {suspendedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setStatusFilter("suspendu")}
                      className={`px-3 py-1.5 text-xs rounded-xl font-bold transition-all shrink-0 ${
                        statusFilter === "suspendu"
                          ? "bg-rose-600 text-white shadow-sm"
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
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-extrabold tracking-wider border-b border-border/40">
                    <tr>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[240px]">Entreprise & Utilisateur</th>
                      <th className="py-3.5 px-3 whitespace-nowrap min-w-[140px]">Rôle & Droits</th>
                      <th className="py-3.5 px-3 whitespace-nowrap min-w-[150px]">Dernière Connexion</th>
                      <th className="py-3.5 px-3 whitespace-nowrap min-w-[100px]">Temps Passé</th>
                      <th className="py-3.5 px-3 whitespace-nowrap min-w-[120px]">Statut d'Accès</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] text-right">Actions du Compte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
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
                            {/* Entreprise & Nom */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20">
                                  {initials || "U"}
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-extrabold text-foreground text-xs flex items-center gap-1.5">
                                    <span>{u.company_name}</span>
                                    {isSelf && (
                                      <Badge className="text-[9px] px-1.5 py-0 bg-emerald-600 text-white font-bold">
                                        Super Admin
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {u.full_name} • <span className="font-mono">{u.email}</span>
                                  </p>
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
                                  <SelectTrigger className="h-7 text-xs w-[130px] rounded-lg">
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
                            <td className="py-3.5 px-3 font-bold text-foreground">
                              {formatDuration(u.total_seconds_spent)}
                            </td>

                            {/* Statut */}
                            <td className="py-3.5 px-3">
                              {u.status === "valide" && (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 gap-1 font-semibold"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Validé / Actif
                                </Badge>
                              )}
                              {u.status === "en_attente" && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1 font-semibold"
                                >
                                  <Clock className="h-3 w-3" />
                                  En attente
                                </Badge>
                              )}
                              {u.status === "suspendu" && (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 gap-1 font-semibold"
                                >
                                  <PauseCircle className="h-3 w-3" />
                                  Suspendu
                                </Badge>
                              )}
                            </td>

                            {/* Actions du compte */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Inspecter le compte */}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenInspectModal(u)}
                                  className="h-7 text-xs bg-muted/40 hover:bg-muted font-semibold gap-1 px-2"
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
                                        className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 gap-1 font-semibold"
                                        title="Suspendre temporairement"
                                      >
                                        <PauseCircle className="h-3 w-3" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        onClick={() => handleReactivateUser(u.id)}
                                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                                        title="Valider le compte"
                                      >
                                        <Check className="h-3 w-3" />
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
                                  title="Changer le mot de passe"
                                >
                                  <KeyRound className="h-3 w-3" />
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

        {/* Right Column: Matrice des Rôles & Sécurité (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-3xl border border-border/50 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/20 pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Matrice des rôles & sécurité ERP 2026
                </CardTitle>
              </div>
              <CardDescription className="text-[11px]">
                Droits d'accès par module métier dans l'ERP SFTLOCATION.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <Tabs defaultValue="super_admin" className="w-full">
                <TabsList className="grid grid-cols-2 gap-1 bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger value="super_admin" className="text-[11px] font-bold">
                    Super Admin
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="text-[11px] font-bold">
                    Admin Agence
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="super_admin" className="pt-3 space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold flex items-center justify-between">
                    <span>Super Administrateur Système</span>
                    <Badge variant="outline" className="bg-rose-500 text-white text-[10px]">
                      Illimité
                    </Badge>
                  </div>

                  <ul className="space-y-2 text-[11px] text-muted-foreground pt-1">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Contrôle d'Accès Global & Validation des Comptes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Gestion de la Flotte & Véhicules
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Contrats & Signatures Tactiles Clients
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Finances, Reçus, Factures & TVA
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Carte GPSwox & Suivi Traqueurs Temps Réel
                    </li>
                  </ul>
                </TabsContent>

                <TabsContent value="admin" className="pt-3 space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-extrabold flex items-center justify-between">
                    <span>Administrateur Agence</span>
                    <Badge variant="outline" className="bg-emerald-600 text-white text-[10px]">
                      Standard
                    </Badge>
                  </div>

                  <ul className="space-y-2 text-[11px] text-muted-foreground pt-1">
                    <li className="flex items-center gap-2 text-foreground font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Gestion Complète de l'Agence
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Contrats, Clients, Caution & Restitution
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      Entretien Véhicules & Suivi Garage
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground/60">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Accès restreint au Panel de Gouvernance
                    </li>
                  </ul>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 5. Modal Inspecteur de Compte (Account Inspector Drawer) */}
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

      {/* 6. Modal Confirmation Suppression */}
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

      {/* 7. Modal Changement Mot de Passe */}
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
