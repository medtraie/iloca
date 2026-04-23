import { describe, expect, it } from "vitest";
import { applySavedViewPreset, computeChequeStats, getDelayBucket, getPriorityLevel } from "@/utils/chequeUtils";
import type { Payment } from "@/types/payment";

const createCheck = (overrides: Partial<Payment> = {}): Payment => ({
  id: overrides.id || crypto.randomUUID(),
  contractId: "c-1",
  contractNumber: "CTR-001",
  customerName: "Client Test",
  amount: 10000,
  paymentMethod: "Chèque",
  paymentDate: "2026-03-10",
  createdAt: "2026-03-10T09:00:00.000Z",
  checkReference: "CHQ-001",
  checkName: "Client Test",
  checkDepositDate: "2026-03-20",
  checkDirection: "reçu",
  checkDepositStatus: "non encaissé",
  ...overrides
});

describe("chequeUtils", () => {
  it("returns overdue bucket for expired pending cheque", () => {
    const overdueCheck = createCheck({ checkDepositDate: "2020-01-01" });
    expect(getDelayBucket(overdueCheck)).toBe("overdue");
  });

  it("returns critical priority for returned cheque", () => {
    const returnedCheck = createCheck({ checkDepositStatus: "retourné" });
    expect(getPriorityLevel(returnedCheck)).toBe("critical");
  });

  it("applies manager risk saved view preset", () => {
    const preset = applySavedViewPreset("managerRisque");
    expect(preset.statusFilter).toBe("pending");
    expect(preset.sortPrimary).toBe("risk");
    expect(preset.sortSecondary).toBe("delay");
  });

  it("recomputes stats after check edit flow", () => {
    const firstVersion = createCheck({ id: "flow-1", amount: 12000, checkDepositStatus: "non encaissé" });
    const secondCheck = createCheck({ id: "flow-2", amount: 8000, checkDepositStatus: "encaissé" });
    const beforeStats = computeChequeStats([firstVersion, secondCheck]);
    const editedVersion = {
      ...firstVersion,
      checkDepositStatus: "partiellement encaissé" as const,
      partiallyCollectedAmount: 5000
    };
    const afterStats = computeChequeStats([editedVersion, secondCheck]);
    expect(beforeStats.recoveryRate).toBeLessThan(afterStats.recoveryRate);
    expect(afterStats.partialAmount).toBe(5000);
    expect(afterStats.pendingAmount).toBe(7000);
  });
});

