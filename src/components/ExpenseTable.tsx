
import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  vehicleId: string;
  type: 'vignette' | 'maintenance' | 'visite_technique';
  amount: number;
  date: string;
  description: string;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}

interface ExpenseTableProps {
  expenses: Expense[];
  vehicles: Vehicle[];
  filters: FilterState;
}

const ExpenseTable = ({ expenses, vehicles, filters }: ExpenseTableProps) => {
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Vehicle filter
      if (filters.vehicleId && expense.vehicleId !== filters.vehicleId) return false;
      
      // Expense type filter
      if (filters.expenseType && expense.type !== filters.expenseType) return false;
      
      // Date filter
      if (filters.periode.start) {
        const expenseDate = new Date(expense.date);
        const startDate = new Date(filters.periode.start);
        if (expenseDate < startDate) return false;
      }
      
      if (filters.periode.end) {
        const expenseDate = new Date(expense.date);
        const endDate = new Date(filters.periode.end);
        if (expenseDate > endDate) return false;
      }
      
      return true;
    });
  }, [expenses, filters]);

  const getVehicleInfo = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation})` : 'Véhicule inconnu';
  };

  const getExpenseTypeBadge = (type: string) => {
    switch (type) {
      case 'vignette':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Vignette</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Maintenance</Badge>;
      case 'visite_technique':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Visite technique</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getMonthlyExpenses = () => {
    // Group expenses by month and vehicle
    const monthlyData: Record<string, Record<string, number>> = {};
    
    filteredExpenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const vehicleKey = getVehicleInfo(expense.vehicleId);
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      
      if (!monthlyData[monthKey][vehicleKey]) {
        monthlyData[monthKey][vehicleKey] = 0;
      }
      
      monthlyData[monthKey][vehicleKey] += expense.amount;
    });
    
    return monthlyData;
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total des charges</p>
            <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} DH</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Nombre de charges</p>
            <p className="text-2xl font-bold">{filteredExpenses.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Moyenne par charge</p>
            <p className="text-2xl font-bold">
              {filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length) : 0} DH
            </p>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Véhicule</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Montant</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExpenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell>
                {new Date(expense.date).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="font-medium">
                {getVehicleInfo(expense.vehicleId)}
              </TableCell>
              <TableCell>
                {getExpenseTypeBadge(expense.type)}
              </TableCell>
              <TableCell>{expense.description}</TableCell>
              <TableCell className="text-right font-semibold text-red-600">
                {expense.amount.toLocaleString()} DH
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune charge trouvée pour les filtres sélectionnés
        </div>
      )}

      {/* Monthly Summary */}
      {filteredExpenses.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Répartition mensuelle des charges</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getMonthlyExpenses()).map(([month, vehicleExpenses]) => (
              <div key={month} className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">{month}</h4>
                <div className="space-y-1">
                  {Object.entries(vehicleExpenses).map(([vehicle, amount]) => (
                    <div key={vehicle} className="flex justify-between text-sm">
                      <span className="truncate">{vehicle}</span>
                      <span className="font-medium">{amount.toLocaleString()} DH</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{Object.values(vehicleExpenses).reduce((a, b) => a + b, 0).toLocaleString()} DH</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
