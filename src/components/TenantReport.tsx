
import { useTenantReportData } from "@/features/reports/tenants/useTenantReportData";
import TenantReportSummary from "@/features/reports/tenants/TenantReportSummary";
import EnhancedTenantReportTable from "@/features/reports/tenants/EnhancedTenantReportTable";
import EnhancedTopTenants from "@/features/reports/tenants/EnhancedTopTenants";
import { FilterState } from "@/features/reports/tenants/types";
import { Contract } from "@/services/localStorageService";

interface TenantReportProps {
  contracts: Contract[];
  filters: FilterState;
}

const TenantReport = ({ contracts, filters }: TenantReportProps) => {
  const { tenantData, totalRevenue, totalDays } = useTenantReportData(contracts, filters);

  return (
    <div className="space-y-6">
      <TenantReportSummary
        tenantCount={tenantData.length}
        totalRevenue={totalRevenue}
        totalDays={totalDays}
      />

      <EnhancedTenantReportTable tenantData={tenantData} />

      {tenantData.length > 0 && <EnhancedTopTenants tenantData={tenantData} />}
    </div>
  );
};

export default TenantReport;
