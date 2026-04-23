
import { useMemo } from "react";
import { Repair } from "@/types/repair";

export const useRepairFilters = (
  repairs: Repair[],
  searchTerm: string,
  filterType: string,
  filterDateRange: string,
  filterFinancialStatus: string,
  filterOperationalStatus: string,
  filterDelayBucket: string
) => {
  const filteredRepairs = useMemo(() => {
    const filtered = repairs.filter(repair => {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        repair.vehicleInfo.marque.toLowerCase().includes(normalizedSearch) ||
        repair.vehicleInfo.modele.toLowerCase().includes(normalizedSearch) ||
        repair.vehicleInfo.immatriculation.toLowerCase().includes(normalizedSearch) ||
        (repair.note || "").toLowerCase().includes(normalizedSearch);
      
      const matchesType = filterType === "all" || repair.typeReparation === filterType;
      const debt = repair.dette || 0;
      const total = repair.cout || 0;
      const paid = repair.paye || 0;
      const matchesFinancialStatus = filterFinancialStatus === "all" || (() => {
        if (filterFinancialStatus === "settled") return debt <= 0;
        if (filterFinancialStatus === "partial") return debt > 0 && paid > 0 && paid < total;
        if (filterFinancialStatus === "unpaid") return debt > 0 && paid <= 0;
        return true;
      })();

      const operationalStatus = repair.operationalStatus || "en_maintenance";
      const matchesOperationalStatus = filterOperationalStatus === "all" || operationalStatus === filterOperationalStatus;
      
      const matchesDate = filterDateRange === "all" || (() => {
        const repairDate = new Date(repair.dateReparation);
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = (startOfWeek.getDay() + 6) % 7;
        startOfWeek.setDate(startOfWeek.getDate() - day);
        startOfWeek.setHours(0, 0, 0, 0);
        const last90Days = new Date(now);
        last90Days.setDate(last90Days.getDate() - 90);
        last90Days.setHours(0, 0, 0, 0);
        switch (filterDateRange) {
          case "thisWeek":
            return repairDate >= startOfWeek && repairDate <= now;
          case "thisMonth":
            return repairDate.getMonth() === now.getMonth() && repairDate.getFullYear() === now.getFullYear();
          case "lastMonth":
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return repairDate.getMonth() === lastMonth.getMonth() && repairDate.getFullYear() === lastMonth.getFullYear();
          case "last90Days":
            return repairDate >= last90Days && repairDate <= now;
          case "thisYear":
            return repairDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      })();

      const delayDays = debt <= 0
        ? 0
        : Math.max(0, Math.floor((Date.now() - new Date(repair.dueDate || repair.dateReparation).getTime()) / (1000 * 60 * 60 * 24)));
      const matchesDelayBucket = filterDelayBucket === "all" || (() => {
        if (filterDelayBucket === "onTime") return delayDays === 0;
        if (filterDelayBucket === "lt15") return delayDays > 0 && delayDays <= 15;
        if (filterDelayBucket === "btw16_30") return delayDays > 15 && delayDays <= 30;
        if (filterDelayBucket === "gt30") return delayDays > 30;
        return true;
      })();

      return matchesSearch && matchesType && matchesDate && matchesFinancialStatus && matchesOperationalStatus && matchesDelayBucket;
    });
    return filtered.sort((a, b) => {
      const dateDiff = new Date(b.dateReparation).getTime() - new Date(a.dateReparation).getTime();
      if (dateDiff !== 0) return dateDiff;
      return (b.dette || 0) - (a.dette || 0);
    });
  }, [repairs, searchTerm, filterType, filterDateRange, filterFinancialStatus, filterOperationalStatus, filterDelayBucket]);

  return filteredRepairs;
};
