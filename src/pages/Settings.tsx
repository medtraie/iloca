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
import { localStorageService } from '@/services/localStorageService';
import { useSettings } from '@/hooks/useSettings';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { applyBrandColor, BRAND_COLOR_STORAGE_KEY, DEFAULT_BRAND_COLOR } from '@/utils/brandTheme';
import { createClient } from "@supabase/supabase-js";

type AutoBackupFrequency = 'disabled' | 'daily' | 'weekly' | 'monthly';
import { usePDFGeneration } from '@/hooks/usePDFGeneration';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const Settings = () => {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const { generatePDF } = usePDFGeneration();
  const { 
    autoBackupFrequency, 
    setAutoBackupFrequency, 
    lastBackupDate,
    performBackup,
    performRestore,
    clearAllData 
  } = useSettings();
  const [companyName, setCompanyName] = useLocalStorage<string>('companyName', '');
  const [companyLogo, setCompanyLogo] = useLocalStorage<string | null>('companyLogo', null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [companyAddress, setCompanyAddress] = useLocalStorage<string>('companyAddress', '');
  const [companyPhone, setCompanyPhone] = useLocalStorage<string>('companyPhone', '');
  const [companyFax, setCompanyFax] = useLocalStorage<string>('companyFax', '');
  const [companyGsm, setCompanyGsm] = useLocalStorage<string>('companyGsm', '');
  const [companyEmail, setCompanyEmail] = useLocalStorage<string>('companyEmail', '');
  const [brandColor, setBrandColor] = useLocalStorage<string>(BRAND_COLOR_STORAGE_KEY, DEFAULT_BRAND_COLOR);
  const [gpsApiUrl, setGpsApiUrl] = useState("sf-tracker.pro");
  const [gpsEmail, setGpsEmail] = useState("");
  const [gpsPassword, setGpsPassword] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSaving, setGpsSaving] = useState(false);
  const [showGpsPassword, setShowGpsPassword] = useState(false);
  const importCompanyFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    applyBrandColor(brandColor || DEFAULT_BRAND_COLOR);
  }, [brandColor]);

  useEffect(() => {
    const loadGpsSettings = async () => {
      if (!supabase) return;
      setGpsLoading(true);
      try {
        const { data, error } = await supabase
          .from("gpswox_settings")
          .select("api_url,email,password")
          .is("company_id", null)
          .order("updated_at", { ascending: false })
          .limit(1);
        if (error) {
          throw error;
        }
        const row = data?.[0];
        if (row) {
          setGpsApiUrl(row.api_url || "");
          setGpsEmail(row.email || "");
          setGpsPassword(row.password || "");
        } else {
          setGpsApiUrl("sf-tracker.pro");
          setGpsEmail("");
          setGpsPassword("");
        }
      } catch (error: any) {
        toast({
          title: "Erreur chargement GPS",
          description: error?.message || "Impossible de charger les paramètres GPSwox",
          variant: "destructive"
        });
      } finally {
        setGpsLoading(false);
      }
    };
    loadGpsSettings();
  }, [toast]);

  const handleSaveGpsSettings = async () => {
    if (!supabase) {
      toast({
        title: "Configuration manquante",
        description: "VITE_SUPABASE_URL أو VITE_SUPABASE_PUBLISHABLE_KEY غير مضبوط",
        variant: "destructive"
      });
      return;
    }
    if (!gpsApiUrl || !gpsEmail || !gpsPassword) {
      toast({
        title: "Champs requis",
        description: "يرجى ملء API URL و Email و Password",
        variant: "destructive"
      });
      return;
    }
    setGpsSaving(true);
    try {
      const payload = {
        company_id: null,
        api_url: gpsApiUrl.trim(),
        email: gpsEmail.trim(),
        password: gpsPassword
      };

      const { data: existing, error: existingError } = await supabase
        .from("gpswox_settings")
        .select("id")
        .is("company_id", null)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (existingError) throw existingError;

      const existingId = existing?.[0]?.id;
      if (existingId) {
        const { error: updateError } = await supabase
          .from("gpswox_settings")
          .update(payload)
          .eq("id", existingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("gpswox_settings").insert(payload);
        if (insertError) throw insertError;
      }
      toast({
        title: "✅ GPS Tracker",
        description: "تم حفظ إعدادات GPSwox بنجاح"
      });
    } catch (error: any) {
      toast({
        title: "❌ GPS Tracker",
        description: error?.message || "فشل حفظ إعدادات GPSwox",
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
      setCompanyLogo(reader.result as string);
      toast({
        title: "Logo enregistré",
        description: "Le logo de l'entreprise a été mis à jour",
      });
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyLogo(null as any);
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
      if ('companyName' in obj) setCompanyName(obj.companyName || '');
      if ('companyLogo' in obj) setCompanyLogo(obj.companyLogo || null);
      if ('companyAddress' in obj) setCompanyAddress(obj.companyAddress || '');
      if ('companyPhone' in obj) setCompanyPhone(obj.companyPhone || '');
      if ('companyFax' in obj) setCompanyFax(obj.companyFax || '');
      if ('companyGsm' in obj) setCompanyGsm(obj.companyGsm || '');
      if ('companyEmail' in obj) setCompanyEmail(obj.companyEmail || '');
      toast({ title: "Import identité", description: "Identité de l'entreprise importée" });
    } catch {
      toast({ title: "Import échoué", description: "Fichier invalide", variant: "destructive" });
    } finally {
      if (importCompanyFileRef.current) importCompanyFileRef.current.value = '';
    }
  };

  const resetCompanyIdentity = () => {
    setCompanyName('');
    setCompanyLogo(null as any);
    setCompanyAddress('');
    setCompanyPhone('');
    setCompanyFax('');
    setCompanyGsm('');
    setCompanyEmail('');
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
      const contracts = localStorageService.getAll('contracts');
      
      if (contracts.length === 0) {
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

  const handleBackupData = async () => {
    setIsBackingUp(true);
    try {
      await performBackup();
      toast({
        title: "✅ Sauvegarde réussie",
        description: "Toutes les données ont été sauvegardées",
      });
    } catch (error) {
      toast({
        title: "❌ Erreur de sauvegarde",
        description: "Impossible de sauvegarder les données",
        variant: "destructive"
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await performRestore(text);
      
      if (success) {
        toast({
          title: "✅ Restauration réussie",
          description: "Les données ont été restaurées avec succès",
        });
        // Recharger la page pour refléter les nouvelles données
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error('Fichier invalide');
      }
    } catch (error) {
      toast({
        title: "❌ Erreur de restauration",
        description: "Le fichier de sauvegarde est invalide",
        variant: "destructive"
      });
    }
  };

  const handleClearAllData = async () => {
    try {
      await clearAllData();
      toast({
        title: "✅ Données supprimées",
        description: "Toutes les données ont été supprimées",
      });
      // Recharger la page pour refléter les changements
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer les données",
        variant: "destructive"
      });
    }
  };

  const handleClearLocalStorage = () => {
    try {
      localStorage.clear();
      toast({
        title: "✅ LocalStorage vidé",
        description: "Le localStorage du navigateur a été complètement vidé",
      });
      // Recharger la page pour refléter les changements
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de vider le localStorage",
        variant: "destructive"
      });
    }
  };

  const handleResetOfficialColor = () => {
    setBrandColor(DEFAULT_BRAND_COLOR);
    toast({
      title: "✅ اللون الرسمي مفعل",
      description: "تم اعتماد اللون الأصفر الرسمي للتطبيق",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2" dir="rtl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">إعدادات GPS Tracker</CardTitle>
            <CardDescription className="text-lg">
              للاتصال بنظام التتبع GPSwox/TrackPremier أدخل بيانات حساب
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gpsApiUrl">رابط API (API URL)</Label>
              <Input
                id="gpsApiUrl"
                value={gpsApiUrl}
                onChange={(e) => setGpsApiUrl(e.target.value)}
                placeholder="sf-tracker.pro"
                disabled={gpsLoading || gpsSaving}
              />
              <p className="text-sm text-muted-foreground">رابط خادم التتبع بدون `http://` أو `/api`</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gpsEmail">البريد الإلكتروني (Email)</Label>
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
              <Label htmlFor="gpsPassword">كلمة المرور (Password)</Label>
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
              {gpsSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
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
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: SFTLOCATION"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Adresse</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="10 Avenue des Far, 3ème Étage - Bureau N° 308 - Casablanca - Maroc"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Téléphone</Label>
                <Input
                  id="companyPhone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="0522228704"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyFax">Fax</Label>
                <Input
                  id="companyFax"
                  value={companyFax}
                  onChange={(e) => setCompanyFax(e.target.value)}
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
                  onChange={(e) => setCompanyGsm(e.target.value)}
                  placeholder="06 62 59 63 07"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">E-mail</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
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
                  onChange={(e) => setBrandColor(e.target.value)}
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
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Oui, supprimer toutes les données
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
