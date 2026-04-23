
import { Vehicle, Contract } from "./VehicleGanttChart.types";
import { getContractFinancialStatus } from "@/utils/contractFinancialStatus";

/**
 * Tries to match a contract object to a vehicle ID.
 * Priority:
 *   1. contract.vehicleId field (strict)
 *   2. Exact immatriculation match
 *   3. Partial match on marque, modele, or substring of vehicle field
 *   4. Fallback: log failure
 */
export function matchContractToVehicleId(contract: Contract, vehicleList: Vehicle[]): string | undefined {
  if (contract.vehicleId) {
    // Prefer direct link if present
    return contract.vehicleId;
  }

  // Main text fields
  const contractVehicleRaw = contract.vehicle?.toLowerCase().replace(/\s+/g, " ").trim();
  if (!contractVehicleRaw) return undefined;

  // Try to match immatriculation (registration)
  for (const v of vehicleList) {
    if (v.immatriculation && contractVehicleRaw.includes(v.immatriculation.toLowerCase())) {
      return v.id;
    }
  }

  // Try to match on marque/modele together
  for (const v of vehicleList) {
    const base = `${v.marque?.toLowerCase() || ""} ${v.modele?.toLowerCase() || ""}`.replace(/\s+/g, " ").trim();
    if (base && contractVehicleRaw.includes(base)) {
      return v.id;
    }
  }

  // Try substring match anywhere
  for (const v of vehicleList) {
    const longLabel =
      `${v.marque || ""} ${v.modele || ""} ${v.immatriculation || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (contractVehicleRaw.includes(longLabel)) {
      return v.id;
    }
  }

  // Still not found
  console.warn(
    "[matchContractToVehicleId] No match for contract.vehicle =",
    contract.vehicle,
    "against vehicles:",
    vehicleList.map(v => `${v.id} [${v.marque} ${v.modele} ${v.immatriculation}]`)
  );
  return undefined;
}

export function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getContractColor(contractId: string, contract?: any): string {
  // Couleurs de base uniques pour chaque contrat
  const baseColors = [
    '#3b82f6', // Bleu
    '#10b981', // Vert émeraude
    '#f59e0b', // Orange/Amber
    '#8b5cf6', // Violet
    '#ef4444', // Rouge
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#eab308', // Jaune
  ];
  
  // Retourner la couleur hex directement pour les segments
  return baseColors[hashString(contractId) % baseColors.length];
}

/**
 * Génère le tooltip détaillé pour un contrat dans le Gantt
 */
export function generateContractTooltip(contract: any): string {
  const contractSerie = contract.contract_number || contract.id || 'N/A';
  const customerName = contract.customer_name || contract.customerName || 'N/A';
  const startDate = contract.start_date ? new Date(contract.start_date).toLocaleDateString('fr-FR') : 'N/A';
  const endDate = contract.end_date ? new Date(contract.end_date).toLocaleDateString('fr-FR') : 'N/A';
  
  let tooltip = `Série: ${contractSerie}\nClient: ${customerName}\nDébut: ${startDate}\nFin: ${endDate}`;
  
  // Ajouter info prolongation si applicable - support both old and new field names
  const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
  const extendedDays = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays;
  
  if ((extensionUntil && extensionUntil !== "") || (extendedDays && parseInt(extendedDays.toString()) > 0)) {
    if (extensionUntil && extensionUntil !== "") {
      const prolongDate = new Date(extensionUntil).toLocaleDateString('fr-FR');
      tooltip += `\nProlongation jusqu'au: ${prolongDate}`;
    }
    if (extendedDays && parseInt(extendedDays.toString()) > 0) {
      tooltip += `\nJours prolongés: ${extendedDays}`;
    }
  }
  
  // Ajouter état financier
  try {
    const status = getContractFinancialStatus(contract);
    tooltip += `\nÉtat: ${status.label} - ${status.description}`;
  } catch (error) {
    // Ignore si pas d'accès au module
  }
  
  return tooltip;
}

/**
 * Génère un style dégradé pour les contrats prolongés ou impayés
 */
export function getContractGradientStyle(contract: any, segmentType?: 'main' | 'extension' | 'overdue'): string {
  // Obtenir la couleur unique du contrat
  const baseColor = getContractColor(contract.id || contract.contract_number, contract);
  
  // Convertir hex vers RGB pour les dégradés
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);  
  const b = parseInt(hex.substr(4, 2), 16);
  
  if (segmentType === 'extension') {
    // Prolongations : dégradé de la couleur du contrat vers une version plus transparente
    return `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 30%, rgba(${r}, ${g}, ${b}, 0.7) 70%, rgba(${r}, ${g}, ${b}, 0.5) 100%)`;
  } else if (segmentType === 'overdue') {
    // Jours impayés : dégradé de la couleur du contrat vers rouge
    return `linear-gradient(90deg, ${baseColor} 0%, ${baseColor} 40%, #ef4444 70%, #dc2626 100%)`;
  } else {
    // Segment principal : couleur solide du contrat
    return baseColor;
  }
}
