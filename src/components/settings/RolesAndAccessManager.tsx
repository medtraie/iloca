import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminService,
  UserProfile,
  SupervisorPermissions,
  DEFAULT_SUPERVISOR_PERMISSIONS,
} from "@/services/adminService";
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Edit,
  KeyRound,
  Eye,
  EyeOff,
  Users,
  Smartphone,
  Lock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Car,
  FileText,
  Receipt,
  Wallet,
  BarChart3,
  BellRing,
} from "lucide-react";

export const ANDROID_APP_SECTIONS = [
  { id: "overview", label: "Overview", desc: "Centre de commandement & Télémétrie", icon: LayoutGrid },
  { id: "clients", label: "Clients", desc: "CRM & fiches locataires", icon: Users },
  { id: "vehicles", label: "Véhicules", desc: "Parc automobile & statut flotte", icon: Car },
  { id: "contracts", label: "Contrats", desc: "Locations actives & contrats A4", icon: FileText },
  { id: "factures", label: "Factures", desc: "Facturation & règlements", icon: Receipt },
  { id: "depenses", label: "Dépenses", desc: "Charges flotte, assurances & vignettes", icon: Wallet },
  { id: "rapports", label: "Rapports", desc: "Intelligence financière & rentabilité", icon: BarChart3 },
  { id: "alertes", label: "Alertes", desc: "Surveillance retards & recouvrement", icon: BellRing },
];

