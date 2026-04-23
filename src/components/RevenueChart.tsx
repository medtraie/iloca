
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";

export interface Vehicle {
  id: string;
  marque: string;
  modele: string;
}

export interface Contract {
  id: string;
  customerName: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalAmount: string;
  vehicleId?: string;
  status?: 'ouvert' | 'ferme' | 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
  contract_data?: {
    originalDays?: number;
    extensionDays?: number;
    overdueDays?: number;
    originalAmount?: number;
    extensionAmount?: number;
    overdueAmount?: number;
  };
}

interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}

interface RevenueChartProps {
  vehicles: Vehicle[];
  contracts: Contract[];
  filters: FilterState;
}

const RevenueChart = ({ vehicles, contracts, filters }: RevenueChartProps) => {
  console.log("RevenueChart - vehicles:", vehicles);
  console.log("RevenueChart - contracts:", contracts);
  console.log("RevenueChart - filters:", filters);

  // Generate unique colors for each vehicle
  const vehicleColors = useMemo(() => {
    const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"];
    return vehicles.reduce((acc, vehicle, index) => {
      acc[vehicle.id] = colors[index % colors.length];
      return acc;
    }, {} as Record<string, string>);
  }, [vehicles]);

  const chartData = useMemo(() => {
    // If no vehicles or contracts, return empty array
    if (!vehicles.length || !contracts.length) {
      console.log("No vehicles or contracts available");
      return [];
    }

    return vehicles.map((vehicle, index) => {
      console.log(`Processing vehicle: ${vehicle.marque} ${vehicle.modele}`);
      
      // Find contracts for this vehicle with improved matching logic
      const vehicleContracts = contracts.filter(contract => {
        // First, try exact vehicleId match
        if (contract.vehicleId && contract.vehicleId === vehicle.id) {
          console.log(`Contract ${contract.id}: exact vehicleId match with ${vehicle.id}`);
          return true;
        }
        
        // Then try matching by vehicle string containing marque and modele
        const vehicleString = contract.vehicle?.toLowerCase() || '';
        const marque = vehicle.marque?.toLowerCase() || '';
        const modele = vehicle.modele?.toLowerCase() || '';
        
        // Enhanced matching to handle Arabic text and variations
        const containsMarque = vehicleString.includes(marque);
        const containsModele = vehicleString.includes(modele);
        const matchByName = containsMarque && containsModele;
        
        console.log(`Contract ${contract.id}: vehicle="${contract.vehicle}", vehicleId="${contract.vehicleId}", marque match: ${containsMarque}, modele match: ${containsModele}, final match: ${matchByName}`);
        
        return matchByName;
      });

      // Apply filters
      const filteredContracts = vehicleContracts.filter(contract => {
        if (filters.vehicleId && filters.vehicleId !== "all" && vehicle.id !== filters.vehicleId) {
          return false;
        }
        if (filters.tenantName && !contract.customerName.toLowerCase().includes(filters.tenantName.toLowerCase())) {
          return false;
        }
        return true;
      });

      console.log(`Vehicle ${vehicle.marque} ${vehicle.modele} has ${filteredContracts.length} matching contracts`);

      // Calculate stats
      const numberOfRentals = filteredContracts.length;
      const totalRevenue = filteredContracts.reduce((sum, contract) => {
        // Handle both string and number formats for totalAmount
        let amount = 0;
        if (typeof contract.totalAmount === 'string') {
          // Remove any non-digit characters except decimal point
          const cleanAmount = contract.totalAmount.replace(/[^\d.]/g, '');
          amount = parseFloat(cleanAmount) || 0;
        } else {
          amount = Number(contract.totalAmount) || 0;
        }
        console.log(`Contract ${contract.id} amount: ${contract.totalAmount} -> ${amount}`);
        return sum + amount;
      }, 0);

      const totalDays = filteredContracts.reduce((sum, contract) => {
        // Use the recalculated total days (includes original + extension + overdue days)
        if (contract.contract_data?.originalDays !== undefined && 
            contract.contract_data?.extensionDays !== undefined && 
            contract.contract_data?.overdueDays !== undefined) {
          const totalContractDays = contract.contract_data.originalDays + 
                                   contract.contract_data.extensionDays + 
                                   contract.contract_data.overdueDays;
          console.log(`[RevenueChart] Contract ${contract.id}: Using recalculated days = ${totalContractDays} (original: ${contract.contract_data.originalDays}, extension: ${contract.contract_data.extensionDays}, overdue: ${contract.contract_data.overdueDays})`);
          return sum + totalContractDays;
        } else {
          // Fallback to old calculation if recalculated data is not available
          if (!contract.startDate || !contract.endDate) return sum;
          try {
            const start = new Date(contract.startDate);
            const end = new Date(contract.endDate);
            const diffTime = end.getTime() - start.getTime();
            const days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            console.log(`[RevenueChart] Contract ${contract.id}: Using fallback days calculation = ${days}`);
            return sum + days;
          } catch (error) {
            console.error('Error calculating days for contract:', contract.id, error);
            return sum;
          }
        }
      }, 0);

      const result = {
        name: `${vehicle.marque} ${vehicle.modele}`,
        shortName: vehicle.marque,
        locations: numberOfRentals,
        revenu: totalRevenue,
        jours: totalDays,
        color: vehicleColors[vehicle.id],
        vehicleId: vehicle.id
      };

      console.log(`Vehicle result:`, result);
      return result;
    }).filter(item => {
      // Show all vehicles, even those with 0 rentals, for better visibility
      console.log(`Keeping vehicle ${item.name} with ${item.locations} rentals`);
      return true;
    });
  }, [vehicles, contracts, filters]);

  console.log("Final chartData:", chartData);

  return (
    <div className="space-y-6">
      {/* Debug info */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        Debug: {vehicles.length} véhicules, {contracts.length} contrats, {chartData.length} éléments dans le graphique
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="shortName" 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "#6b7280" }}
              tickFormatter={(value) => `${value} DH`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={(value, name) => [
                name === 'revenu' ? `${Number(value).toLocaleString()} DH` : value,
                name === 'revenu' ? 'Revenu Total' : name
              ]}
              labelFormatter={(label) => `${chartData.find(item => item.shortName === label)?.name || label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar 
              dataKey="revenu" 
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Vehicle Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {chartData.map((vehicle) => (
          <div key={vehicle.vehicleId} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: vehicle.color }}
            />
            <span className="text-sm font-medium text-gray-700">{vehicle.name}</span>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left pb-2">Véhicule</th>
              <th className="text-right pb-2">Locations</th>
              <th className="text-right pb-2">Revenu total</th>
              <th className="text-right pb-2">Jours loués</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="py-2 font-medium">{item.name}</td>
                <td className="py-2 text-right">{item.locations}</td>
                <td className="py-2 text-right font-semibold text-green-600">
                  {item.revenu.toLocaleString()} DH
                </td>
                <td className="py-2 text-right">{item.jours} jours</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {chartData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Données de revenus insuffisantes pour les véhicules sélectionnés
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
