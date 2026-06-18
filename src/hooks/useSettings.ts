import { useState, useEffect } from "react";
import { settingsRepository, AppSettings } from "@/repositories/settingsRepository";
import { BackupPreferences, AutoBackupFrequency } from "@/types/appData";
import { useToast } from "@/hooks/use-toast";

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsRepository.get();
      setSettings(data);
      (globalThis as any).__iloca_company_settings = data.company;
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    try {
      const updated = await settingsRepository.update(updates);
      setSettings(updated);
      (globalThis as any).__iloca_company_settings = updated.company;
      toast({ title: "Paramètres enregistrés" });
      return updated;
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'enregistrement", variant: "destructive" });
      return null;
    }
  };

  const setAutoBackupFrequency = async (frequency: AutoBackupFrequency) => {
    await updateSettings({ backup: { ...settings?.backup, autoBackupFrequency: frequency } as BackupPreferences });
  };

  const clearAllData = async () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('rental_app_'));
    keys.forEach(k => localStorage.removeItem(k));
    toast({ title: "Cache local vidé" });
  };

  return {
    settings,
    companySettings: settings?.company,
    backupPreferences: settings?.backup,
    gpsSettings: settings?.gps,
    autoBackupFrequency: settings?.backup?.autoBackupFrequency || "disabled",
    lastBackupDate: settings?.backup?.lastBackupDate,
    loading,
    updateSettings,
    setAutoBackupFrequency,
    clearAllData,
    refetch: fetchSettings,
    performBackup: async () => { toast({ title: "Bientôt disponible", description: "La sauvegarde cloud sera disponible prochainement." }); },
    performRestore: async () => { toast({ title: "Bientôt disponible", description: "La restauration cloud sera disponible prochainement." }); }
  };
};
