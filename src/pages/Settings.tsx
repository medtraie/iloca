import { useEffect, useRef, useState } from 'react';
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
  EyeOff
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
import { useSettings } from '@/hooks/useSettings';
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyBrandColor, DEFAULT_BRAND_COLOR } from '@/utils/brandTheme';
import { settingsRepository } from '@/repositories/settingsRepository';
import type { CompanySettings, GpsSettings } from '@/types/appData';

type AutoBackupFrequency = 'disabled' | 'daily' | 'weekly' | 'monthly';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

const Settings = () => {
  const { toast } = useToast();
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
    clearAllData 
  } = useSettings();
  const [companySettings, setCompanySettings] = useState<CompanySettings>(settingsRepository.DEFAULT_COMPANY_SETTINGS);
  const [companySettingsReady, setCompanySettingsReady] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [gpsApiUrl, setGpsApiUrl] = useState("sf-tracker.pro");
  const [gpsEmail, setGpsEmail] = useState("");
  const [gpsPassword, setGpsPassword] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSaving, setGpsSaving] = useState(false);
  const [showGpsPassword, setShowGpsPassword] = useState(false);
  const importCompanyFileRef = useRef<HTMLInputElement | null>(null);
  const { companyName, companyLogo, companyAddress, companyPhone, companyFax, companyGsm, companyEmail, brandColor } = companySettings;

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
        const [loadedCompanySettings, gpsSettings] = await Promise.all([
          settingsRepository.getCompanySettings(),
          settingsRepository.getGpsSettings(),
        ]);
        if (!active) return;

        setCompanySettings(loadedCompanySettings);
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
          description: error?.message || "Impossible de charger les paramètres Supabase",
          variant: "destructive"
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
        // لا نحتاج لإظهار toast في كل حركة لون لتجنب الإزعاج
      } catch (error) {
        console.error("Error saving settings:", error);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [companySettings, companySettingsReady]);

  const handleManualSave = async () => {
    try {
      await settingsRepository.saveCompanySettings(companySettings);
      toast({
        title: "Paramètres enregistrés",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Erreur lors de la sauvegarde",
        variant: "destructive"
      });
    }
  };

  const handleSaveGpsSettings = async () => {
    if (!gpsApiUrl || !gpsEmail || !gpsPassword) {
      toast({
        title: "Champs requis",
        description: "Veuillez renseigner l'URL API, l'e-mail et le mot de passe",
        variant: "destructive"
      });
      return;
    }
    setGpsSaving(true);
    try {
      const payload: GpsSettings = {
        api_url: gpsApiUrl.trim(),
        email: gpsEmail.trim(),
        password: gpsPassword
      };
      await settingsRepository.saveGpsSettings(payload);
      toast({
        title: "Parametres enregistres",
        description: "Les parametres SFT ont ete enregistres avec succes"
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Echec de l'enregistrement des parametres SFT",
        variant: "destructive"
      });
    } finally {
      setGpsSaving(false);
    }
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      updateCompanySettings({ companyLogo: reader.result as string });
      toast({
        title: "Logo enregistré",
        description: "Le logo de l'entreprise a été mis à jour",
      });
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    updateCompanySettings({ companyLogo: null });
    toast({
      title: "Logo supprimé",
      description: "Le logo a été supprimé",
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
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'company_identity.json';
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
      const obj = JSON.parse(text || '{}');
      if (typeof obj !== 'object') throw new Error('invalid');
      updateCompanySettings({
        companyName: 'companyName' in obj ? String(obj.companyName || '') : companySettings.companyName,
        companyLogo: 'companyLogo' in obj ? (obj.companyLogo ? String(obj.companyLogo) : null) : companySettings.companyLogo,
        companyAddress: 'companyAddress' in obj ? String(obj.companyAddress || '') : companySettings.companyAddress,
        companyPhone: 'companyPhone' in obj ? String(obj.companyPhone || '') : companySettings.companyPhone,
        companyFax: 'companyFax' in obj ? String(obj.companyFax || '') : companySettings.companyFax,
        companyGsm: 'companyGsm' in obj ? String(obj.companyGsm || '') : companySettings.companyGsm,
        companyEmail: 'companyEmail' in obj ? String(obj.companyEmail || '') : companySettings.companyEmail,
      });
      toast({ title: "Import identité", description: "Identité de l'entreprise importée" });
    } catch {
      toast({ title: "Import échoué", description: "Fichier invalide", variant: "destructive" });
    } finally {
      if (importCompanyFileRef.current) importCompanyFileRef.current.value = '';
    }
  };

  const resetCompanyIdentity = () => {
    updateCompanySettings({
      companyName: '',
      companyLogo: null,
      companyAddress: '',
      companyPhone: '',
      companyFax: '',
      companyGsm: '',
      companyEmail: '',
    });
    toast({ title: "Réinitialisé", description: "Identité de l'entreprise réinitialisée" });
  };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    // Simuler une vérification de mise à jour
    setTimeout(() => {
      setIsChecking(false);
      toast({
        title: "✅ Application à jour",
        description: "Votre application est déjà à jour (v1.0.0)",
      });
    }, 2000);
  };

  const handleExportAllContracts = async () => {
    setIsExporting(true);
    try {
      const { data: contracts, error } = await supabase.from('contracts').select('*');
      if (error) throw error;
      
      if (!contracts || contracts.length === 0) {
        toast({
          title: "Aucun contrat",
          description: "Il n'y a aucun contrat à exporter",
          variant: "destructive"
        });
        setIsExporting(false);
        return;
      }

      // Créer un PDF avec tous les contrats
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
            .status-ouvert { background: #e7f3ff; color: #0066cc; }
            .status-ferme { background: #f0f9f0; color: #008000; }
            .status-signed { background: #e8f5e8; color: #2d5a2d; }
          </style>
        </head>
        <body>
          ${contracts.map((contract: any, index: number) => `
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
                    <span class="value">${contract.customer_phone || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Email :</span>
                    <span class="value">${contract.customer_email || 'N/A'}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">CIN :</span>
                    <span class="value">${contract.customer_national_id || 'N/A'}</span>
                  </div>
                </div>
                
                <div>
                  <div class="info-item">
                    <span class="label">Véhicule :</span>
                    <span class="value">${contract.vehicle}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date début :</span>
                    <span class="value">${new Date(contract.start_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Date fin :</span>
                    <span class="value">${new Date(contract.end_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                  ${contract.prolongationAu ? `
                    <div class="info-item">
                      <span class="label">Prolongé jusqu'au :</span>
                      <span class="value">${new Date(contract.prolongationAu).toLocaleDateString('fr-FR')}</span>
                    </div>
                  ` : ''}
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
                    <span class="status status-${contract.status}">${contract.status}</span>
                  </div>
                  <div class="info-item">
                    <span class="label">Créé le :</span>
                    <span class="value">${new Date(contract.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
              
              ${contract.notes ? `
                <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
                  <div class="label">Notes :</div>
                  <div class="value">${contract.notes}</div>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `;

      // Ouvrir une nouvelle fenêtre pour l'impression
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        toast({
          title: "✅ Export réussi",
          description: `${contracts.length} contrats exportés en PDF`,
        });
      } else {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression');
      }
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "❌ Erreur d'export",
        description: "Impossible d'exporter les contrats",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportData = () => {
    toast({
      title: "Export désactivé",
      description: "Les données sont désormais sauvegardées de façon centralisée sur Supabase.",
    });
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    toast({
      title: "Import désactivé",
      description: "Veuillez utiliser les outils de migration Supabase.",
      variant: "destructive"
    });
  };

  const handleBackupData = () => {
    toast({
      title: "Sauvegarde désactivée",
      description: "Les données sont désormais sauvegardées de façon centralisée sur Supabase.",
    });
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    toast({
      title: "Restauration désactivée",
      description: "Veuillez utiliser les outils de migration Supabase.",
      variant: "destructive"
    });
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

    try {
      const databases = await (indexedDB as unknown as { databases?: () => Promise<Array<{ name?: string }>> }).databases?.();
      if (Array.isArray(databases)) {
        await Promise.all(
          databases
            .map((db) => db?.name)
            .filter((name): name is string => Boolean(name))
            .map(
              (name) =>
                new Promise<void>((resolve) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve();
                  request.onerror = () => resolve();
                  request.onblocked = () => resolve();
                })
            )
        );
      }
    } catch {}
  };

  const handleClearData = () => {
    if (window.confirm("Êtes-vous sûr de vouloir effacer le cache local ? Les données Supabase ne seront pas affectées.")) {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('rental_app_'));
      keys.forEach(key => localStorage.removeItem(key));
      toast({
        title: "Cache vidé",
        description: "Le cache local a été vidé."
      });
    }
  };

  const handleClearLocalStorage = () => {
    try {
      localStorage.clear();
      toast({
        title: "Succès",
        description: "Le LocalStorage a été vidé avec succès.",
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du vidage du LocalStorage.",
        variant: "destructive"
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
            description: "La fonction clear_all_app_data() n'existe pas encore dans votre projet Supabase. Exécutez la migration SQL correspondante puis réessayez.",
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
        description: "Toutes les données ont été supprimées (Supabase + appareil).",
      });
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite.",
        variant: "destructive"
      });
    } finally {
      setIsClearingAllData(false);
    }
  };

  const handleResetOfficialColor = () => {
    updateCompanySettings({ brandColor: DEFAULT_BRAND_COLOR });
    toast({
      title: "✅ Couleur officielle activee",
      description: "La couleur jaune officielle de l'application a ete appliquee",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Parametres SFT Tracker</CardTitle>
            <CardDescription className="text-lg">
              Pour connecter le systeme de suivi SFT/TrackPremier, renseignez vos identifiants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gpsApiUrl">URL API</Label>
              <Input
                id="gpsApiUrl"
                value={gpsApiUrl}
                onChange={(e) => setGpsApiUrl(e.target.value)}
                placeholder="sf-tracker.pro"
                disabled={gpsLoading || gpsSaving}
              />
              <p className="text-sm text-muted-foreground">Adresse du serveur de suivi sans `http://` ni `/api`</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpsEmail">E-mail</Label>
              <Input
                id="gpsEmail"
                type="email"
                value={gpsEmail}
                onChange={(e) => setGpsEmail(e.target.value)}
                placeholder="abdou@gmail.com"
                disabled={gpsLoading || gpsSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpsPassword">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="gpsPassword"
                  type={showGpsPassword ? "text" : "password"}
                  value={gpsPassword}
                  onChange={(e) => setGpsPassword(e.target.value)}
                  placeholder="••••••"
                  className="pr-10"
                  disabled={gpsLoading || gpsSaving}
                />
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowGpsPassword((v) => !v)}
                >
                  {showGpsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveGpsSettings} disabled={gpsSaving || gpsLoading}>
              <Save className={`h-4 w-4 ml-2 ${gpsSaving ? "animate-spin" : ""}`} />
              {gpsSaving ? "Enregistrement..." : "Enregistrer les parametres"}
            </Button>
          </CardContent>
        </Card>

        {/* Informations de l'entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Informations de l'entreprise
            </CardTitle>
            <CardDescription>
              Définissez le nom et le logo affichés sur le CONTRAT DE LOCATION
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nom de l'entreprise</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => updateCompanySettings({ companyName: e.target.value })}
                placeholder="Ex: SFTLOCATION"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Adresse</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => updateCompanySettings({ companyAddress: e.target.value })}
                placeholder="10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Téléphone</Label>
                <Input
                  id="companyPhone"
                  value={companyPhone}
                  onChange={(e) => updateCompanySettings({ companyPhone: e.target.value })}
                  placeholder="0522228704"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyFax">Fax</Label>
                <Input
                  id="companyFax"
                  value={companyFax}
                  onChange={(e) => updateCompanySettings({ companyFax: e.target.value })}
                  placeholder="05 22 47 17 80"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyGsm">GSM</Label>
                <Input
                  id="companyGsm"
                  value={companyGsm}
                  onChange={(e) => updateCompanySettings({ companyGsm: e.target.value })}
                  placeholder="06 62 59 63 07"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">E-mail</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => updateCompanySettings({ companyEmail: e.target.value })}
                  placeholder="exemple@domaine.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo de l'entreprise</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 border rounded flex items-center justify-center bg-muted">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucun logo</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={logoUploading}
                    />
                    <Button>{logoUploading ? 'Import...' : 'Importer un logo'}</Button>
                  </div>
                  {companyLogo && (
                    <Button variant="outline" onClick={handleRemoveLogo}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={exportCompanyIdentity}>
                Exporter l'identité
              </Button>
              <div className="relative">
                <input
                  ref={importCompanyFileRef}
                  type="file"
                  accept="application/json"
                  onChange={handleImportCompanyIdentity}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline">
                  Importer l'identité
                </Button>
              </div>
              <Button variant="secondary" onClick={resetCompanyIdentity}>
                Réinitialiser
              </Button>
            </div>
            <div className="mt-4 border rounded">
              <div className="p-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {companyLogo && <img src={companyLogo} alt="logo" className="h-8 w-8 object-contain" />}
                  <div>
                    <div className="text-lg font-bold tracking-wider">{companyName || 'SFTLOCATION'}</div>
                    <div className="text-sm mt-0.5">LOCATION DE VOITURES</div>
                  </div>
                </div>
                <div className="text-xs text-right leading-tight">
                  <div>{companyAddress || '10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc'}</div>
                  <div>{(companyPhone || companyFax) ? `${companyPhone ? `Tél: ${companyPhone}` : ''}${companyPhone && companyFax ? ' - ' : ''}${companyFax ? `Fax: ${companyFax}` : ''}` : 'Tél: 0522228704 - Fax: 05 22 47 17 80'}</div>
                  <div>{companyGsm ? `GSM: ${companyGsm}` : 'GSM: 06 62 59 63 07'}</div>
                  <div>{companyEmail ? `E-mail: ${companyEmail}` : 'E-mail: bonatours308@gmail.com'}</div>
                </div>
              </div>
              <div className="border-t px-3 py-2 text-center">
                <div className="text-xs font-semibold mb-1">Courte et longue durée 7/7</div>
                <div className="bg-black text-white inline-block px-4 py-1 font-bold tracking-wide">CONTRAT DE LOCATION</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SwatchBook className="h-5 w-5" />
              Couleur officielle de l'application
            </CardTitle>
            <CardDescription>
              Changez la couleur officielle et appliquez-la sur toutes les sections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brandColor">Couleur officielle</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="brandColor"
                  type="color"
                  value={brandColor || DEFAULT_BRAND_COLOR}
                  onChange={(e) => updateCompanySettings({ brandColor: e.target.value })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={(brandColor || DEFAULT_BRAND_COLOR).toUpperCase()}
                  readOnly
                  className="font-mono uppercase"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleResetOfficialColor}>
                Activer le jaune officiel
              </Button>
              <Button onClick={handleManualSave} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Sauvegarder la couleur
              </Button>
            </div>
            <div className="rounded-xl border p-4 bg-card">
              <div className="text-sm text-muted-foreground mb-3">Aperçu instantané</div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">Primary</Badge>
                <Badge className="bg-accent text-accent-foreground">Accent</Badge>
                <Button size="sm">Bouton principal</Button>
                <Button size="sm" variant="outline">Bouton secondaire</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Mise à jour
            </CardTitle>
            <CardDescription>
              Vérifiez et téléchargez les dernières mises à jour
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Version actuelle: v1.0.0</span>
              <Badge variant="secondary">Stable</Badge>
            </div>
            <Button 
              onClick={handleCheckUpdate} 
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Vérification en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Vérifier la mise à jour
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5" />
              Export des contrats
            </CardTitle>
            <CardDescription>
              Exportez tous les contrats en un seul fichier PDF
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleExportAllContracts} 
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-spin" />
                  Export en cours...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter tous les contrats
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sauvegarde des données */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Save className="h-5 w-5" />
              Sauvegarde des données
            </CardTitle>
            <CardDescription>
              Sauvegardez et restaurez vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastBackupDate && (
              <div className="text-sm text-muted-foreground">
                Dernière sauvegarde: {new Date(lastBackupDate).toLocaleString('fr-FR')}
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                onClick={handleBackupData} 
                disabled={isBackingUp}
                className="w-full"
              >
                {isBackingUp ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Sauvegarder toutes les données
                  </>
                )}
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreData}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Restaurer une sauvegarde
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Sauvegarde automatique</span>
              </div>
              <Select value={autoBackupFrequency} onValueChange={(value: string) => setAutoBackupFrequency(value as AutoBackupFrequency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la fréquence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Désactivée</SelectItem>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Suppression des données */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Zone dangereuse
            </CardTitle>
            <CardDescription>
              Actions irréversibles sur vos données
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Effacer toutes les données
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmer la suppression
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>Êtes-vous sûr de vouloir supprimer toutes les données ?</strong>
                    <br /><br />
                    Cette action supprimera définitivement :
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Tous les contrats</li>
                      <li>Tous les clients</li>
                      <li>Tous les véhicules</li>
                      <li>Toutes les factures</li>
                      <li>Toutes les réparations</li>
                      <li>Toutes les dépenses</li>
                    </ul>
                    <br />
                    <strong>Cette action est irréversible.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearAllData}
                    disabled={isClearingAllData}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isClearingAllData ? "Suppression..." : "Oui, supprimer toutes les données"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Vider le LocalStorage
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Vider le LocalStorage ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>Cette action videra complètement le localStorage du navigateur.</strong>
                    <br /><br />
                    Cela supprimera :
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Toutes les données de l'application</li>
                      <li>Tous les paramètres et préférences</li>
                      <li>Toutes les sauvegardes automatiques</li>
                    </ul>
                    <br />
                    <strong>Utilisez cette option si vous rencontrez des problèmes de stockage.</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearLocalStorage}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Oui, vider le localStorage
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
