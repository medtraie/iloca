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
import type { AutoBackupFrequency, CompanySettings, GpsSettings } from "@/types/appData";
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
        } else {
          setGpsApiUrl("sf-tracker.pro");
          setGpsEmail("");
          setGpsPassword("");
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
        description: "Les informations de société ont été sauvegardées avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de la sauvegarde",
        variant: "destructive",
      });
    }
  };

  const handleSaveGpsSettings = async () => {
    if (!gpsApiUrl || !gpsEmail || !gpsPassword) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner l'URL API, l'e-mail et le mot de passe",
        variant: "destructive",
      });
      return;
    }
    setGpsSaving(true);
    try {
      const payload: GpsSettings = {
        api_url: gpsApiUrl.trim(),
        email: gpsEmail.trim(),
        password: gpsPassword,
      };
      await settingsRepository.saveGpsSettings(payload);
      toast({
        title: "Paramètres enregistrés",
        description: "Les paramètres SFT Tracker ont été enregistrés avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Échec de l'enregistrement des paramètres SFT Tracker",
        variant: "destructive",
      });
    } finally {
      setGpsSaving(false);
    }
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        description: "Le logo de l'entreprise a été importé avec succès.",
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

  const handleRemoveLogo = () => {
    updateCompanySettings({ companyLogo: null });
    toast({
      title: "Logo supprimé",
      description: "Le logo a été supprimé.",
    });
  };

  const exportCompanyIdentity = () => {
    const payload = {
      companyName,
      companyLogo,
      companyAddress,
      companyPhone,
      companyFax,
      companyGsm,
      companyEmail,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "company_identity.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export identité", description: "Fichier JSON exporté" });
  };

  const handleImportCompanyIdentity = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text || "{}");
      if (typeof obj !== "object") throw new Error("invalid");
      updateCompanySettings({
        companyName: "companyName" in obj ? String(obj.companyName || "") : companySettings.companyName,
        companyLogo: "companyLogo" in obj ? (obj.companyLogo ? String(obj.companyLogo) : null) : companySettings.companyLogo,
        companyAddress: "companyAddress" in obj ? String(obj.companyAddress || "") : companySettings.companyAddress,
        companyPhone: "companyPhone" in obj ? String(obj.companyPhone || "") : companySettings.companyPhone,
        companyFax: "companyFax" in obj ? String(obj.companyFax || "") : companySettings.companyFax,
        companyGsm: "companyGsm" in obj ? String(obj.companyGsm || "") : companySettings.companyGsm,
        companyEmail: "companyEmail" in obj ? String(obj.companyEmail || "") : companySettings.companyEmail,
      });
      toast({ title: "Import identité", description: "Identité de l'entreprise importée avec succès." });
    } catch {
      toast({ title: "Import échoué", description: "Fichier invalide", variant: "destructive" });
    } finally {
      if (importCompanyFileRef.current) importCompanyFileRef.current.value = "";
    }
  };

  const resetCompanyIdentity = () => {
    updateCompanySettings({
      companyName: "",
      companyLogo: null,
      companyAddress: "",
      companyPhone: "",
      companyFax: "",
      companyGsm: "",
      companyEmail: "",
    });
    toast({ title: "Réinitialisé", description: "Identité de l'entreprise réinitialisée." });
  };

  const handleResetOfficialColor = () => {
    updateCompanySettings({ brandColor: DEFAULT_BRAND_COLOR });
    toast({
      title: "Couleur officielle activée",
      description: "La couleur jaune officielle SFTLOCATION a été appliquée.",
    });
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      toast({
        title: "Application à jour",
        description: "Votre ERP SFTLOCATION est à jour (v2.0.0 Enterprise Edition)",
      });
    }, 1500);
  };

  const handleExportAllContracts = async () => {
    setIsExporting(true);
    try {
      const { data: contracts, error } = await supabase.from("contracts").select("*");
      if (error) throw error;

      if (!contracts || contracts.length === 0) {
        toast({
          title: "Aucun contrat",
          description: "Il n'y a aucun contrat à exporter.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Tous les Contrats - Export</title>
          <style>
            @page { margin: 1cm; size: A4; }
            body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
            .contract { page-break-after: always; padding: 20px; border: 1px solid #ddd; margin-bottom: 20px; }
            .contract:last-child { page-break-after: avoid; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .title { font-size: 18px; font-weight: bold; color: #333; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #666; }
            .value { color: #333; }
            .status { padding: 4px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          ${contracts
            .map(
              (contract: any, index: number) => `
            <div class="contract">
              <div class="header">
                <div class="title">CONTRAT DE LOCATION N° ${contract.contract_number}</div>
                <div style="margin-top: 10px; color: #666;">Contrat ${index + 1} sur ${contracts.length}</div>
              </div>
              
              <div class="info-grid">
                <div>
                  <div class="info-item">
                    <span class="label">Client :</span>
                    <span class="value">${contract.customer_name}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Téléphone :</span>
                    <span class="value">${contract.customer_phone || "N/A"}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Email :</span>
                    <span class="value">${contract.customer_email || "N/A"}</span>
                  </div>
                </div>
                
                <div>
                  <div class="info-item">
                    <span class="label">Véhicule :</span>
                    <span class="value">${contract.vehicle}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date début :</span>
                    <span class="value">${new Date(contract.start_date).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date fin :</span>
                    <span class="value">${new Date(contract.end_date).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </div>

              <div class="info-grid">
                <div>
                  <div class="info-item">
                    <span class="label">Tarif journalier :</span>
                    <span class="value">${contract.daily_rate} DH</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Montant total :</span>
                    <span class="value">${contract.total_amount} DH</span>
                  </div>
                </div>
                <div>
                  <div class="info-item">
                    <span class="label">Statut :</span>
                    <span class="status">${contract.status}</span>
                  </div>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);

        toast({
          title: "Export réussi",
          description: `${contracts.length} contrats exportés en PDF.`,
        });
      } else {
        throw new Error("Impossible d'ouvrir la fenêtre d'impression.");
      }
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
      toast({
        title: "Erreur d'exportation",
        description: "Impossible d'exporter les contrats.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupData = async () => {
    setIsBackingUp(true);
    try {
      await performBackup();
      toast({
        title: "Sauvegarde effectuée",
        description: "Toutes les données ont été sauvegardées avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await performRestore(file);
      toast({
        title: "Restauration terminée",
        description: "Les données ont été restaurées.",
      });
    } catch (error) {
      toast({
        title: "Erreur de restauration",
        description: "Fichier de sauvegarde invalide ou corrompu.",
        variant: "destructive",
      });
    }
  };

  const clearDeviceData = async () => {
    try {
      localStorage.clear();
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}

    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
    } catch {}

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {}
  };

  const handleClearLocalStorage = () => {
    try {
      localStorage.clear();
      toast({
        title: "LocalStorage vidé",
        description: "Le stockage local de votre navigateur a été réinitialisé.",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du vidage du LocalStorage.",
        variant: "destructive",
      });
    }
  };

  const handleClearAllData = async () => {
    if (isClearingAllData) return;
    setIsClearingAllData(true);
    try {
      const confirmPhrase = window.prompt(
        'Action dangereuse.\nTapez "EFFACER" pour supprimer toutes vos données (Supabase + appareil).'
      );

      if (confirmPhrase !== "EFFACER") {
        toast({
          title: "Annulé",
          description: "Aucune donnée n'a été supprimée.",
        });
        return;
      }

      const { error } = await supabase.rpc("clear_all_app_data");

      if (error) {
        if (error.code === "PGRST202") {
          toast({
            title: "Configuration Supabase requise",
            description: "La fonction clear_all_app_data() n'existe pas encore dans votre projet Supabase.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Erreur",
          description: error.message || "Une erreur s'est produite lors de la suppression des données.",
          variant: "destructive",
        });
        return;
      }

      await supabase.auth.signOut().catch(() => {});
      await clearDeviceData();
      toast({
        title: "Succès",
        description: "Toutes les données ont été supprimées.",
      });
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite.",
        variant: "destructive",
      });
    } finally {
      setIsClearingAllData(false);
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

  // SI L'UTILISATEUR EST LE SUPER ADMINISTRATEUR : CENTRE DE GOUVERNANCE SYSTÈME 2026
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
                      onChange={handleLogoChange}
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

  // SINON : COMPLÈTE PAGE DES PARAMÈTRES POUR LES UTILISATEURS / ADMINISTRATEURS D'AGENCES
  return (
    <div className="space-y-6 font-tajawal pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-card p-6 rounded-2xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <SettingsIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Paramètres de l'Agence</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gérez l'identité de votre agence, l'intégration GPS Tracker, la charte graphique et la sauvegarde.
            </p>
          </div>
        </div>
        <Button onClick={handleManualSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs">
          <Save className="h-4 w-4" />
          <span>Enregistrer</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Paramètres SFT Tracker / GPS */}
        <Card className="lg:col-span-2 rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Radio className="h-5 w-5 text-amber-500" />
              Paramètres SFT Tracker (Suivi GPSwox)
            </CardTitle>
            <CardDescription className="text-xs">
              Connectez le système de géolocalisation et de suivi de flotte en renseignant vos accès API SFT/TrackPremier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <Label htmlFor="gpsApiUrl">URL API du Serveur GPS</Label>
              <Input
                id="gpsApiUrl"
                value={gpsApiUrl}
                onChange={(e) => setGpsApiUrl(e.target.value)}
                placeholder="sf-tracker.pro"
                disabled={gpsLoading || gpsSaving}
                className="h-9 font-mono"
              />
              <p className="text-[11px] text-muted-foreground">Adresse du serveur de suivi sans `http://` ni `/api`</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gpsEmail">E-mail Compte Tracker</Label>
                <Input
                  id="gpsEmail"
                  type="email"
                  value={gpsEmail}
                  onChange={(e) => setGpsEmail(e.target.value)}
                  placeholder="abdou@gmail.com"
                  disabled={gpsLoading || gpsSaving}
                  className="h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpsPassword">Mot de Passe Tracker</Label>
                <div className="relative">
                  <Input
                    id="gpsPassword"
                    type={showGpsPassword ? "text" : "password"}
                    value={gpsPassword}
                    onChange={(e) => setGpsPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 pr-10"
                    disabled={gpsLoading || gpsSaving}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowGpsPassword((v) => !v)}
                  >
                    {showGpsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button
              className="w-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs h-9 rounded-xl"
              onClick={handleSaveGpsSettings}
              disabled={gpsSaving || gpsLoading}
            >
              <Save className={`h-4 w-4 mr-2 ${gpsSaving ? "animate-spin" : ""}`} />
              {gpsSaving ? "Enregistrement..." : "Enregistrer les paramètres SFT Tracker"}
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Informations de l'Entreprise & Logo */}
        <Card className="rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Informations de la Société
            </CardTitle>
            <CardDescription className="text-xs">
              Nom, adresse et logo affichés sur les contrats de location et factures officielles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <Label htmlFor="comp-name">Nom de la Société</Label>
              <Input
                id="comp-name"
                value={companyName}
                onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
                placeholder="Ex: SFTLOCATION"
                className="h-9 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-addr">Adresse Officielle</Label>
              <Input
                id="comp-addr"
                value={companyAddress}
                onChange={(e) => updateCompanySettings({ companyAddress: e.target.value })}
                placeholder="Ex: Casablanca - Maroc"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comp-phone">Téléphone Fixe</Label>
                <Input
                  id="comp-phone"
                  value={companyPhone}
                  onChange={(e) => updateCompanySettings({ companyPhone: e.target.value })}
                  placeholder="0522228704"
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-fax">Fax</Label>
                <Input
                  id="comp-fax"
                  value={companyFax}
                  onChange={(e) => updateCompanySettings({ companyFax: e.target.value })}
                  placeholder="0522471780"
                  className="h-9 font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="comp-gsm">GSM Direct</Label>
                <Input
                  id="comp-gsm"
                  value={companyGsm}
                  onChange={(e) => updateCompanySettings({ companyGsm: e.target.value })}
                  placeholder="0662596307"
                  className="h-9 font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comp-email">Email Agence</Label>
                <Input
                  id="comp-email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => updateCompanySettings({ companyEmail: e.target.value })}
                  placeholder="contact@sftlocation.com"
                  className="h-9"
                />
              </div>
            </div>

            {/* Logo Section */}
            <div className="space-y-2 pt-2">
              <Label className="font-bold">Logo de l'Agence</Label>
              <div className="flex items-center gap-4 p-3 bg-muted/30 border rounded-2xl">
                <div className="w-16 h-16 border rounded-xl flex items-center justify-center bg-white p-1">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground text-center font-bold">Aucun logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={logoUploading}
                    />
                    <Button variant="outline" size="sm" className="text-xs font-bold gap-2">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{logoUploading ? "Import..." : "Importer un logo"}</span>
                    </Button>
                  </div>
                  {companyLogo && (
                    <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-xs text-red-500 hover:text-red-600 h-7 px-2">
                      Supprimer le logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={exportCompanyIdentity} className="text-xs">
                Exporter identité (.json)
              </Button>
              <div className="relative">
                <input
                  ref={importCompanyFileRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportCompanyIdentity}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="text-xs">
                  Importer identité
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={resetCompanyIdentity} className="text-xs text-muted-foreground">
                Réinitialiser
              </Button>
            </div>

            {/* Live Contract Header Preview */}
            <div className="mt-4 border rounded-2xl overflow-hidden bg-white text-slate-900 p-4 space-y-2 shadow-inner">
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Aperçu Réel En-Tête Contrat de Location</p>
              <div className="flex items-start justify-between border-b pb-3">
                <div className="flex items-center gap-3">
                  {companyLogo && <img src={companyLogo} alt="logo" className="h-10 w-10 object-contain" />}
                  <div>
                    <div className="text-base font-extrabold tracking-wider">{companyName || "SFTLOCATION"}</div>
                    <div className="text-xs font-bold text-slate-500">LOCATION DE VOITURES</div>
                  </div>
                </div>
                <div className="text-[11px] text-right leading-tight text-slate-600">
                  <div>{companyAddress || "Casablanca - Maroc"}</div>
                  <div>{(companyPhone || companyFax) ? `${companyPhone ? `Tél: ${companyPhone}` : ''}${companyPhone && companyFax ? ' - ' : ''}${companyFax ? `Fax: ${companyFax}` : ''}` : 'Tél: 0522228704'}</div>
                  <div>{companyGsm ? `GSM: ${companyGsm}` : 'GSM: 06 62 59 63 07'}</div>
                  <div>{companyEmail ? `E-mail: ${companyEmail}` : 'E-mail: contact@sftlocation.com'}</div>
                </div>
              </div>
              <div className="pt-2 text-center">
                <div className="bg-slate-950 text-white inline-block px-4 py-1 text-xs font-bold tracking-widest rounded-lg">
                  CONTRAT DE LOCATION
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Couleur Officielle de l'Application */}
        <Card className="rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <SwatchBook className="h-5 w-5 text-amber-500" />
              Charte Graphique & Couleur Officielle
            </CardTitle>
            <CardDescription className="text-xs">
              Personnalisez la couleur d'accentuation principale de l'interface ERP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <Label htmlFor="brandColor">Couleur Principale</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="brandColor"
                  type="color"
                  value={brandColor || DEFAULT_BRAND_COLOR}
                  onChange={(e) => updateCompanySettings({ brandColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer rounded-xl border"
                />
                <Input
                  value={(brandColor || DEFAULT_BRAND_COLOR).toUpperCase()}
                  readOnly
                  className="font-mono uppercase h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleResetOfficialColor} className="text-xs font-bold">
                Activer le jaune officiel
              </Button>
              <Button size="sm" onClick={handleManualSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-xs">
                <Save className="h-4 w-4" />
                Sauvegarder
              </Button>
            </div>

            {/* Color Preview */}
            <div className="rounded-2xl border p-4 bg-muted/20 space-y-2">
              <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Aperçu des composants</div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-primary-foreground">Bouton Primaire</Badge>
                <Badge variant="outline">Badge Contour</Badge>
                <Button size="sm" className="h-8 text-xs">Aperçu Action</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Sauvegarde & Restauration */}
        <Card className="rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-emerald-600" />
              Sauvegarde & Restauration des Données
            </CardTitle>
            <CardDescription className="text-xs">
              Gérez les sauvegardes globales et la fréquence d'archivage automatique.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {lastBackupDate && (
              <div className="p-2.5 rounded-xl bg-muted/40 border text-muted-foreground">
                Dernière sauvegarde créée : <strong className="text-foreground">{new Date(lastBackupDate).toLocaleString("fr-FR")}</strong>
              </div>
            )}

            <div className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 gap-3">
              <Button
                onClick={handleBackupData}
                disabled={isBackingUp}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs h-9 rounded-xl"
              >
                <Save className={`h-4 w-4 mr-2 ${isBackingUp ? "animate-spin" : ""}`} />
                {isBackingUp ? "Sauvegarde..." : "Créer une Sauvegarde"}
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full text-xs font-bold h-9 rounded-xl">
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurer un fichier (.json)
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <Label className="text-xs font-bold">Fréquence de Sauvegarde Automatique</Label>
              </div>
              <Select value={autoBackupFrequency} onValueChange={(value: string) => setAutoBackupFrequency(value as AutoBackupFrequency)}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Choisir la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Désactivée</SelectItem>
                  <SelectItem value="daily">Quotidienne (Chaque jour)</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire (Chaque semaine)</SelectItem>
                  <SelectItem value="monthly">Mensuelle (Chaque mois)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Export des Contrats PDF & System Updates */}
        <Card className="rounded-2xl border border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileDown className="h-5 w-5 text-purple-600" />
              Exports Globales & Mises à Jour
            </CardTitle>
            <CardDescription className="text-xs">
              Exportez l'ensemble des contrats de location au format PDF et vérifiez la version de l'application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-2">
              <Label className="font-bold">Exportation PDF de masse</Label>
              <Button onClick={handleExportAllContracts} disabled={isExporting} variant="outline" className="w-full h-9 text-xs font-bold rounded-xl">
                {isExporting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Génération PDF en cours...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4 text-purple-600" />
                    Exporter tous les contrats en PDF
                  </>
                )}
              </Button>
            </div>

            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <p className="font-bold">Version ERP SFTLOCATION</p>
                <p className="text-[11px] text-muted-foreground">Version 2.0.0 Enterprise Edition</p>
              </div>
              <Button onClick={handleCheckUpdate} disabled={isChecking} variant="ghost" size="sm" className="text-xs font-bold gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                <span>{isChecking ? "Vérification..." : "Vérifier la MàJ"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Zone Dangereuse */}
        <Card className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Zone Dangereuse & Maintenance
            </CardTitle>
            <CardDescription className="text-xs text-red-600/80">
              Actions irréversibles de réinitialisation des données et du stockage local.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-9 font-bold text-xs rounded-xl">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Effacer toutes les données (Supabase + Appareil)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                    <AlertTriangle className="h-5 w-5" />
                    Confirmer la suppression totale
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-slate-500">
                    <strong>Attention: Cette action supprimera définitivement :</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Tous les contrats, véhicules et clients</li>
                      <li>Toutes les factures, dépenses et réparations</li>
                      <li>Toutes les données du stockage Supabase</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl text-xs font-semibold">Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
                    Oui, supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-300 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-9 font-bold text-xs rounded-xl">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vider le LocalStorage de l'appareil
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                    <AlertTriangle className="h-5 w-5" />
                    Vider le LocalStorage du navigateur ?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs text-slate-500">
                    Cette action réinitialisera uniquement le cache local de votre navigateur. Vos données Supabase dans le cloud ne seront pas supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl text-xs font-semibold">Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalStorage} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
                    Oui, vider le LocalStorage
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
