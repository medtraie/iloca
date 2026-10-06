
import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Expense } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#F97316"];

const expenseTypeLabels: Record<string, string> = {
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
    label: expenseTypeLabels[type] || type
  }));

  if (pieData.length === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm h-full flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-base font-black flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Répartition par Type de Charge
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground text-xs font-medium">
          Aucune donnée. Ajoutez une dépense ou élargissez les filtres.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm h-full flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-black flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-primary" />
          Répartition par Type de Charge
        </CardTitle>
        <CardDescription className="text-xs font-medium mt-0.5">
          Distribution des charges totales par type pour tous les véhicules
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={4}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              onClick={(payload) => {
                if (!payload?.type || !onSliceClick) return;
                onSliceClick(payload.type as Expense["type"]);
              }}
              className="cursor-pointer"
            >
              {pieData.map((entry, idx) => (
                <Cell key={entry.type} fill={COLORS[idx % COLORS.length]} className="transition-opacity hover:opacity-80" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) => [`${Number(v).toLocaleString()} DH`, name]}
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '12px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
              }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs font-bold text-foreground">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ExpenseTypePieChart;
