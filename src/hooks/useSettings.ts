import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { localStorageService } from '@/services/localStorageService';
import { useToast } from '@/hooks/use-toast';

type AutoBackupFrequency = 'disabled' | 'daily' | 'weekly' | 'monthly';

export const useSettings = () => {
  const { toast } = useToast();
  const [autoBackupFrequency, setAutoBackupFrequency] = useLocalStorage<AutoBackupFrequency>('autoBackupFrequency', 'disabled');
  const [lastBackupDate, setLastBackupDate] = useLocalStorage<string | null>('lastBackupDate', null);
  const [lastAutoBackupCheck, setLastAutoBackupCheck] = useLocalStorage<string | null>('lastAutoBackupCheck', null);

  // Vérifier si une sauvegarde automatique est nécessaire
  const checkAutoBackup = () => {
    if (autoBackupFrequency === 'disabled') return;

    const now = new Date();
    const lastCheck = lastAutoBackupCheck ? new Date(lastAutoBackupCheck) : null;
    
    if (!lastCheck) {
      setLastAutoBackupCheck(now.toISOString());
      return;
    }

    let shouldBackup = false;
    const timeDiff = now.getTime() - lastCheck.getTime();
    
    switch (autoBackupFrequency) {
      case 'daily':
        shouldBackup = timeDiff >= 24 * 60 * 60 * 1000; // 24 heures
        break;
      case 'weekly':
        shouldBackup = timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 jours
        break;
      case 'monthly':
        shouldBackup = timeDiff >= 30 * 24 * 60 * 60 * 1000; // 30 jours
        break;
    }

    if (shouldBackup) {
      performAutoBackup();
      setLastAutoBackupCheck(now.toISOString());
    }
  };

  // Effectuer une sauvegarde automatique
  const performAutoBackup = async () => {
    try {
      const data = localStorageService.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Sauvegarder en localStorage comme backup automatique
      localStorage.setItem('autoBackup_data', data);
      localStorage.setItem('autoBackup_date', new Date().toISOString());
      
      setLastBackupDate(new Date().toISOString());
      
      toast({
        title: "🔄 Sauvegarde automatique",
        description: "Sauvegarde automatique effectuée avec succès",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
    }
  };

  // Effectuer une sauvegarde manuelle
  const performBackup = async () => {
    const data = localStorageService.exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    setLastBackupDate(new Date().toISOString());
  };

  // Restaurer des données
  const performRestore = async (jsonData: string): Promise<boolean> => {
    return localStorageService.importAllData(jsonData);
  };

  // Restaurer la dernière sauvegarde automatique
  const restoreAutoBackup = async (): Promise<boolean> => {
    const autoBackupData = localStorage.getItem('autoBackup_data');
    if (!autoBackupData) return false;
    
    return performRestore(autoBackupData);
  };

  // Effacer toutes les données
  const clearAllData = async () => {
    localStorageService.clearAllData();
    // Réinitialiser aussi les données de paramètres
    setLastBackupDate(null);
    setLastAutoBackupCheck(null);
    localStorage.removeItem('autoBackup_data');
    localStorage.removeItem('autoBackup_date');
  };

  // Obtenir la date de la dernière sauvegarde automatique
  const getAutoBackupDate = (): string | null => {
    return localStorage.getItem('autoBackup_date');
  };

  // Vérifier la sauvegarde automatique au chargement et périodiquement
  useEffect(() => {
    checkAutoBackup();
    
    // Vérifier toutes les heures
    const interval = setInterval(checkAutoBackup, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [autoBackupFrequency, lastAutoBackupCheck]);

  return {
    autoBackupFrequency,
    setAutoBackupFrequency,
    lastBackupDate,
    performBackup,
    performRestore,
    clearAllData,
    restoreAutoBackup,
    getAutoBackupDate,
  };
};