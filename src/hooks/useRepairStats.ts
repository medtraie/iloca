
import { useMemo } from "react";
import { Repair } from "@/types/repair";

export const useRepairStats = (repairs: Repair[]) => {
  const stats = useMemo(() => {
    const totalRepairs = repairs.length;
    const mechanicalRepairs = repairs.filter(r => r.typeReparation === "Mécanique").length;
    const electricalRepairs = repairs.filter(r => r.typeReparation === "Électrique").length;
    const garageRepairs = repairs.filter(r => r.typeReparation === "Garage").length;
    const totalCost = repairs.reduce((sum, repair) => sum + repair.cout, 0);
    const totalPaid = repairs.reduce((sum, repair) => sum + (repair.paye || 0), 0);
    const totalDebt = repairs.reduce((sum, repair) => sum + (repair.dette || 0), 0);
    const unpaidRepairs = repairs.filter((repair) => (repair.dette || 0) > 0).length;
    const averageCost = totalRepairs > 0 ? totalCost / totalRepairs : 0;
    const paymentCoverage = totalCost > 0 ? (totalPaid / totalCost) * 100 : 0;

    return {
      totalRepairs,
      mechanicalRepairs,
      electricalRepairs,
      garageRepairs,
      totalCost,
      totalPaid,
      totalDebt,
      unpaidRepairs,
      averageCost,
      paymentCoverage
    };
  }, [repairs]);

  return stats;
};
