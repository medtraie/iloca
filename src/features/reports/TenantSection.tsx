
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import TenantReport from "@/components/TenantReport";
import type { FilterState } from "@/pages/Reports";
import { Contract } from "@/services/localStorageService";

interface TenantSectionProps {
  contracts: Contract[];
  filters: FilterState;
}

const TenantSection = ({ contracts, filters }: TenantSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Rapport des Locataires</CardTitle>
    </CardHeader>
    <CardContent>
      <TenantReport 
        contracts={contracts}
        filters={filters}
      />
    </CardContent>
  </Card>
);

export default TenantSection;
