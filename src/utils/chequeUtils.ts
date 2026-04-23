import { differenceInDays, isToday } from "date-fns";
import { Payment, CheckDepositStatus } from "@/types/payment";

export type DelayBucket = "none" | "overdue" | "today" | "next3" | "next7" | "future";
export type PriorityLevel = "critical" | "high" | "medium" | "low" | "done";
export type SavedViewId =
  | "all"
  | "urgents"
  | "aTraiter"
  | "encaisses"
  | "reparations"
  | "retournes"
  | "partiels"
  | "managerRisque";

export interface SavedViewFilterPatch {
  statusFilter?: string;
  delayFilter?: string;
  sourceFilter?: string;
  sortPrimary?: string;
  sortSecondary?: string;
}

export interface CheckLike extends Payment {
  sourceType?: "contrat" | "reparation";
}

export interface CheckStats {
  totalAmount: number;
  pendingAmount: number;
  settledAmount: number;
  returnedAmount: number;
  partialAmount: number;
  overdueCount: number;
  dueTodayCount: number;
  next3Count: number;
  next7Count: number;
  recoveryRate: number;
}

const PENDING_STATUSES: CheckDepositStatus[] = ["non encaissé", "partiellement encaissé"];

export const isPendingStatus = (status: CheckDepositStatus | undefined) => {
  if (!status) return true;
  return PENDING_STATUSES.includes(status);
};

export const getDelayDays = (check: CheckLike) => {
  if (!check.checkDepositDate || !isPendingStatus(check.checkDepositStatus)) return 0;
  return differenceInDays(new Date(), new Date(check.checkDepositDate));
};

export const getDelayBucket = (check: CheckLike): DelayBucket => {
  if (!check.checkDepositDate || !isPendingStatus(check.checkDepositStatus)) return "none";
  const delay = getDelayDays(check);
  if (delay > 0) return "overdue";
  if (delay === 0 || isToday(new Date(check.checkDepositDate))) return "today";
  if (delay >= -3) return "next3";
  if (delay >= -7) return "next7";
  return "future";
};

export const getPriorityLevel = (check: CheckLike): PriorityLevel => {
  if (check.checkDepositStatus === "encaissé") return "done";
  if (check.checkDepositStatus === "retourné") return "critical";
  const bucket = getDelayBucket(check);
  if (bucket === "overdue") return "critical";
  if (bucket === "today") return "high";
  if (bucket === "next3") return "high";
  if (bucket === "next7") return "medium";
  return "low";
};

export const getRiskScore = (check: CheckLike, previousReturnedCount: number) => {
  let score = 0;
  if (check.amount >= 50000) score += 40;
  else if (check.amount >= 20000) score += 25;
  else if (check.amount >= 8000) score += 10;
  const delay = getDelayDays(check);
  if (delay > 15) score += 35;
  else if (delay > 7) score += 25;
  else if (delay > 0) score += 12;
  if ((check.checkDepositStatus || "non encaissé") === "retourné") score += 25;
  if (previousReturnedCount >= 3) score += 20;
  else if (previousReturnedCount > 0) score += 10;
  return Math.min(100, score);
};

export const applySavedViewPreset = (viewId: SavedViewId): SavedViewFilterPatch => {
  if (viewId === "urgents") {
    return { statusFilter: "pending", delayFilter: "overdue", sortPrimary: "priority", sortSecondary: "depositDate" };
  }
  if (viewId === "aTraiter") {
    return { statusFilter: "pending", sortPrimary: "risk", sortSecondary: "depositDate" };
  }
  if (viewId === "encaisses") {
    return { statusFilter: "encaissé", sortPrimary: "depositDate", sortSecondary: "amount" };
  }
  if (viewId === "reparations") {
    return { sourceFilter: "reparation", statusFilter: "pending", sortPrimary: "delay", sortSecondary: "amount" };
  }
  if (viewId === "retournes") {
    return { statusFilter: "retourné", sortPrimary: "risk", sortSecondary: "amount" };
  }
  if (viewId === "partiels") {
    return { statusFilter: "partiellement encaissé", sortPrimary: "depositDate", sortSecondary: "amount" };
  }
  if (viewId === "managerRisque") {
    return { statusFilter: "pending", sortPrimary: "risk", sortSecondary: "delay" };
  }
  return {};
};

export const computeChequeStats = (checks: CheckLike[]): CheckStats => {
  const totalAmount = checks.reduce((sum, check) => sum + check.amount, 0);
  const pendingAmount = checks
    .filter((check) => isPendingStatus(check.checkDepositStatus))
    .reduce((sum, check) => sum + (check.amount - (check.partiallyCollectedAmount || 0)), 0);
  const settledAmount = checks
    .filter((check) => check.checkDepositStatus === "encaissé")
    .reduce((sum, check) => sum + check.amount, 0);
  const returnedAmount = checks
    .filter((check) => check.checkDepositStatus === "retourné")
    .reduce((sum, check) => sum + check.amount, 0);
  const partialAmount = checks
    .filter((check) => check.checkDepositStatus === "partiellement encaissé")
    .reduce((sum, check) => sum + (check.partiallyCollectedAmount || 0), 0);
  const overdueCount = checks.filter((check) => getDelayBucket(check) === "overdue").length;
  const dueTodayCount = checks.filter((check) => getDelayBucket(check) === "today").length;
  const next3Count = checks.filter((check) => getDelayBucket(check) === "next3").length;
  const next7Count = checks.filter((check) => getDelayBucket(check) === "next7").length;
  const recoveryRate = totalAmount > 0 ? ((settledAmount + partialAmount) / totalAmount) * 100 : 0;
  return {
    totalAmount,
    pendingAmount,
    settledAmount,
    returnedAmount,
    partialAmount,
    overdueCount,
    dueTodayCount,
    next3Count,
    next7Count,
    recoveryRate
  };
};