export function RolesAndAccessManager() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [supervisors, setSupervisors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal Create / Edit
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<SupervisorPermissions>(DEFAULT_SUPERVISOR_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  // Modal Password change
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetSupervisorForPassword, setTargetSupervisorForPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Modal Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const parentAdminId = user?.id || "admin-local";
  const parentCompanyName = user?.companyName || "BonaTours";

  const loadSupervisors = async () => {
    setLoading(true);
    try {
      const list = await adminService.getAgencySupervisors(parentAdminId);
      setSupervisors(list);
    } catch (e) {
      console.warn("Failed to load supervisors:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadSupervisors();
    }
  }, [user?.id]);

  const handleOpenCreate = () => {
    setEditingSupervisor(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setPermissions({
      allowedTabs: ["overview", "clients", "vehicles", "contracts"],
      canDelete: false,
      canCreateContracts: true,
      canEditContracts: true,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (sup: UserProfile) => {
    setEditingSupervisor(sup);
    setFullName(sup.full_name);
    setEmail(sup.email);
    setPhone(sup.phone || "");
    setPassword(sup.password || "");
    setPermissions(
      sup.permissions || {
        allowedTabs: ["overview", "clients", "vehicles", "contracts"],
        canDelete: false,
        canCreateContracts: true,
        canEditContracts: true,
      }
    );
    setIsDialogOpen(true);
  };

  const toggleTabPermission = (tabId: string) => {
    setPermissions((prev) => {
      const exists = prev.allowedTabs.includes(tabId);
      const nextTabs = exists
        ? prev.allowedTabs.filter((t) => t !== tabId)
        : [...prev.allowedTabs, tabId];
      return { ...prev, allowedTabs: nextTabs };
    });
  };

  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez renseigner le nom complet et l'adresse email.",
        variant: "destructive",
      });
      return;
    }

    if (!editingSupervisor && (!password || password.trim().length < 4)) {
      toast({
        title: "Mot de passe requis",
        description: "Le mot de passe doit comporter au moins 4 caractères.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSupervisor) {
        // Update
        await adminService.updateSupervisor(editingSupervisor.id, {
          full_name: fullName.trim(),
          phone: phone.trim(),
          permissions,
          password: password.trim() ? password.trim() : editingSupervisor.password,
        });
        toast({
          title: "Superviseur mis à jour",
          description: `Les accès et permissions de ${fullName} ont été enregistrés.`,
        });
      } else {
        // Create
        await adminService.createSupervisor(
          {
            id: parentAdminId,
            company_name: parentCompanyName,
            email: user?.email || "",
          },
          {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            password: password.trim(),
            permissions,
          }
        );
        toast({
          title: "Superviseur créé avec succès",
          description: `Le compte mobile pour ${fullName} est maintenant actif.`,
        });
      }

      setIsDialogOpen(false);
      await loadSupervisors();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible d'enregistrer le superviseur.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (sup: UserProfile) => {
    const nextStatus = sup.status === "valide" ? "suspendu" : "valide";
    await adminService.updateSupervisor(sup.id, { status: nextStatus });
    toast({
      title: nextStatus === "valide" ? "Compte activé" : "Compte suspendu",
      description: `Le compte ${sup.email} est désormais ${nextStatus}.`,
    });
    await loadSupervisors();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSupervisorForPassword || !newPassword.trim()) return;
    try {
      await adminService.updateUserPassword(targetSupervisorForPassword.id, newPassword.trim());
      toast({
        title: "Mot de passe modifié",
        description: `Le nouveau mot de passe de ${targetSupervisorForPassword.full_name} a été enregistré.`,
      });
      setIsPasswordModalOpen(false);
      setNewPassword("");
      await loadSupervisors();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de mettre à jour le mot de passe.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await adminService.deleteSupervisor(deleteConfirmId);
      toast({
        title: "Compte supprimé",
        description: "Le compte superviseur a été supprimé définitivement.",
      });
      setDeleteConfirmId(null);
      await loadSupervisors();
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de supprimer ce compte.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="lg:col-span-2 rounded-2xl border border-primary/25 bg-gradient-to-r from-card via-card to-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider mb-1">
              <Smartphone className="h-3 w-3" />
              <span>Gestion Multi-Accès Android & Rôles</span>
            </div>
            <CardTitle className="text-base sm:text-lg font-black flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span>Rôles & Accès Superviseurs (Application Mobile)</span>
            </CardTitle>
            <CardDescription className="text-xs max-w-3xl">
              Créez des comptes <strong>Superviseur</strong> rattachés à votre agence (<strong>{parentCompanyName}</strong>) pour vos agents mobiles sur l'application Android. Définissez précisément les sections visibles et les droits de suppression.
            </CardDescription>
          </div>

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs h-9 rounded-xl shadow-md gap-2 shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span>Nouveau Superviseur</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Notice explicative d'isolation stricte des contrats */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Règle d'Isolation Stricte des Contrats (Admin vs Superviseur) :</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-background/60 border border-border/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Compte Administrateur ({user?.email}) :</strong> Conserve la visibilité globale et unifiée sur <strong>TOUS</strong> les contrats de l'agence (les vôtres + ceux de tous vos superviseurs).
              </span>
            </div>
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-background/60 border border-border/40">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                <strong>Compte Superviseur (Android) :</strong> Ne verra <strong>UNIQUEMENT</strong> que les contrats qu'il a lui-même enregistrés. Vos contrats administrateur restent totalement masqués pour lui.
              </span>
            </div>
          </div>
        </div>

        {/* Liste des superviseurs */}
        {loading ? (
          <div className="text-center py-6 text-xs text-muted-foreground">Chargement des comptes superviseurs...</div>
        ) : supervisors.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="font-bold text-foreground">Aucun superviseur créé pour le moment</p>
            <p className="text-[11px] max-w-md mx-auto">
              Cliquez sur le bouton "Nouveau Superviseur" pour créer le premier compte d'accès mobile pour votre équipe terrain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {supervisors.map((sup) => {
              const perms = sup.permissions || DEFAULT_SUPERVISOR_PERMISSIONS;
              const isSuspended = sup.status === "suspendu";

              return (
                <div
                  key={sup.id}
                  className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-primary/40"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-sm text-foreground">{sup.full_name}</span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                        Superviseur Mobile
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isSuspended
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        }`}
                      >
                        {isSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          perms.canDelete
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {perms.canDelete ? "Suppression autorisée" : "Suppression interdite"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>Email : <strong className="text-foreground">{sup.email}</strong></span>
                      {sup.phone && <span>Tél : <strong className="text-foreground">{sup.phone}</strong></span>}
                    </div>

                    {/* Badges des sections visibles */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-muted-foreground mr-1">Sections visibles :</span>
                      {ANDROID_APP_SECTIONS.map((sec) => {
                        const isAllowed = perms.allowedTabs.includes(sec.id);
                        if (!isAllowed) return null;
                        return (
                          <span
                            key={sec.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-foreground border border-border/50"
                          >
                            <sec.icon className="h-2.5 w-2.5 text-primary" />
                            <span>{sec.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(sup)}
                      className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl"
                      title="Modifier les permissions & sections"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Permissions</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTargetSupervisorForPassword(sup);
                        setNewPassword("");
                        setIsPasswordModalOpen(true);
                      }}
                      className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl"
                      title="Changer le mot de passe"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Code</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(sup)}
                      className={`h-8 px-2 text-xs font-bold rounded-xl ${
                        isSuspended ? "text-emerald-500 hover:text-emerald-600" : "text-amber-500 hover:text-amber-600"
                      }`}
                      title={isSuspended ? "Activer l'accès" : "Suspendre l'accès"}
                    >
                      {isSuspended ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(sup.id)}
                      className="h-8 px-2 text-xs font-bold text-rose-500 hover:text-rose-600 rounded-xl"
                      title="Supprimer ce superviseur"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal Création & Modification de Superviseur */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveSupervisor} className="space-y-5">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                <Smartphone className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-lg font-black tracking-tight">
                {editingSupervisor ? "Modifier le Compte Superviseur" : "Créer un Nouveau Superviseur Mobile"}
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Rattaché à l'agence <strong>{parentCompanyName}</strong>. Ce compte sera utilisé pour se connecter à l'application Android BonaTours Cockpit 2026.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Informations Générales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sup-name" className="font-bold">Nom Complet *</Label>
                  <Input
                    id="sup-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Hicham Alami"
                    className="h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sup-email" className="font-bold">Adresse Email (Identifiant) *</Label>
                  <Input
                    id="sup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ex: hicham@bounatours.com"
                    disabled={!!editingSupervisor}
                    className="h-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sup-phone" className="font-bold">Numéro de Téléphone</Label>
                  <Input
                    id="sup-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0661234567"
                    className="h-9 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sup-password" className="font-bold">
                    {editingSupervisor ? "Changer mot de passe (optionnel)" : "Mot de passe initial *"}
                  </Label>
                  <div className="relative">
                    <Input
                      id="sup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-9 pr-10 font-mono"
                      required={!editingSupervisor}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sections visibles dans l'application Android */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-black text-xs text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Sections Visibles sur l'Application Android (Cockpit 2026) :</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {permissions.allowedTabs.length} sélectionnée(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {ANDROID_APP_SECTIONS.map((sec) => {
                    const isChecked = permissions.allowedTabs.includes(sec.id);
                    return (
                      <div
                        key={sec.id}
                        onClick={() => toggleTabPermission(sec.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/10 border-primary/40 shadow-xs"
                            : "bg-muted/20 border-border/50 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isChecked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <sec.icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-xs text-foreground">{sec.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{sec.desc}</p>
                          </div>
                        </div>
                        <Switch
                          checked={isChecked}
                          onCheckedChange={() => toggleTabPermission(sec.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Droits d'Action & Suppression */}
              <div className="pt-2 border-t space-y-2">
                <Label className="font-black text-xs text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Droits d'Action & Sécurité :</span>
                </Label>

                <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-foreground">Autoriser la suppression des données</p>
                      <p className="text-[10px] text-muted-foreground">
                        Permet au superviseur de supprimer des contrats, clients ou véhicules sur l'application mobile.
                      </p>
                    </div>
                    <Switch
                      checked={permissions.canDelete}
                      onCheckedChange={(val) => setPermissions((p) => ({ ...p, canDelete: val }))}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div>
                      <p className="font-bold text-foreground">Autoriser la création de contrats</p>
                      <p className="text-[10px] text-muted-foreground">
                        Le superviseur peut établir et imprimer de nouveaux contrats de location.
                      </p>
                    </div>
                    <Switch
                      checked={permissions.canCreateContracts !== false}
                      onCheckedChange={(val) => setPermissions((p) => ({ ...p, canCreateContracts: val }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl text-xs font-semibold h-9"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl text-xs h-9 shadow-md"
              >
                {saving ? "Enregistrement..." : editingSupervisor ? "Mettre à jour" : "Créer le superviseur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Changement Rapide de Mot de Passe */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-border shadow-xl">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <DialogHeader>
              <div className="mx-auto w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-1">
                <KeyRound className="w-5 h-5" />
              </div>
              <DialogTitle className="text-center text-base font-black">
                Nouveau mot de passe pour {targetSupervisorForPassword?.full_name}
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                Saisissez le nouveau code d'accès pour ce compte superviseur.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-2">
              <Label htmlFor="modal-new-pwd" className="text-xs font-bold">Nouveau mot de passe</Label>
              <Input
                id="modal-new-pwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 font-mono"
                required
                autoFocus
              />
            </div>

            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-xl text-xs font-semibold h-8"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground font-bold rounded-xl text-xs h-8"
              >
                Enregistrer le mot de passe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmation de Suppression */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              <span>Supprimer ce compte superviseur ?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Cette action révoquera immédiatement l'accès mobile de ce superviseur. Ses contrats enregistrés resteront conservés dans votre base de données agence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
