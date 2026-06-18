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
    
    // Si l'utilisateur demande le mode inclusif
    if (options.inclusive) {
      return Math.max(1, diffDays + 1); // +1 pour inclure les deux jours
    }
    
    // Mode normal: nombre de jours entre les dates
    return Math.max(1, diffDays);
  } catch (error) {
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
  } else if (contract.contract_data?.nombreDeJours) {
    baseDuration = parseInt(contract.contract_data.nombreDeJours.toString()) || 0;
  } else if (contract.contract_data?.duration) {
    baseDuration = parseInt(contract.contract_data.duration.toString()) || 0;
  } else if (contract.start_date && contract.end_date) {
    // MÊME LOGIQUE que recalculateContractFinancials
    baseDuration = daysBetween(contract.start_date, contract.end_date);
  } else {
    baseDuration = 1; // Minimum 1 jour
  }
  
  // 2. Calcul des jours d'extension - UTILISER LES DONNÉES RECALCULÉES
  let extensionDays = 0;
  if (contract.contract_data?.extensionDays && contract.contract_data.extensionDays > 0) {
    // Priorité aux données recalculées par recalculateContractFinancials
    extensionDays = contract.contract_data.extensionDays;
  } else {
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu;
    const extendedDaysField = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge;
    
    if (extensionUntil && extensionUntil !== "" && contract.end_date) {
      extensionDays = daysBetween(contract.end_date, extensionUntil);
    } else if (extendedDaysField && parseInt(extendedDaysField.toString()) > 0) {
      extensionDays = parseInt(extendedDaysField.toString());
    }
  }
  
  // 3. Calcul des jours de retard - UTILISER LES DONNÉES RECALCULÉES  
  let overdueDays = 0;
  if (contract.contract_data?.overdueDays && contract.contract_data.overdueDays > 0) {
    // Priorité aux données recalculées par recalculateContractFinancials
    overdueDays = contract.contract_data.overdueDays;
  } else if (contract.status === 'ouvert') {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu;
    const effectiveEndDate = extensionUntil && extensionUntil !== "" ? extensionUntil : contract.end_date;
    
    if (effectiveEndDate && today > effectiveEndDate) {
      overdueDays = daysBetween(effectiveEndDate, today);
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
    baseDuration,
    extensionDays,
    overdueDays
  };
}

/**
 * Helper pour obtenir le résumé d'un contrat avec les paiements
 * @param contractId - ID du contrat
 * @param contracts - Liste des contrats
 * @param payments - Liste des paiements (additionnels)
 * @returns Résumé du contrat
 */
export function getContractSummaryWithPayments(contractId: string, contracts: Contract[], payments: Payment[] = []) {
  const contract = contracts.find(c => c.id === contractId);
  if (!contract) return null;
  
  // Get base summary with advance_payment
  const summary = computeContractSummary(contract, { advanceMode: 'field' });
  
  // Filter payments for this contract
  const contractPayments = payments.filter(p => p.contractId === contractId || p.contractId === (contract as any).contract_number);
  
  // Calculate total paid including advance_payment and all additional payments
  const advancePayment = contract.advance_payment || 0;
  const additionalPaymentsTotal = contractPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = advancePayment + additionalPaymentsTotal;
  
  // Calculate remaining amount
  const remainingAmount = Math.max(0, summary.total - totalPaid);
  
  return {
    ...summary,
    avance: totalPaid,
    reste: remainingAmount,
    isFullyPaid: remainingAmount <= 0,
    payments: contractPayments
  };
}
