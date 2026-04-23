
interface TenantReportSummaryProps {
  tenantCount: number;
  totalRevenue: number;
  totalDays: number;
}

const TenantReportSummary = ({ tenantCount, totalRevenue, totalDays }: TenantReportSummaryProps) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-600">Nombre de locataires</p>
          <p className="text-2xl font-bold">{tenantCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Revenus totaux</p>
          <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()} DH</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Jours loués totaux</p>
          <p className="text-2xl font-bold">{totalDays}</p>
        </div>
      </div>
    </div>
  );
};

export default TenantReportSummary;
