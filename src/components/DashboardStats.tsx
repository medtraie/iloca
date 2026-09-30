import React from "react";
import { Car, Users, FileText, TrendingUp, TrendingDown, DollarSign, Activity, Percent, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Link } from "react-router-dom";

export function DashboardStats() {
  const { stats, loading } = useDashboardStats();
  const reduce = useReducedMotion();

  if (loading) {
    return <LoadingSpinner message="Chargement des indicateurs clés..." />;
  }

  const occupancyRate = stats.totalVehicles > 0 ? Math.round((stats.rentedVehicles / stats.totalVehicles) * 100) : 0;
  const totalMonthlyCosts = stats.monthlyExpenses + stats.monthlyRepairs;
  const netProfit = stats.monthlyRevenue - totalMonthlyCosts;
  const profitMargin = stats.monthlyRevenue > 0 ? Math.round((netProfit / stats.monthlyRevenue) * 100) : 0;

  const statsCards = [
    {
      title: "Chiffre d'Affaires Mensuel",
      value: `${stats.monthlyRevenue.toLocaleString()} MAD`,
      subValue: `Marge nette: ${netProfit > 0 ? '+' : ''}${netProfit.toLocaleString()} MAD (${profitMargin}%)`,
      icon: DollarSign,
      link: "/recette",
      accent: "from-emerald-500/20 via-emerald-500/5 to-transparent",
      iconColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      pill: {
        text: netProfit >= 0 ? "Rentable" : "Déficit",
        bg: netProfit >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive",
      },
    },
    {
      title: "Taux d'Occupation Flotte",
      value: `${occupancyRate}%`,
      subValue: `${stats.rentedVehicles} loués sur ${stats.totalVehicles} véhicules`,
      icon: Car,
      link: "/vehicles",
      accent: "from-blue-500/20 via-blue-500/5 to-transparent",
      iconColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      pill: {
        text: `${stats.availableVehicles} libres`,
        bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      },
      meter: occupancyRate,
    },
    {
      title: "Contrats en Cours",
      value: stats.activeContracts.toString(),
      subValue: `${stats.todayContracts} nouveau(x) aujourd'hui • ${stats.completedContracts} clôturés`,
      icon: FileText,
      link: "/contracts",
      accent: "from-amber-500/20 via-amber-500/5 to-transparent",
      iconColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      pill: {
        text: `${stats.totalContracts} total`,
        bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      },
    },
    {
      title: "Portefeuille Clients CRM",
      value: stats.totalCustomers.toString(),
      subValue: "Locataires & conducteurs enregistrés",
      icon: Users,
      link: "/customers",
      accent: "from-purple-500/20 via-purple-500/5 to-transparent",
      iconColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      pill: {
        text: "Actifs 2026",
        bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {statsCards.map((stat, idx) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: reduce ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.06 }}
        >
          <Link to={stat.link} className="block group h-full">
            <Card className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 h-full flex flex-col justify-between p-5">
              
              {/* Background ambient glow */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${stat.accent} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform`} />

              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                    {stat.title}
                  </span>
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black ${stat.iconColor} group-hover:scale-110 transition-transform`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                </div>

                {/* Primary Metric */}
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">
                    {stat.value}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.pill.bg}`}>
                    {stat.pill.text}
                  </span>
                </div>

                {/* Secondary Subtitle */}
                <p className="text-xs text-muted-foreground font-medium truncate mt-1">
                  {stat.subValue}
                </p>
              </div>

              {/* Progress meter if present */}
              {stat.meter !== undefined && (
                <div className="mt-3 pt-2 border-t border-border/30">
                  <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, stat.meter)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Subtle hover prompt */}
              <div className="flex items-center justify-end gap-1 mt-2 text-[10px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Détails</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>

            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

export default DashboardStats;
