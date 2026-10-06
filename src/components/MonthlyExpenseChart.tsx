
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MonthlyExpense } from "@/types/expense";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BarChart3 } from "lucide-react";

interface MonthlyExpenseChartProps {
  monthlyExpenses: MonthlyExpense[];
}

const expenseTypeLabels: Record<string, string> = {
  vignette: "Vignette",
  assurance: "Assurance",
  visite_technique: "Visite technique",
  gps: "GPS",
  credit: "Crédit",
  reparation: "Réparation"
};

const MonthlyExpenseChart = ({ monthlyExpenses }: MonthlyExpenseChartProps) => {
  if (!monthlyExpenses || monthlyExpenses.length === 0) {
    return (
      <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-black flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Distribution des Charges Mensuelles
          </CardTitle>
          <CardDescription className="text-xs font-medium">
            Affichage des charges réparties par mois selon le type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center space-y-1">
              <p className="text-sm font-black text-foreground">Aucune donnée de charges mensuelles</p>
              <p className="text-xs text-muted-foreground font-medium">Ajoutez des charges pour afficher le graphique</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by month and sum amounts, supporting all 6 types including reparation
  const chartData = monthlyExpenses.reduce((acc, expense) => {
    try {
      const expenseDate = new Date(expense.month_year);
      if (isNaN(expenseDate.getTime())) {
        return acc;
      }

      const monthKey = format(expenseDate, 'yyyy-MM');
      const monthLabel = format(expenseDate, 'MMM yyyy', { locale: fr });

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthLabel,
          sortKey: monthKey,
          total: 0,
          vignette: 0,
          assurance: 0,
          visite_technique: 0,
          gps: 0,
          credit: 0,
          reparation: 0
        };
      }

      const amount = Number(expense.allocated_amount) || 0;
      acc[monthKey].total += amount;

      if (expense.expense_type && expense.expense_type in acc[monthKey]) {
        acc[monthKey][expense.expense_type] += amount;
      }

    } catch (error) {
      console.error('Error processing expense date:', expense.month_year, error);
    }

    return acc;
  }, {} as Record<string, any>);

  const sortedData = Object.values(chartData)
    .sort((a, b) => (a.sortKey as string).localeCompare(b.sortKey as string))
    .slice(-12);

  const formatTooltipValue = (value: number, name: string) => [
    `${Number(value || 0).toLocaleString()} DH`,
    expenseTypeLabels[name] || name
  ];

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-black flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribution des Charges Mensuelles
            </CardTitle>
            <CardDescription className="text-xs font-medium mt-0.5">
              Affichage des charges réparties sur les 12 derniers mois par type ({sortedData.length} mois)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={sortedData} margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontWeight: 700 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
              stroke="currentColor"
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11, fontWeight: 700 }}
              stroke="currentColor"
              className="text-muted-foreground"
              tickFormatter={(value) => `${Number(value).toLocaleString()}`}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Mois: ${label}`}
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
                  {expenseTypeLabels[value] || value}
                </span>
              )}
            />
            <Bar dataKey="vignette" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="assurance" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="visite_technique" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
            <Bar dataKey="gps" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="credit" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="reparation" stackId="a" fill="#F97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyExpenseChart;
