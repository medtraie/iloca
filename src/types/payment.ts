export type CheckDepositStatus = 'encaissé' | 'non encaissé' | 'retourné' | 'partiellement encaissé';
export type CheckDirection = 'envoyé' | 'reçu';
export type RelanceLevel = 'aucune' | '1ère' | '2ème' | 'finale';

export interface RelanceEntry {
  id: string;
  level: RelanceLevel;
  sentAt: string;
  sentBy: string;
}

export interface PaymentAuditEntry {
  id: string;
  action: string;
  changedAt: string;
  changedBy: string;
  details?: string;
}

export interface Payment {
  id: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: 'Espèces' | 'Virement' | 'Chèque';
  paymentDate: string;
  createdAt: string;
  userId?: string;
  checkReference?: string;
  checkName?: string;
  checkDepositDate?: string;
  checkDirection?: CheckDirection;
  checkDepositStatus?: CheckDepositStatus;
  checkReturnReason?: string;
  checkReturnDate?: string;
  partiallyCollectedAmount?: number;
  relanceLevel?: RelanceLevel;
  relanceHistory?: RelanceEntry[];
  auditTrail?: PaymentAuditEntry[];
}

export interface PaymentSummary {
  totalPaid: number;
  remainingAmount: number;
  isFullyPaid: boolean;
  payments: Payment[];
}
