
import { Car, Users, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useReducedMotion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import LoadingSpinner from "@/components/LoadingSpinner";

export function DashboardStats() {
  const { stats, loading } = useDashboardStats();
  const reduce = useReducedMotion();
  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des statistiques..." />;
  }

  const statsCards = [
    {
      title: "Total des Véhicules",
      value: stats.totalVehicles.toString(),
      change: `${stats.availableVehicles} disponibles`,
      changeType: "positive" as const,
      icon: Car,
      description: "véhicules",
      colors: {
        icon: "text-card-blue",
        iconBg: "bg-card-blue-bg",
        accent: "bg-card-blue",
        change: "text-card-blue"
      }
    },
    {
      title: "Clients Actifs",
      value: stats.totalCustomers.toString(),
      change: "enregistrés",
      changeType: "positive" as const,
      icon: Users,
      description: "clients",
      colors: {
        icon: "text-card-green",
        iconBg: "bg-card-green-bg",
        accent: "bg-card-green",
        change: "text-card-green"
      }
    },
    {
      title: "Contrats Mensuels",
      value: stats.activeContracts.toString(),
      change: `${stats.totalContracts} total`,
      changeType: "positive" as const,
      icon: FileText,
      description: "contrats",
      colors: {
        icon: "text-card-orange",
        iconBg: "bg-card-orange-bg",
        accent: "bg-card-orange",
        change: "text-card-orange"
      }
    },
    {
      title: "Revenus Mensuels",
      value: stats.monthlyRevenue.toLocaleString(),
      change: `${(stats.monthlyExpenses + stats.monthlyRepairs).toLocaleString()} MAD charges`,
      changeType: stats.monthlyRevenue > (stats.monthlyExpenses + stats.monthlyRepairs) ? "positive" : "negative" as const,
      icon: TrendingUp,
      description: "dirhams",
      colors: {
        icon: "text-primary dark:text-accent",
        iconBg: "bg-primary/10 dark:bg-accent/10",
        accent: "bg-primary dark:bg-accent",
        change: stats.monthlyRevenue > (stats.monthlyExpenses + stats.monthlyRepairs) ? "text-success" : "text-destructive"
      }
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, idx) => (
        <motion.div key={stat.title} variants={item} initial="hidden" animate="show" transition={{ delay: idx * 0.05 }}>
        <Card className="relative overflow-hidden rounded-[2rem] border-none bg-white dark:bg-card shadow-card transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-3 rounded-2xl ${stat.colors.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              <stat.icon className={`h-5 w-5 ${stat.colors.icon}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black mb-2 tracking-tight">{stat.value}</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs font-bold">
                {stat.changeType === "positive" ? (
                  <TrendingUp className={`h-3.5 w-3.5 ${stat.colors.change}`} />
                ) : (
                  <TrendingDown className={`h-3.5 w-3.5 ${stat.colors.change}`} />
                )}
                <span className={`${stat.colors.change}`}>
                  {stat.change}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{stat.description}</span>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 left-0 w-full h-1.5 ${stat.colors.accent} opacity-20 group-hover:opacity-100 transition-opacity duration-300`}></div>
        </Card>
        </motion.div>
      ))}
    </div>
  );
}
