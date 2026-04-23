import { parseISO, differenceInDays, isValid } from 'date-fns';
import type { Payment } from '@/types/payment';

// Type definitions for better TypeScript support

interface ContractData {
  extensionUntil?: string;
  extendedDays?: number;
  originalAmount?: number;
  originalDays?: number;
  extensionAmount?: number;
  extensionDays?: number;
  overdueAmount?: number;
  overdueDays?: number;
  nombreDeJours?: number;
  duration?: number;
  rentalDays?: number;
}

interface Contract {
  id: string;
  start_date: string;
  end_date: string;
  daily_rate?: number;
  advance_payment?: number;
  total_amount?: number;
  status?: string;
  contract_data?: ContractData;
  prolongationAu?: string;
  nombreDeJourProlonge?: number;
}

/**
 * Calcule le nombre de jours entre deux dates pour la location
 * @param startDate - Date de début (ISO string)
 * @param endDate - Date de fin (ISO string) 
 * @param options - Options { inclusive: boolean }
 * @returns Nombre de jours
 */
export function daysBetween(startDate: string, endDate: string, options: { inclusive?: boolean } = { inclusive: false }): number {
  try {
    if (!startDate || !endDate) return 0;
    
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (!isValid(start) || !isValid(end)) return 0;
    
    // Normaliser les dates à minuit pour un calcul précis des jours calendaires
    const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    
    // Si les dates sont identiques = 1 jour de location
    if (startNormalized.getTime() === endNormalized.getTime()) {
      return 1;
    }
    
    // Calcul exact des jours calendaires
    const diffTime = endNormalized.getTime() - startNormalized.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Debug logging
    console.log(`[daysBetween] Start: ${startDate}, End: ${endDate}, Days: ${diffDays}, Inclusive: ${options.inclusive}`);
    
    // Si l'utilisateur demande le mode inclusif
    if (options.inclusive) {
      return Math.max(1, diffDays + 1); // +1 pour inclure les deux jours
    }
    
    // Mode normal: nombre de jours entre les dates
    return Math.max(1, diffDays);
  } catch (error) {
    console.warn('Error calculating days between dates:', error);
    return 1;
  }
}

/**
 * Calcule le total d'un contrat
 * @param prixJour - Prix journalier
 * @param duree - Durée en jours
 * @returns Total
 */
export function computeTotal(prixJour: number, duree: number): number {
  if (!prixJour || !duree || prixJour < 0 || duree < 0) return 0;
  return prixJour * duree;
}

/**
 * Calcule la somme des paiements confirmés
 * @param payments - Tableau des paiements
 * @returns Somme des paiements
 */
export function sumPayments(payments: Payment[] = []): number {
  if (!Array.isArray(payments)) return 0;
  return payments.reduce((sum, payment) => {
    return sum + (typeof payment.amount === 'number' ? payment.amount : 0);
  }, 0);
}

/**
 * Calcule un résumé complet du contrat
 * @param contract - Objet contrat
 * @param options - Options { advanceMode: 'initial' | 'sum' | 'field' }
 * @returns { duration, price, total, avance, reste, statut }
 */
