import { useState, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import ReportCard from "./ReportCard";
import ReportCardTitle from "./ReportCardTitle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp } from "lucide-react";
import type { Vehicle, Contract } from "@/pages/Reports";
import type { Expense } from "@/types/expense";

interface VehicleComparisonSectionProps {
  vehicles: Vehicle[];
  contracts: Contract[];
  expenses: Expense[];
}

const VehicleComparisonSection = ({ vehicles, contracts, expenses }: VehicleComparisonSectionProps) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [timeFrame, setTimeFrame] = useState<"month" | "year">("month");

  const chartData = useMemo(() => {
    if (!selectedVehicleId) return [];

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle) return [];

    // Filter contracts for selected vehicle
    const vehicleContracts = contracts.filter(contract => {
      if (contract.vehicleId === selectedVehicleId) return true;
      
      const vehicleString = contract.vehicle?.toLowerCase() || '';
      const marque = selectedVehicle.marque?.toLowerCase() || '';
      const modele = selectedVehicle.modele?.toLowerCase() || '';
      
      return vehicleString.includes(marque) && vehicleString.includes(modele);
    });

    // Filter expenses for selected vehicle
    const vehicleExpenses = expenses.filter(expense => expense.vehicle_id === selectedVehicleId);

    // Group data by time frame
    const dataMap = new Map<string, { period: string, revenus: number, depenses: number }>();

    // Process contracts for revenue
    vehicleContracts.forEach(contract => {
      if (!contract.start_date) return;
      
      const date = new Date(contract.start_date);
      const period = timeFrame === "month" 
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : String(date.getFullYear());
      
      const existing = dataMap.get(period) || { period, revenus: 0, depenses: 0 };
      existing.revenus += Number(contract.total_amount) || 0;
      dataMap.set(period, existing);
    });

    // Process expenses
    vehicleExpenses.forEach(expense => {
      const date = new Date(expense.start_date);
      const period = timeFrame === "month"
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : String(date.getFullYear());
      
      const existing = dataMap.get(period) || { period, revenus: 0, depenses: 0 };
      existing.depenses += expense.total_cost;
      dataMap.set(period, existing);
    });

    // Convert to array and sort
    return Array.from(dataMap.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map(item => ({
        ...item,
        periode: timeFrame === "month" ? 
          new Date(item.period + "-01").toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) :
          item.period
      }));
  }, [selectedVehicleId, vehicles, contracts, expenses, timeFrame]);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  return (
    <ReportCard
      header={
        <div className="p-6 pb-0">
          <ReportCardTitle icon={<TrendingUp className="h-5 w-5" />}>
            Comparaison Dépenses vs Revenus par Véhicule
          </ReportCardTitle>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vehicle Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Véhicule:</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une voiture" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.marque} {vehicle.modele} ({vehicle.immatriculation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Frame Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Période:</Label>
              <Select value={timeFrame} onValueChange={(value: "month" | "year") => setTimeFrame(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Par Mois</SelectItem>
                  <SelectItem value="year">Par Année</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de graphique:</Label>
              <div className="flex gap-2">
                <Button
                  variant={chartType === "bar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Barres
                </Button>
                <Button
                  variant={chartType === "line" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChartType("line")}
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Lignes
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {selectedVehicleId && selectedVehicle && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <strong>Véhicule sélectionné:</strong> {selectedVehicle.marque} {selectedVehicle.modele} 
            ({selectedVehicle.immatriculation})
          </div>
        )}

        {chartData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periode" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value} DH`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} DH`,
                      name === 'revenus' ? 'Revenus' : 'Dépenses'
                    ]}
                    labelFormatter={(label) => `Période: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="revenus" fill="#10B981" name="Revenus" />
                  <Bar dataKey="depenses" fill="#EF4444" name="Dépenses" />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="periode" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value} DH`}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} DH`,
                      name === 'revenus' ? 'Revenus' : 'Dépenses'
                    ]}
                    labelFormatter={(label) => `Période: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenus" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Revenus"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="depenses" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    name="Dépenses"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : selectedVehicleId ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée disponible pour ce véhicule</p>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Veuillez sélectionner un véhicule pour voir la comparaison</p>
          </div>
        )}

        {/* Summary Statistics */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            {(() => {
              const totalRevenues = chartData.reduce((sum, item) => sum + item.revenus, 0);
              const totalExpenses = chartData.reduce((sum, item) => sum + item.depenses, 0);
              const netProfit = totalRevenues - totalExpenses;
              
              return (
                <>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {totalRevenues.toLocaleString()} DH
                    </div>
                    <div className="text-sm text-green-700">Revenus Totaux</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {totalExpenses.toLocaleString()} DH
                    </div>
                    <div className="text-sm text-red-700">Dépenses Totales</div>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${netProfit >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {netProfit.toLocaleString()} DH
                    </div>
                    <div className={`text-sm ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                      {netProfit >= 0 ? 'Bénéfice Net' : 'Perte Nette'}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </ReportCard>
  );
};

export default VehicleComparisonSection;