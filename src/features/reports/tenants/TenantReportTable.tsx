
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TenantData } from "./types";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "signed":
      return <Badge className="bg-green-100 text-green-800">Actif</Badge>;
    case "completed":
      return <Badge className="bg-blue-100 text-blue-800">Terminé</Badge>;
    case "sent":
    case "draft":
      return <Badge className="bg-orange-100 text-orange-800">À venir</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

interface TenantReportTableProps {
  tenantData: TenantData[];
}

const TenantReportTable = ({ tenantData }: TenantReportTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Locataire</TableHead>
          <TableHead className="text-center">Contrats</TableHead>
          <TableHead className="text-center">Jours loués</TableHead>
          <TableHead className="text-right">Total payé</TableHead>
          <TableHead className="text-right">Moyenne/jour</TableHead>
          <TableHead>Dernière location</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenantData.map((tenant) => {
          const lastContract = tenant.contracts.sort((a, b) => 
            new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()
          )[0];

          return (
            <TableRow key={tenant.name}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="text-center">{tenant.totalContracts}</TableCell>
              <TableCell className="text-center">{tenant.totalDays} jours</TableCell>
              <TableCell className="text-right font-semibold text-green-600">
                {tenant.totalAmount.toLocaleString()} DH
              </TableCell>
              <TableCell className="text-right">
                {Math.round(tenant.averageDaily)} DH
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{lastContract?.vehicle}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {lastContract?.end_date && new Date(lastContract.end_date).toLocaleDateString('fr-FR')}
                    </span>
                    {lastContract?.status && getStatusBadge(lastContract.status)}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default TenantReportTable;
