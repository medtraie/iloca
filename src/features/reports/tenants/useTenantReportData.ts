import { useMemo } from "react";
import { FilterState, TenantData } from "./types";
import { recalculateContractFinancials } from "@/utils/contractFinancialStatus";
import { Contract } from "@/services/localStorageService";

export const useTenantReportData = (contracts: Contract[], filters: FilterState) => {
  // Process contracts and recalculate financial data
  const processedContracts = useMemo(() => {
    console.log("[TenantReport] Processing contracts for tenant data...");
    return contracts.map(contract => {
      const recalculatedContract = recalculateContractFinancials(contract);
      console.log(`[TenantReport] Contract ${contract.contract_number}: original amount ${contract.total_amount} -> recalculated ${recalculatedContract.total_amount}`);
      return recalculatedContract;
    });
  }, [contracts]);

  const tenantData = useMemo(() => {
    console.log("[useTenantReportData] Processing tenant data with contracts:", processedContracts.length);
    
    const tenantMap: Record<string, TenantData> = {};

    processedContracts.forEach(contract => {
      if (filters.tenantName && !contract.customer_name?.toLowerCase().includes(filters.tenantName.toLowerCase())) return;
      if (filters.contractStatus && contract.status !== filters.contractStatus) return;
      
      if (filters.periode.start && contract.start_date) {
        const contractStart = new Date(contract.start_date);
        const filterStart = new Date(filters.periode.start);
        if (contractStart < filterStart) return;
      }
      
      if (filters.periode.end && contract.end_date) {
        const contractEnd = new Date(contract.end_date);
        const filterEnd = new Date(filters.periode.end);
        if (contractEnd > filterEnd) return;
      }

      const tenantName = contract.customer_name || 'N/A';
      
      if (!tenantMap[tenantName]) {
        tenantMap[tenantName] = {
          name: tenantName,
          contracts: [],
          totalContracts: 0,
          totalDays: 0,
          totalAmount: 0,
          averageDaily: 0
        };
      }

      // Use the recalculated total days (includes original + extension + overdue days)
      let days = 0;
      if (contract.contract_data?.originalDays !== undefined && 
          contract.contract_data?.extensionDays !== undefined && 
          contract.contract_data?.overdueDays !== undefined) {
        days = contract.contract_data.originalDays + 
               contract.contract_data.extensionDays + 
               contract.contract_data.overdueDays;
        console.log(`[useTenantReportData] Contract ${contract.contract_number}: Using recalculated days = ${days} (original: ${contract.contract_data.originalDays}, extension: ${contract.contract_data.extensionDays}, overdue: ${contract.contract_data.overdueDays})`);
      } else {
        // Fallback to old calculation if recalculated data is not available
        if (contract.start_date && contract.end_date) {
          const start = new Date(contract.start_date);
          const end = new Date(contract.end_date);
          const timeDiff = end.getTime() - start.getTime();
          if(timeDiff >= 0) {
            days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
          }
        }
        console.log(`[useTenantReportData] Contract ${contract.contract_number}: Using fallback days calculation = ${days}`);
      }
      
       // Use the recalculated total amount (includes overdue charges)
       const amount = contract.total_amount || 0;

      tenantMap[tenantName].contracts.push(contract);
      tenantMap[tenantName].totalContracts++;
      tenantMap[tenantName].totalDays += days;
      tenantMap[tenantName].totalAmount += amount;
      if (tenantMap[tenantName].totalDays > 0) {
        tenantMap[tenantName].averageDaily = tenantMap[tenantName].totalAmount / tenantMap[tenantName].totalDays;
      }
    });

    return Object.values(tenantMap).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [processedContracts, filters]);

  const totalRevenue = tenantData.reduce((sum, tenant) => sum + tenant.totalAmount, 0);
  const totalDays = tenantData.reduce((sum, tenant) => sum + tenant.totalDays, 0);

  return { tenantData, totalRevenue, totalDays };
};