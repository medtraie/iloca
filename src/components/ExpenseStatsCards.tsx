
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@/types/expense";
import { TrendingUp, DollarSign, Calendar, BarChart3 } from "lucide-react";

interface ExpenseStatsCardsProps {
  expenses: Expense[];
}

const ExpenseStatsCards = ({ expenses }: ExpenseStatsCardsProps) => {
  const totalExpenses = expenses.length;
  const totalCost = expenses.reduce((sum, expense) => sum + Number(expense.total_cost || 0), 0);
  const monthlyTotal = expenses.reduce((sum, expense) => sum + Number(expense.monthly_cost || 0), 0);
  
  // Get expenses by type
  const expensesByType = expenses.reduce((acc, expense) => {
    acc[expense.type] = (acc[expense.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonType = Object.entries(expensesByType)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Aucun';

  const typeLabels = {
    vignette: "Vignette",
    assurance: "Assurance",
    visite_technique: "Visite technique", 
    gps: "GPS",
    credit: "Crédit",
    reparation: "Réparation"
  };

  const stats = [
    {
      title: "Total des Charges",
      value: totalExpenses,
      description: "Nombre total de charges",
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Coût Total", 
      value: `${totalCost.toLocaleString()} DH`,
      description: "Somme de tous les coûts",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Coût Mensuel",
      value: `${monthlyTotal.toLocaleString()} DH`,
      description: "Somme des coûts mensuels",
      icon: Calendar,
      color: "text-orange-600", 
      bgColor: "bg-orange-50"
    },
    {
      title: "Type le Plus Fréquent",
      value: typeLabels[mostCommonType as keyof typeof typeLabels] || mostCommonType,
      description: `${expensesByType[mostCommonType] || 0} charges`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {stat.value}
            </div>
            <CardDescription className="text-xs text-gray-500">
              {stat.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExpenseStatsCards;
