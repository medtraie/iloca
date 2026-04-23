import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MiscellaneousExpense } from '@/hooks/useMiscellaneousExpenses';

interface MiscellaneousExpenseChartProps {
  expenses: MiscellaneousExpense[];
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
  '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'
];

const MiscellaneousExpenseChart = ({ expenses }: MiscellaneousExpenseChartProps) => {
  // Group expenses by type for pie chart
  const expensesByType = expenses.reduce((acc, expense) => {
    const type = expense.custom_expense_type || expense.expense_type;
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expensesByType).map(([type, amount]) => ({
    name: type,
    value: amount,
    percentage: ((amount / expenses.reduce((sum, exp) => sum + exp.amount, 0)) * 100).toFixed(1)
  }));

  // Group expenses by payment method for bar chart
  const expensesByPaymentMethod = expenses.reduce((acc, expense) => {
    if (!acc[expense.payment_method]) {
      acc[expense.payment_method] = 0;
    }
    acc[expense.payment_method] += expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.entries(expensesByPaymentMethod).map(([method, amount]) => ({
    method,
    amount,
    count: expenses.filter(exp => exp.payment_method === method).length
  }));

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-primary">
            {`Montant: ${payload[0].value.toLocaleString()} MAD`}
          </p>
          {payload[0].payload.percentage && (
            <p className="text-muted-foreground">
              {`Pourcentage: ${payload[0].payload.percentage}%`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 border border-border rounded-lg shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          <p className="text-primary">
            {`Montant: ${payload[0].value.toLocaleString()} MAD`}
          </p>
          <p className="text-muted-foreground">
            {`Transactions: ${payload[0].payload.count}`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyse des Dépenses Diverses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée disponible pour l'analyse
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Analyse des Dépenses Diverses</span>
          <div className="text-sm text-muted-foreground">
            Total: {totalExpenses.toLocaleString()} MAD
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="by-type" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="by-type">Par Catégorie</TabsTrigger>
            <TabsTrigger value="by-payment">Par Mode de Paiement</TabsTrigger>
          </TabsList>
          
          <TabsContent value="by-type" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-[300px]">
                <h4 className="text-sm font-medium mb-2 text-center">Répartition par Catégorie</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend and Details */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium mb-3">Détails par Catégorie</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {pieData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{item.value.toLocaleString()} MAD</div>
                        <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="by-payment" className="space-y-4">
            <div className="h-[300px]">
              <h4 className="text-sm font-medium mb-2 text-center">Répartition par Mode de Paiement</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" />
                  <YAxis />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {barData.map((item, index) => (
                <div key={item.method} className="bg-muted p-4 rounded-lg text-center">
                  <div className="text-lg font-bold text-foreground">{item.amount.toLocaleString()} MAD</div>
                  <div className="text-sm text-muted-foreground">{item.method}</div>
                  <div className="text-xs text-muted-foreground">{item.count} transaction(s)</div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MiscellaneousExpenseChart;