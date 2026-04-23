import { Contract } from "@/services/localStorageService";
import { format, parseISO, isAfter, isBefore, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { daysBetween } from "./contractMath";

export type FinancialStatus = "paye" | "en_attente" | "impaye" | "prolonger" | "en_cours";

export interface FinancialStatusInfo {
  status: FinancialStatus;
  label: string;
  color: string;
  description: string;
}

export interface PaymentSummary {
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  payments: any[];
}

/**
 * Calcule l'état financier d'un contrat basé sur les paiements et le statut :
 * - Contrats ouverts: En attente, Prolongé, Impayé (logique existante)
 * - Contrats fermés: En cours (reste à payer > 0), Payé (reste à payer = 0)
 */
export function getContractFinancialStatusWithPayments(
  contract: Contract, 
  paymentSummary: PaymentSummary
): FinancialStatusInfo {
  // Pour les contrats fermés, utiliser les paiements réels
  if (contract.status === 'ferme' || contract.status === 'completed') {
    if (paymentSummary.remainingAmount > 0) {
      return {
        status: "en_cours",
        label: "En cours",
        color: "text-orange-600 bg-orange-100",
        description: `Reste ${paymentSummary.remainingAmount.toFixed(2)} DH à payer`
      };
    } else {
      return {
        status: "paye",
        label: "Payé", 
        color: "text-green-600 bg-green-100",
        description: "Contrat entièrement soldé"
      };
    }
  }

  // Pour les contrats ouverts, utiliser la logique existante
  return getContractFinancialStatus(contract);
}

/**
 * Calcule l'état financier d'un contrat selon les règles métier :
 * - Payé: contrat fermé (status = 'ferme' ou 'completed')
 * - En attente: contrat ouvert, now <= plannedEndDate, pas d'extensions
 * - Impayé: contrat ouvert, now > plannedEndDate, pas d'extension active
 * - Prolonger: contrat ouvert avec extension active
 */
export function getContractFinancialStatus(contract: Contract): FinancialStatusInfo {
  const today = new Date();
  
  // Règle 1: Si le contrat est fermé → Payé
  if (contract.status === 'ferme' || contract.status === 'completed') {
    return {
      status: "paye",
      label: "Payé",
      color: "text-green-600 bg-green-100",
      description: "Contrat fermé et facture réglée"
    };
  }

  // Pour les contrats ouverts uniquement
  if (contract.status === 'ouvert') {
    // Calculer la date de fin effective (avec ou sans prolongation)
    let effectiveEndDate: Date;
    let hasExtension = false;
    
    try {
      const plannedEndDate = parseISO(contract.end_date);
      effectiveEndDate = plannedEndDate;
      
      // Vérifier les prolongations - support both old and new field names
      const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
      const extendedDays = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays;
      
      if ((extensionUntil && extensionUntil !== "") || (extendedDays && parseInt(extendedDays.toString()) > 0)) {
        hasExtension = true;
        
        if (extensionUntil && extensionUntil !== "") {
          effectiveEndDate = parseISO(extensionUntil);
        } else if (extendedDays && parseInt(extendedDays.toString()) > 0) {
          effectiveEndDate = new Date(plannedEndDate);
          effectiveEndDate.setDate(effectiveEndDate.getDate() + parseInt(extendedDays.toString()));
        }
      }
      
      // Priorité à l'état Impayé si la date effective est dépassée
      if (isBefore(effectiveEndDate, today)) {
        const overdueDays = Math.floor((today.getTime() - effectiveEndDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: "impaye",
          label: "Impayé",
          color: "text-red-600 bg-red-100",
          description: `En retard de ${overdueDays} jour(s) (dépassement depuis le ${format(effectiveEndDate, 'dd/MM/yyyy', { locale: fr })})`
        };
      }
      
      // Si pas de dépassement mais avec prolongation → Prolonger  
      if (hasExtension) {
        const prolongDescription = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil
          ? `jusqu'au ${format(effectiveEndDate, 'dd/MM/yyyy', { locale: fr })}`
          : `de ${contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays} jour(s)`;
        
        return {
          status: "prolonger",
          label: "Prolongé",
          color: "text-blue-600 bg-blue-100", 
          description: `Prolongé ${prolongDescription}`
        };
      }
      
      // Sinon En attente (dans les délais sans prolongation)
      if (isAfter(effectiveEndDate, today) || isToday(effectiveEndDate)) {
        const remainingDays = Math.ceil((effectiveEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          status: "en_attente",
          label: "En attente",
          color: "text-yellow-600 bg-yellow-100",
          description: remainingDays > 0 ? `${remainingDays} jour(s) restant(s)` : "Se termine aujourd'hui"
        };
      }
      
    } catch (error) {
      console.warn("Erreur lors du parsing de la date:", contract.end_date);
    }
  }

  // Par défaut pour les contrats sans dates ou états non reconnus
  return {
    status: "en_attente",
    label: "En attente",
    color: "text-yellow-600 bg-yellow-100",
    description: "Location en cours"
  };
}

/**
 * Filtre les contrats par état financier avec support des paiements
 */
export function filterContractsByFinancialStatusWithPayments(
  contracts: Contract[], 
  statusFilter: "all" | FinancialStatus,
  getPaymentSummary: (contractId: string) => PaymentSummary
): Contract[] {
  if (statusFilter === "all") {
    return contracts;
  }

  return contracts.filter(contract => {
    const paymentSummary = getPaymentSummary(contract.id);
    const financialStatus = getContractFinancialStatusWithPayments(contract, paymentSummary);
    return financialStatus.status === statusFilter;
  });
}

/**
 * Filtre les contrats par état financier
 */
export function filterContractsByFinancialStatus(
  contracts: Contract[], 
  statusFilter: "all" | FinancialStatus
): Contract[] {
  if (statusFilter === "all") {
    return contracts;
  }

  return contracts.filter(contract => {
    const financialStatus = getContractFinancialStatus(contract);
    return financialStatus.status === statusFilter;
  });
}

/**
 * Retourne les couleurs pour la vue Gantt basées sur l'état financier
 */
export function getGanttColorByFinancialStatus(contract: Contract): string {
  const status = getContractFinancialStatus(contract);
  
  switch (status.status) {
    case "paye":
      return "bg-green-500 border-green-600 text-white"; // Vert pour payé
    case "en_attente":
      return "bg-yellow-400 border-yellow-500 text-gray-800"; // Jaune pour en attente
    case "impaye":
      return "bg-red-500 border-red-600 text-white"; // Rouge pour impayé
    case "prolonger":
      return "bg-blue-500 border-blue-600 text-white"; // Bleu pour prolongé
    default:
      return "bg-gray-400 border-gray-500 text-white"; // Gris par défaut
  }
}

/**
 * Génère les segments de barre Gantt pour un contrat avec gestion des prolongations
 */
export function generateGanttSegments(contract: Contract) {
  const status = getContractFinancialStatus(contract);
  const today = new Date();
  
  try {
    const startDate = parseISO(contract.start_date);
    const endDate = parseISO(contract.end_date);
    
    const segments = [];
    
    // Segment principal (période normale)
    const mainSegment = {
      start: startDate,
      end: endDate,
      color: getGanttColorByFinancialStatus(contract),
      label: status.label,
      type: 'main' as const
    };
    
    segments.push(mainSegment);
    
    // Segment de prolongation si applicable
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
    const extendedDays = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays;
    
    if ((extensionUntil && extensionUntil !== "") || (extendedDays && parseInt(extendedDays.toString()) > 0)) {
      const prolongStart = endDate;
      let prolongEnd: Date;
      
      if (extensionUntil && extensionUntil !== "") {
        prolongEnd = parseISO(extensionUntil);
      } else {
        // Calculer la date de fin basée sur les jours prolongés
        prolongEnd = new Date(endDate);
        prolongEnd.setDate(prolongEnd.getDate() + parseInt(extendedDays.toString()));
      }
      
      // Utiliser la même couleur de base que le contrat principal mais avec un effet dégradé
      const mainColor = getGanttColorByFinancialStatus(contract);
      
      segments.push({
        start: prolongStart,
        end: prolongEnd,
        color: mainColor,
        label: "Prolongé",
        type: 'extension' as const,
        gradient: true // Flag pour indiquer qu'on veut un dégradé
      });
    }
    
    // Segment de dépassement pour les impayés
    if (status.status === 'impaye' && (!extensionUntil || extensionUntil === "")) {
      segments.push({
        start: endDate,
        end: today,
        color: "bg-red-600 border-red-700 text-white",
        label: "Dépassement",
        type: 'overdue' as const
      });
    }
    
    return segments;
  } catch (error) {
    console.warn("Erreur lors de la génération des segments Gantt:", error);
    return [{
      start: new Date(),
      end: new Date(),
      color: "bg-gray-400 border-gray-500 text-white",
      label: "Erreur",
      type: 'error' as const
    }];
  }
}

/**
 * Options de filtres pour l'interface utilisateur
 */
export const FINANCIAL_STATUS_OPTIONS = [
  { label: "Tous", value: "all" as const },
  { label: "En attente", value: "en_attente" as const },
  { label: "Prolongé", value: "prolonger" as const },
  { label: "Impayé", value: "impaye" as const },
  { label: "En cours", value: "en_cours" as const },
  { label: "Payé", value: "paye" as const },
];

/**
 * Options de filtres pour les contrats avec distinction ouvert/fermé
 */
export const PAYMENT_STATUS_OPTIONS = [
  { label: "Tous", value: "all" as const },
  { label: "En cours", value: "en_cours" as const },
  { label: "Payé", value: "paye" as const },
];

/**
 * Calculate overdue days for a contract (day by day calculation)
 */
export const calculateOverdueDays = (contract: Contract): number => {
  if (!contract.end_date || contract.status === 'completed' || contract.status === 'cancelled' || contract.status === 'ferme') {
    return 0;
  }

  const today = new Date();
  
  try {
    // Determine the effective end date (original or extended)
    const originalEndDate = parseISO(contract.end_date);
    let effectiveEndDate = originalEndDate;
    
    const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
    if (extensionUntil && extensionUntil !== "") {
      effectiveEndDate = parseISO(extensionUntil);
    }

    // Calculate overdue days only if today is after the effective end date
    if (isAfter(today, effectiveEndDate)) {
      const overdueDays = Math.floor((today.getTime() - effectiveEndDate.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[calculateOverdueDays] Contract ${contract.id}: Today ${format(today, 'dd/MM/yyyy')}, End date ${format(effectiveEndDate, 'dd/MM/yyyy')}, Overdue days: ${overdueDays}`);
      return overdueDays;
    }
  } catch (error) {
    console.warn("Error calculating overdue days:", error);
  }

  return 0;
};

/**
 * Recalculate contract financials including extension and overdue charges
 */
export const recalculateContractFinancials = (contract: Contract): Contract => {
  const dailyRate = contract.daily_rate || 0;
  let extensionAmount = 0;
  let overdueAmount = 0;
  let extensionDays = 0;
  let overdueDays = 0;
  
  // Calculate original contract amount using Livraison method
  let originalDays = 0;
  let originalAmount = 0;
  
  if (contract.start_date && contract.end_date && dailyRate > 0) {
    try {
      // Use centralized daysBetween function for consistent calculations
      originalDays = daysBetween(contract.start_date, contract.end_date, { inclusive: false });
      
      originalAmount = originalDays * dailyRate;
      console.log(`[recalculateContractFinancials] Contract ${contract.id}: Livraison - Original days = ${originalDays}, Amount = ${originalAmount}`);
    } catch (error) {
      console.warn("Error calculating original amount:", error);
      originalAmount = contract.total_amount || 0;
    }
  } else {
    originalAmount = contract.total_amount || 0;
  }
  
  let totalAmount = originalAmount;
  
  // Calculate extension amount if contract has prolongation
  const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
  const extendedDaysField = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays;
  
  if ((extensionUntil && extensionUntil !== "") || (extendedDaysField && parseInt(extendedDaysField.toString()) > 0)) {
    if (extendedDaysField && parseInt(extendedDaysField.toString()) > 0) {
      extensionDays = parseInt(extendedDaysField.toString());
    } else if (extensionUntil && extensionUntil !== "" && contract.end_date) {
      try {
        const originalEndDate = parseISO(contract.end_date);
        const extensionEndDate = parseISO(extensionUntil);
        
        // Calculate extension days: do not add +1 because we're calculating additional days only
        const diffTime = extensionEndDate.getTime() - originalEndDate.getTime();
        extensionDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        console.log(`[recalculateContractFinancials] Contract ${contract.id}: Extension from ${format(originalEndDate, 'dd/MM/yyyy')} to ${format(extensionEndDate, 'dd/MM/yyyy')} = ${extensionDays} days`);
      } catch (error) {
        console.warn("Error calculating extension days:", error);
      }
    }
    
    if (extensionDays > 0 && dailyRate > 0) {
      extensionAmount = extensionDays * dailyRate;
      console.log(`[recalculateContractFinancials] Contract ${contract.id}: Reprise - Extension days = ${extensionDays}, Amount = ${extensionAmount}`);
    }
  }
  
  // Calculate overdue amount if contract is overdue (only for contracts without extension or after extension period)
  if (contract.status === 'ouvert') {
    try {
      const today = new Date();
      let effectiveEndDate: Date;
      
      // Determine the effective end date (original or extended)
      if (extensionUntil && extensionUntil !== "") {
        effectiveEndDate = parseISO(extensionUntil);
      } else {
        effectiveEndDate = parseISO(contract.end_date);
      }
      
      // Calculate overdue days only if today is after the effective end date
      if (isBefore(effectiveEndDate, today)) {
        overdueDays = Math.floor((today.getTime() - effectiveEndDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (overdueDays > 0 && dailyRate > 0) {
          overdueAmount = overdueDays * dailyRate;
          totalAmount += overdueAmount;
          console.log(`[recalculateContractFinancials] Contract ${contract.id}: Overdue amount = ${overdueDays} days × ${dailyRate} = ${overdueAmount}`);
        }
      }
    } catch (error) {
      console.warn("Error calculating overdue amount:", error);
    }
  }
  
  
  // Apply the new calculation method: Nombre de Jour + Nombre de Jour Prolongé = les jours
  const totalDays = originalDays + extensionDays + overdueDays;
  
  if (totalDays > 0 && dailyRate > 0) {
    totalAmount = totalDays * dailyRate;
    console.log(`[recalculateContractFinancials] Contract ${contract.id}: Final calculation - Original days: ${originalDays} + Extension days: ${extensionDays} + Overdue days: ${overdueDays} = ${totalDays} total days × ${dailyRate} = ${totalAmount}`);
  }
  
  // Only update if there are actual changes or if we need to set the original amount for the first time
  if (extensionAmount > 0 || overdueAmount > 0 || !contract.contract_data?.originalAmount) {
    const updatedContract = {
      ...contract,
      total_amount: totalAmount,
      contract_data: {
        ...contract.contract_data,
        originalAmount: originalAmount,
        originalDays: originalDays,
        extensionAmount: extensionAmount,
        extensionDays: extensionDays,
        overdueDays: overdueDays,
        overdueAmount: overdueAmount
      }
    };
    
    console.log(`[recalculateContractFinancials] Contract ${contract.id} updated:`, {
      originalAmount,
      originalDays,
      extensionAmount,
      overdueAmount,
      totalAmount,
      extensionDays,
      overdueDays
    });
    
    return updatedContract;
  }

  return contract;
};