export function computeContractSummary(contract: Contract | null, options: { advanceMode?: 'initial' | 'sum' | 'field' } = { advanceMode: 'field' }) {
  if (!contract) {
    return {
      duration: 0,
      price: 0,
      total: 0,
      avance: 0,
      reste: 0,
      statut: 'en attente'
    };
  }

  // 1. Calcul de la durée de base - UTILISER LA MÊME LOGIQUE que recalculateContractFinancials
  let baseDuration = 0;
  if (contract.contract_data?.originalDays && contract.contract_data.originalDays > 0) {
    // Priorité aux données recalculées par recalculateContractFinancials
    baseDuration = contract.contract_data.originalDays;
    console.log(`[DURATION] Using recalculated originalDays: ${baseDuration}`);
  } else if (contract.contract_data?.nombreDeJours) {
    baseDuration = parseInt(contract.contract_data.nombreDeJours.toString()) || 0;
    console.log(`[DURATION] Using stored nombreDeJours: ${baseDuration}`);
  } else if (contract.contract_data?.duration) {
    baseDuration = parseInt(contract.contract_data.duration.toString()) || 0;
    console.log(`[DURATION] Using stored duration: ${baseDuration}`);
  } else if (contract.start_date && contract.end_date) {
    // MÊME LOGIQUE que recalculateContractFinancials
    baseDuration = daysBetween(contract.start_date, contract.end_date);
    console.log(`[DURATION] Calculated from dates: ${baseDuration}`);
  } else {
    baseDuration = 1; // Minimum 1 jour
    console.log(`[DURATION] Default to 1 day`);
  }
  
  // 2. Calcul des jours d'extension - UTILISER LES DONNÉES RECALCULÉES
  let extensionDays = 0;
  if (contract.contract_data?.extensionDays && contract.contract_data.extensionDays > 0) {
    // Priorité aux données recalculées par recalculateContractFinancials
    extensionDays = contract.contract_data.extensionDays;
    console.log(`[EXTENSION] Using recalculated extensionDays: ${extensionDays}`);
  } else {
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu;
    const extendedDaysField = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge;
    
    if (extensionUntil && extensionUntil !== "" && contract.end_date) {
      extensionDays = daysBetween(contract.end_date, extensionUntil);
      console.log(`[EXTENSION] Calculated from dates: ${extensionDays}`);
    } else if (extendedDaysField && parseInt(extendedDaysField.toString()) > 0) {
      extensionDays = parseInt(extendedDaysField.toString());
      console.log(`[EXTENSION] Using stored field: ${extensionDays}`);
    }
  }
  
  // 3. Calcul des jours de retard - UTILISER LES DONNÉES RECALCULÉES  
  let overdueDays = 0;
  if (contract.contract_data?.overdueDays && contract.contract_data.overdueDays > 0) {
    // Priorité aux données recalculées par recalculateContractFinancials
    overdueDays = contract.contract_data.overdueDays;
    console.log(`[OVERDUE] Using recalculated overdueDays: ${overdueDays}`);
  } else if (contract.status === 'ouvert') {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu;
    const effectiveEndDate = extensionUntil && extensionUntil !== "" ? extensionUntil : contract.end_date;
    
    if (effectiveEndDate && today > effectiveEndDate) {
      overdueDays = daysBetween(effectiveEndDate, today);
      console.log(`[OVERDUE] Calculated: ${overdueDays}`);
    }
  }
  
  // 4. Durée totale
  const duration = baseDuration + extensionDays + overdueDays;
  
  // 5. Prix journalier
  const price = contract.daily_rate || 0;
  
  // 6. Montant total
  const total = computeTotal(price, duration);
  
  // 7. Calcul de l'avance - UTILISER SEULEMENT advance_payment du contrat
  let avance = contract.advance_payment || 0;
  console.log(`[ADVANCE] Using contract advance_payment: ${avance}`);
  
  // 8. Reste à payer
  const reste = Math.max(0, total - avance);
  
  // 9. Statut financier
  let statut = 'en attente';
  if (reste === 0) {
    statut = 'payé';
  } else if (avance > 0 && reste > 0) {
    statut = 'en cours';
  }
  
  return {
    duration,
    price,
    total,
    avance,
    reste,
    statut,
    // Détails supplémentaires pour debug
    baseDuration,
    extensionDays,
    overdueDays
  };
}

/**
 * Fonction de migration pour recalculer et corriger les données existantes
 */
