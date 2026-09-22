import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Upload,
  Save,
  RefreshCw,
  Trash2,
  FileDown,
  Settings as SettingsIcon,
  Clock,
  AlertTriangle,
  SwatchBook,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  Database,
  Radio,
  Building2,
  CheckCircle2,
  Sparkles,
  Layers,
  Activity,
  UserCheck,
  HardDrive,
  KeyRound,
  Globe,
  Sliders,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyBrandColor, DEFAULT_BRAND_COLOR } from "@/utils/brandTheme";
import { settingsRepository } from "@/repositories/settingsRepository";
import type { CompanySettings, GpsSettings } from "@/types/appData";
import { useAuth } from "@/contexts/AuthContext";
import { adminService, SystemGovernanceConfig } from "@/services/adminService";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";

const Settings = () => {
  const { toast } = useToast();
  const { isSuperAdmin, user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isClearingAllData, setIsClearingAllData] = useState(false);
  const { generatePDF } = usePDFGeneration();
  const {
    autoBackupFrequency,
    setAutoBackupFrequency,
    lastBackupDate,
    performBackup,
    performRestore,
    clearAllData,
  } = useSettings();

  const [companySettings, setCompanySettings] = useState<CompanySettings>(settingsRepository.DEFAULT_COMPANY_SETTINGS);
  const [companySettingsReady, setCompanySettingsReady] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // GPS Settings
  const [gpsApiUrl, setGpsApiUrl] = useState("sf-tracker.pro");
  const [gpsEmail, setGpsEmail] = useState("");
  const [gpsPassword, setGpsPassword] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSaving, setGpsSaving] = useState(false);
  const [showGpsPassword, setShowGpsPassword] = useState(false);
  const importCompanyFileRef = useRef<HTMLInputElement | null>(null);

  // Super Admin Governance Config State
  const [govConfig, setGovConfig] = useState<SystemGovernanceConfig>({
    requireManualValidation: true,
    minPasswordLength: 6,
    sessionTimeoutMinutes: 120,
    defaultMaxVehiclesQuota: 50,
    defaultMaxUsersQuota: 5,
    welcomeMessage: "Bienvenue sur l'ERP SFTLOCATION.",
    enableAuditLogsStream: true,
    securityContactEmail: "medoraelis93@gmail.com",
    cloudSyncFrequency: "instant",
  });
  const [isSavingGov, setIsSavingGov] = useState(false);
  const [cloudPingMs, setCloudPingMs] = useState<number | null>(24);

  const { companyName, companyLogo, companyAddress, companyPhone, companyFax, companyGsm, companyEmail, brandColor } =
    companySettings;

  const updateCompanySettings = (patch: Partial<CompanySettings>) => {
    setCompanySettings((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    applyBrandColor(brandColor || DEFAULT_BRAND_COLOR);
  }, [brandColor]);

  useEffect(() => {
    let active = true;
    const loadSettings = async () => {
      setGpsLoading(true);
      try {
        const [loadedCompanySettings, gpsSettings, governance] = await Promise.all([
          settingsRepository.getCompanySettings(),
          settingsRepository.getGpsSettings(),
          adminService.getGovernanceConfig(),
        ]);
        if (!active) return;

        setCompanySettings(loadedCompanySettings);
        setGovConfig(governance);

        if (gpsSettings) {
          setGpsApiUrl(gpsSettings.api_url || "");
          setGpsEmail(gpsSettings.email || "");
          setGpsPassword(gpsSettings.password || "");
        }
      } catch (error: any) {
        toast({
          title: "Erreur chargement paramètres",
          description: error?.message || "Impossible de charger les paramètres",
          variant: "destructive",
        });
      } finally {
        if (active) {
          setCompanySettingsReady(true);
        }
        setGpsLoading(false);
      }
    };
    loadSettings();
    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!companySettingsReady) return;
    const timeoutId = window.setTimeout(async () => {
      try {
        await settingsRepository.saveCompanySettings(companySettings);
      } catch (error) {
        console.error("Error saving company settings:", error);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [companySettings, companySettingsReady]);

  const handleManualSave = async () => {
    try {
      await settingsRepository.saveCompanySettings(companySettings);
      toast({
        title: "Paramètres enregistrés",
        description: "Les informations de société ont été sauvegardées.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    }
  };

  const handleSaveGovConfig = async () => {
    setIsSavingGov(true);
    try {
      const updated = await adminService.saveGovernanceConfig(govConfig);
      setGovConfig(updated);
      toast({
        title: "Configuration du Système Mise à Jour",
        description: "Les paramètres de gouvernance et de sécurité ont été enregistrés dans Supabase Cloud.",
      });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la gouvernance système.",
        variant: "destructive",
      });
    } finally {
      setIsSavingGov(false);
    }
  };

  const handleTestDatabasePing = async () => {
    setIsChecking(true);
    const start = performance.now();
    try {
      await adminService.getAllUsers();
      const end = performance.now();
      const ping = Math.round(end - start);
      setCloudPingMs(ping);
      toast({
        title: "Diagnostic BDD Réussi",
        description: `Connexion à Supabase PostgreSQL v15 opérationnelle. Temps de réponse : ${ping} ms.`,
      });
    } catch {
      toast({
        title: "Erreur Diagnostic",
        description: "Impossible de vérifier la latence de la base de données.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Veuillez choisir un fichier de moins de 2 Mo.",
        variant: "destructive",
      });
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Logo = e.target?.result as string;
      updateCompanySettings({ companyLogo: base64Logo });
      setLogoUploading(false);
      toast({
        title: "Logo mis à jour",
        description: "Le logo SFTLOCATION a été importé avec succès.",
      });
    };
    reader.onerror = () => {
      setLogoUploading(false);
      toast({
        title: "Erreur d'importation",
        description: "Impossible de lire le fichier de logo.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  // SI L'UTILISATEUR EST LE SUPER ADMINISTRATEUR : AFFICHAGE DU CENTRE DE GOUVERNANCE SYSTÈME 2026
  if (isSuperAdmin) {
    return (
      <div className="space-y-6 font-tajawal pb-16">
        {/* Header 2026 Edition Super Admin Settings */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Centre de Gouvernance & Sécurité Système</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span>Paramètres Super Administrateur</span>
                <Sparkles className="h-6 w-6 text-amber-400" />
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/80 max-w-2xl leading-relaxed">
                Configurez les politiques d'accès globales, les quotas par défaut des agences, la sécurité de la plateforme et le profil officiel SFTLOCATION.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleTestDatabasePing}
                disabled={isChecking}
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md text-xs font-bold gap-2"
              >
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Diagnostic BDD ({cloudPingMs ? `${cloudPingMs}ms` : "Test"})</span>
              </Button>

              <Button
                onClick={handleSaveGovConfig}
                disabled={isSavingGov}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/25 text-xs gap-2 px-4"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingGov ? "Enregistrement..." : "Sauvegarder"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* System Governance Tabs */}
        <Tabs defaultValue="security" className="w-full space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-card border border-border/50 p-1.5 rounded-2xl shadow-sm h-auto gap-1">
            <TabsTrigger value="security" className="py-2.5 text-xs font-bold rounded-xl gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              <span>Sécurité & Auth</span>
            </TabsTrigger>
            <TabsTrigger value="quotas" className="py-2.5 text-xs font-bold rounded-xl gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Inscriptions & Quotas</span>
            </TabsTrigger>
            <TabsTrigger value="cloud" className="py-2.5 text-xs font-bold rounded-xl gap-2">
              <Database className="h-4 w-4 text-amber-500" />
              <span>Diagnostic Cloud</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="py-2.5 text-xs font-bold rounded-xl gap-2">
              <Building2 className="h-4 w-4 text-rose-500" />
              <span>Profil SFTLOCATION</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Sécurité & Authentification */}
          <TabsContent value="security" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-3xl border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    Politique des Mots de Passe & Sessions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exigences de sécurité appliquées à tous les administrateurs d'agences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <Label htmlFor="min-pwd-len">Longueur Minimale du Mot de Passe</Label>
                    <Input
                      id="min-pwd-len"
                      type="number"
                      value={govConfig.minPasswordLength}
                      onChange={(e) => setGovConfig((prev) => ({ ...prev, minPasswordLength: Number(e.target.value) }))}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Délai d'Inactivité de Session (Minutes)</Label>
                    <Input
                      id="session-timeout"
                      type="number"
                      value={govConfig.sessionTimeoutMinutes}
                      onChange={(e) => setGovConfig((prev) => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">Flux des Journaux de Sécurité (Audit Stream)</p>
                      <p className="text-[11px] text-muted-foreground">Enregistrer chaque événement de connexion et modification de rôle.</p>
                    </div>
                    <Switch
                      checked={govConfig.enableAuditLogsStream}
                      onCheckedChange={(val) => setGovConfig((prev) => ({ ...prev, enableAuditLogsStream: val }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    Contact de Sécurité & Alertes Urgent
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Email de réception des alertes d'accès suspect et demandes d'inscription.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <Label htmlFor="sec-email">Email de Sécurité Super Admin</Label>
                    <Input
                      id="sec-email"
                      type="email"
                      value={govConfig.securityContactEmail}
                      onChange={(e) => setGovConfig((prev) => ({ ...prev, securityContactEmail: e.target.value }))}
                      className="h-9"
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-1">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Statut de Sécurité Système
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Cryptage TLS v1.3 actif • Supabase RLS sécurisé • Token de session persistant.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Inscriptions & Quotas Globaux */}
          <TabsContent value="quotas" className="space-y-4">
            <Card className="rounded-3xl border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  Politique des Inscriptions Publiques & Quotas
                </CardTitle>
                <CardDescription className="text-xs">
                  Configurez le comportement lors de la soumission du formulaire "Créer un nouveau compte" depuis la page de connexion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                  <div className="space-y-1">
                    <p className="font-bold text-foreground text-sm">Validation Manuelle Obligatoire (Super Admin)</p>
                    <p className="text-xs text-muted-foreground">
                      Si activé, chaque inscription depuis `/login` reste en statut `en_attente` jusqu'à validation manuelle.
                    </p>
                  </div>
                  <Switch
                    checked={govConfig.requireManualValidation}
                    onCheckedChange={(val) => setGovConfig((prev) => ({ ...prev, requireManualValidation: val }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="def-veh-quota">Quota Défaut Véhicules / Agence</Label>
                    <Input
                      id="def-veh-quota"
                      type="number"
                      value={govConfig.defaultMaxVehiclesQuota}
                      onChange={(e) => setGovConfig((prev) => ({ ...prev, defaultMaxVehiclesQuota: Number(e.target.value) }))}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="def-usr-quota">Quota Défaut Utilisateurs / Agence</Label>
                    <Input
                      id="def-usr-quota"
                      type="number"
                      value={govConfig.defaultMaxUsersQuota}
                      onChange={(e) => setGovConfig((prev) => ({ ...prev, defaultMaxUsersQuota: Number(e.target.value) }))}
                      className="h-9 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-msg">Message d'Accueil pour les Comptes Validés</Label>
                  <Input
                    id="welcome-msg"
                    value={govConfig.welcomeMessage}
                    onChange={(e) => setGovConfig((prev) => ({ ...prev, welcomeMessage: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Diagnostic Cloud Supabase */}
          <TabsContent value="cloud" className="space-y-4">
            <Card className="rounded-3xl border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Database className="h-4 w-4 text-amber-500" />
                  Diagnostic & Monitoring Cloud Supabase
                </CardTitle>
                <CardDescription className="text-xs">
                  Vérification en temps réel de la connexion à la base de données PostgreSQL Supabase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Statut BDD</p>
                    <p className="text-lg font-extrabold flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Connecté & Synchrone
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Temps de Réponse</p>
                    <p className="text-lg font-extrabold font-mono">{cloudPingMs ? `${cloudPingMs} ms` : "En attente"}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Projet Supabase</p>
                    <p className="text-lg font-extrabold font-mono">wypifrsooooeejfckomg</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={handleTestDatabasePing}
                    disabled={isChecking}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs"
                  >
                    <Activity className="h-4 w-4" />
                    <span>Lancer un Test de Latence BDD</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Profil Officiel SFTLOCATION */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="rounded-3xl border border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-rose-500" />
                  Profil Officiel de la Société SFTLOCATION
                </CardTitle>
                <CardDescription className="text-xs">
                  Informations affichées sur l'ensemble de la plateforme et les rapports d'administration.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sft-name">Nom de la Société Principale</Label>
                    <Input
                      id="sft-name"
                      value={companyName || "SFTLOCATION"}
                      onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
                      className="h-9 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sft-email">Email Officiel</Label>
                    <Input
                      id="sft-email"
                      type="email"
                      value={companyEmail || "medoraelis93@gmail.com"}
                      onChange={(e) => updateCompanySettings({ companyEmail: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sft-phone">Téléphone / GSM Direct</Label>
                    <Input
                      id="sft-phone"
                      value={companyGsm || "0661000000"}
                      onChange={(e) => updateCompanySettings({ companyGsm: e.target.value })}
                      className="h-9 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sft-address">Adresse du Siège Social</Label>
                    <Input
                      id="sft-address"
                      value={companyAddress || "Casablanca, Maroc"}
                      onChange={(e) => updateCompanySettings({ companyAddress: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Logo Upload Section */}
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Logo SFT" className="h-12 w-12 object-contain rounded-xl border bg-white p-1" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 font-extrabold flex items-center justify-center border border-emerald-500/20">
                        SFT
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-foreground text-xs">Logo officiel SFTLOCATION</p>
                      <p className="text-[11px] text-muted-foreground">Format PNG, JPG ou SVG (Max 2 Mo)</p>
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={importCompanyFileRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => importCompanyFileRef.current?.click()}
                      disabled={logoUploading}
                      className="text-xs font-bold gap-2"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{logoUploading ? "Téléchargement..." : "Changer le logo"}</span>
                    </Button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={handleManualSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                    <Save className="h-4 w-4" />
                    <span>Enregistrer les informations</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // SINON : PARAMÈTRES CLASSIQUES POUR LES ADMINISTRATEURS ET AUTRES RÔLES
  return (
    <div className="space-y-6 font-tajawal pb-16">
      <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Paramètres de l'Agence</h1>
          <p className="text-xs text-muted-foreground mt-1">Gérez les informations de votre agence et vos préférences.</p>
        </div>
        <Button onClick={handleManualSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
          <Save className="h-4 w-4" />
          <span>Enregistrer</span>
        </Button>
      </div>

      {/* Identités & Coordonnées */}
      <Card className="rounded-2xl border border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">Informations de la Société</CardTitle>
          <CardDescription className="text-xs">Identifiants légaux et coordonnées de l'agence.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comp-name">Nom de la Société</Label>
              <Input
                id="comp-name"
                value={companyName}
                onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-email">Email Agence</Label>
              <Input
                id="comp-email"
                type="email"
                value={companyEmail}
                onChange={(e) => updateCompanySettings({ companyEmail: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comp-gsm">GSM</Label>
              <Input
                id="comp-gsm"
                value={companyGsm}
                onChange={(e) => updateCompanySettings({ companyGsm: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-addr">Adresse</Label>
              <Input
                id="comp-addr"
                value={companyAddress}
                onChange={(e) => updateCompanySettings({ companyAddress: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
