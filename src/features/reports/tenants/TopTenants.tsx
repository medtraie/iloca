
import { Badge } from "@/components/ui/badge";
import { TenantData } from "./types";

interface TopTenantsProps {
  tenantData: TenantData[];
}

const TopTenants = ({ tenantData }: TopTenantsProps) => {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">Top 5 des meilleurs clients</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenantData.slice(0, 5).map((tenant, index) => (
          <div key={tenant.name} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium">{tenant.name}</h4>
              <Badge variant="outline">#{index + 1}</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Contrats:</span>
                <span className="font-medium">{tenant.totalContracts}</span>
              </div>
              <div className="flex justify-between">
                <span>Jours:</span>
                <span className="font-medium">{tenant.totalDays}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-medium text-green-600">
                  {tenant.totalAmount.toLocaleString()} DH
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopTenants;