export function migrateAllContracts(): Contract[] {
  try {
    console.log('🔄 [MIGRATION] Début de la migration des contrats...');
    
    // Backup automatique avant migration
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const contracts = JSON.parse(localStorage.getItem('contracts') || '[]');
    const payments = localStorage.getItem('payments');
    
    // Créer une sauvegarde
    if (contracts.length > 0) {
      localStorage.setItem(`contracts_backup_${timestamp}`, JSON.stringify(contracts));
      console.log(`💾 [BACKUP] Sauvegarde créée: contracts_backup_${timestamp}`);
    }
    if (payments) {
      localStorage.setItem(`payments_backup_${timestamp}`, payments);
      console.log(`💾 [BACKUP] Sauvegarde des paiements créée`);
    }
    
    console.log(`📊 [MIGRATION] ${contracts.length} contrats à migrer...`);
    
    const migratedContracts = contracts.map((contract: Contract) => {
      const summary = computeContractSummary(contract, { advanceMode: 'field' });
      
      // Mise à jour du contrat avec les valeurs recalculées
      const migratedContract = {
        ...contract,
        total_amount: summary.total,
        contract_data: {
          ...contract.contract_data,
          // Données de durée corrigées
          originalAmount: computeTotal(contract.daily_rate || 0, summary.baseDuration),
          originalDays: summary.baseDuration,
          extensionAmount: computeTotal(contract.daily_rate || 0, summary.extensionDays),
          extensionDays: summary.extensionDays,
          overdueAmount: computeTotal(contract.daily_rate || 0, summary.overdueDays),
          overdueDays: summary.overdueDays,
          // Marquer comme migré
          migratedAt: new Date().toISOString(),
          migratedVersion: '1.0'
        }
      };
      
      console.log(`✅ [CONTRAT ${(contract as any).contract_number || contract.id}] Durée: ${summary.duration}j, Total: ${summary.total} DH`);
      
      return migratedContract;
    });
    
    // Sauvegarder les contrats migrés
    localStorage.setItem('contracts', JSON.stringify(migratedContracts));
    
    console.log(`🎉 [MIGRATION] Terminée! ${migratedContracts.length} contrats traités.`);
    console.log('📋 [INFO] Les données originales sont sauvegardées dans localStorage avec le suffixe _backup_' + timestamp);
    
    return migratedContracts;
  } catch (error) {
    console.error('❌ [MIGRATION] Échec de la migration:', error);
    return [];
  }
}

/**
 * Helper pour obtenir le résumé d'un contrat avec les paiements
 * UTILISE SEULEMENT advance_payment, pas les paiements additionnels
 * @param contractId - ID du contrat
 * @param contracts - Liste des contrats
 * @returns Résumé du contrat
 */
export function getContractSummaryWithPayments(contractId: string, contracts: Contract[]) {
  const contract = contracts.find(c => c.id === contractId);
  if (!contract) return null;
  
  console.log(`[DEBUG] Calling getContractSummaryWithPayments for contract: ${contractId}`);
  
  // Get base summary with advance_payment
  const summary = computeContractSummary(contract, { advanceMode: 'field' });
  
  // Get all additional payments from localStorage
  const paymentsData = localStorage.getItem('payments');
  let allPayments: Payment[] = [];
  if (paymentsData) {
    try {
      allPayments = JSON.parse(paymentsData);
    } catch (e) {
      console.error('[ERROR] Failed to parse payments:', e);
    }
  }
  
  // Filter payments for this contract
  const contractPayments = allPayments.filter(p => p.contractId === contractId);
  
  // Calculate total paid including advance_payment and all additional payments
  const advancePayment = contract.advance_payment || 0;
  const additionalPaymentsTotal = contractPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = advancePayment + additionalPaymentsTotal;
  
  // Calculate remaining amount
  const remainingAmount = Math.max(0, summary.total - totalPaid);
  
  console.log(`[💰 PAYMENT UPDATE] Contract ${contractId}:`, {
    total: summary.total,
    advancePayment,
    additionalPayments: additionalPaymentsTotal,
    totalPaid,
    remainingAmount
  });
  
  return {
    ...summary,
    avance: totalPaid,
    reste: remainingAmount,
    payments: contractPayments,
    isFullyPaid: remainingAmount <= 0
  };
}