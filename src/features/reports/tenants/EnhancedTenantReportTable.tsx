import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
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

type SortKey = 'name' | 'totalContracts' | 'totalDays' | 'totalAmount' | 'averageDaily';
type SortOrder = 'asc' | 'desc';

interface EnhancedTenantReportTableProps {
  tenantData: TenantData[];
}

const EnhancedTenantReportTable = ({ tenantData }: EnhancedTenantReportTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>('totalAmount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = tenantData.filter((tenant) => {
      const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAmount = minAmount ? tenant.totalAmount >= Number(minAmount) : true;
      
      let matchesStatus = true;
      if (statusFilter !== "all") {
        const lastContract = tenant.contracts.sort((a, b) => 
          new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()
        )[0];
        matchesStatus = lastContract?.status === statusFilter;
      }

      return matchesSearch && matchesAmount && matchesStatus;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];

      if (sortKey === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tenantData, searchTerm, sortKey, sortOrder, statusFilter, minAmount]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const SortButton = ({ sortKey: key, children }: { sortKey: SortKey; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(key)}
      className="flex items-center gap-1 hover:bg-gray-100 px-2 py-1 rounded text-left w-full"
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher un locataire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Statut du contrat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="signed">Actif</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Montant minimum (DH)"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />

          <div className="text-sm text-gray-600 flex items-center">
            {filteredAndSortedData.length} locataire(s) trouvé(s)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold">
                <SortButton sortKey="name">Locataire</SortButton>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <SortButton sortKey="totalContracts">Contrats</SortButton>
              </TableHead>
              <TableHead className="text-center font-semibold">
                <SortButton sortKey="totalDays">Jours loués</SortButton>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortButton sortKey="totalAmount">Total payé</SortButton>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <SortButton sortKey="averageDaily">Moyenne/jour</SortButton>
              </TableHead>
              <TableHead className="font-semibold">Dernière location</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((tenant, index) => {
              const lastContract = tenant.contracts.sort((a, b) => 
                new Date(b.end_date || 0).getTime() - new Date(a.end_date || 0).getTime()
              )[0];

              return (
                <TableRow key={tenant.name} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{tenant.totalContracts}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{tenant.totalDays}</span> jours
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-green-600">
                      {tenant.totalAmount.toLocaleString()} DH
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">
                      {Math.round(tenant.averageDaily)} DH
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{lastContract?.vehicle}</div>
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Affichage de {startIndex + 1} à {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} sur {filteredAndSortedData.length} locataires
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>
            
            <span className="text-sm px-3 py-1 bg-gray-100 rounded">
              Page {currentPage} sur {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun locataire trouvé pour les critères sélectionnés
        </div>
      )}
    </div>
  );
};

export default EnhancedTenantReportTable;