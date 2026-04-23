
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#F97316"];

const expenseTypeLabels = {
  vignette: "Vignette",
  assurance: "Assurance",
  visite_technique: "Visite technique",
  gps: "GPS",
  credit: "Crédit",
  reparation: "Réparation",
};

type PieData = { type: string; value: number; label: string };

type Props = {
  expenses: Expense[];
  onSliceClick?: (type: Expense["type"]) => void;
};

const ExpenseTypePieChart = ({ expenses, onSliceClick }: Props) => {
  // Count total cost by type
  const pieData: PieData[] = Object.entries(
    expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + Number(e.total_cost || 0);
      return acc;
    }, {})
  ).map(([type, value]) => ({
    type,
    value,
    label: expenseTypeLabels[type as keyof typeof expenseTypeLabels] || type
  }));

  if (pieData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition par Type de Charge</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-gray-400">
          Aucune donnée. Ajoutez une dépense ou élargissez les filtres.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition par Type de Charge</CardTitle>
        <CardDescription>Distribution des charges totales par type pour tous les véhicules</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              onClick={(payload) => {
                if (!payload?.type || !onSliceClick) return;
                onSliceClick(payload.type as Expense["type"]);
              }}
            >
              {pieData.map((entry, idx) => (
                <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`${v.toLocaleString()} DH`, name]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ExpenseTypePieChart;
