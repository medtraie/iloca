
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MonthlyExpense } from "@/types/expense";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface MonthlyExpenseChartProps {
  monthlyExpenses: MonthlyExpense[];
}

const expenseTypeLabels = {
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
      <Card>
        <CardHeader>
          <CardTitle>Distribution des Charges Mensuelles</CardTitle>
          <CardDescription>
            Affichage des charges réparties par mois selon le type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">Aucune donnée de charges mensuelles</p>
              <p className="text-sm text-gray-400 mt-2">Ajoutez des charges pour afficher le graphique</p>
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
        console.warn('Invalid date in monthly expense:', expense.month_year);
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

      // Add to specific expense type (including reparation)
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
    `${value.toLocaleString()} DH`,
    expenseTypeLabels[name as keyof typeof expenseTypeLabels] || name
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribution des Charges Mensuelles</CardTitle>
        <CardDescription>
          Affichage des charges réparties sur les 12 derniers mois par type ({sortedData.length} mois)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={80}
              stroke="#6B7280"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#6B7280"
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(label) => `Mois: ${label}`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Legend
              formatter={(value) => expenseTypeLabels[value as keyof typeof expenseTypeLabels] || value}
            />
            <Bar dataKey="vignette" stackId="a" fill="#3B82F6" />
            <Bar dataKey="assurance" stackId="a" fill="#10B981" />
            <Bar dataKey="visite_technique" stackId="a" fill="#F59E0B" />
            <Bar dataKey="gps" stackId="a" fill="#8B5CF6" />
            <Bar dataKey="credit" stackId="a" fill="#EF4444" />
            <Bar dataKey="reparation" stackId="a" fill="#F97316" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyExpenseChart;
