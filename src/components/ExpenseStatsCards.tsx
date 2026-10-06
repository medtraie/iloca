
import React from "react";
import { Expense } from "@/types/expense";
import { TrendingUp, DollarSign, Calendar, BarChart3, Wallet, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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

  const typeLabels: Record<string, string> = {
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
      subtitle: `${totalExpenses} enregistrement${totalExpenses > 1 ? "s" : ""}`,
      icon: BarChart3,
      badge: "Actif",
      border: "border-blue-500/20 hover:border-blue-500/40",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      glow: "from-blue-500/15 via-blue-500/5 to-transparent",
      valueColor: "text-foreground"
    },
    {
      title: "Coût Total Cumulé", 
      value: `${totalCost.toLocaleString()} DH`,
      subtitle: "Somme globale engagée",
      icon: DollarSign,
      badge: "DH Global",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      valueColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "Impact Mensuel Alloué",
      value: `${monthlyTotal.toLocaleString()} DH`,
      subtitle: "Ventilation mensuelle récurrente",
      icon: Calendar,
      badge: "DH / Mois",
      border: "border-amber-500/20 hover:border-amber-500/40",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      glow: "from-amber-500/15 via-amber-500/5 to-transparent",
      valueColor: "text-amber-600 dark:text-amber-400"
    },
    {
      title: "Poste Dominant",
      value: typeLabels[mostCommonType] || mostCommonType,
      subtitle: `${expensesByType[mostCommonType] || 0} opération${(expensesByType[mostCommonType] || 0) > 1 ? "s" : ""}`,
      icon: TrendingUp,
      badge: "Fréquence #1",
      border: "border-purple-500/20 hover:border-purple-500/40",
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      glow: "from-purple-500/15 via-purple-500/5 to-transparent",
      valueColor: "text-purple-600 dark:text-purple-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div 
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-card via-card to-card/90 border ${stat.border} shadow-xs group transition-all duration-300`}
        >
          <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full bg-gradient-to-br ${stat.glow} blur-2xl transition-opacity duration-500 pointer-events-none group-hover:opacity-100 opacity-50`} />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground truncate">
              {stat.title}
            </span>
            <div className={`p-2.5 rounded-2xl ${stat.iconBg} group-hover:scale-110 transition-transform shrink-0`}>
              <stat.icon className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <div className={`text-xl sm:text-3xl font-black tracking-tight ${stat.valueColor} truncate`}>
              {stat.value}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-muted-foreground truncate">
                {stat.subtitle}
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0 ml-2">
                {stat.badge}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ExpenseStatsCards;
