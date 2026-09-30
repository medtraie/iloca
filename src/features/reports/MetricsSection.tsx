import React from "react";
import { Calendar, DollarSign, TrendingUp, Car, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Percent, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface MetricsSectionProps {
  stats: {
    totalContracts: number;
    activeContracts: number;
    completedContracts: number;
    upcomingContracts: number;
    overdueContracts: number;
    extendedContracts: number;
    paidContracts: number;
    pendingContracts: number;
    paidRate?: number;
    totalRevenue: number;
    totalExpenses: number;
    totalDaysRented: number;
    overdueRevenue: number;
    netProfit: number;
  };
}

export const MetricsSection: React.FC<MetricsSectionProps> = ({ stats }) => {
  const isProfitable = stats.netProfit >= 0;
  const paidRate = stats.paidRate ?? (stats.totalContracts > 0 ? Math.round((stats.paidContracts / stats.totalContracts) * 100) : 0);

  const primaryCards = [
    {
      title: "Chiffre d'Affaires Filtré",
      value: `${Math.round(stats.totalRevenue).toLocaleString()} MAD`,
      subline: `Bénéfice net: ${isProfitable ? '+' : ''}${Math.round(stats.netProfit).toLocaleString()} MAD`,
      icon: DollarSign,
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      accent: "from-emerald-500/20 to-transparent",
      badge: isProfitable ? "Rentable" : "Déficit",
      badgeColor: isProfitable ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive",
    },
    {
      title: "Volume des Contrats",
      value: stats.totalContracts.toString(),
      subline: `${stats.activeContracts} actif(s) • ${stats.completedContracts} terminé(s)`,
      icon: Layers,
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      accent: "from-blue-500/20 to-transparent",
      badge: `${stats.upcomingContracts} à venir`,
      badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total Jours Loués",
      value: `${stats.totalDaysRented.toLocaleString()} j`,
      subline: "Durée cumulée d'exploitation flotte",
      icon: Car,
      color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      accent: "from-purple-500/20 to-transparent",
      badge: "Flotte active",
      badgeColor: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    },
    {
      title: "Taux de Recouvrement",
      value: `${paidRate}%`,
      subline: `${stats.paidContracts} payé(s) sur ${stats.totalContracts} contrats`,
      icon: Percent,
      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      accent: "from-amber-500/20 to-transparent",
      badge: `${stats.pendingContracts} en attente`,
      badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  ];

  const financialStatusCards = [
    {
      label: "Contrats Payés",
      value: stats.paidContracts,
      sub: "Règlements encaissés",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "En Attente de Paiement",
      value: stats.pendingContracts,
      sub: "Factures à recouvrer",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Prolongations Actives",
      value: stats.extendedContracts,
      sub: "Avenants et extensions",
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Impayés & Retards",
      value: stats.overdueContracts,
      sub: `+${Math.round(stats.overdueRevenue).toLocaleString()} MAD de pénalités`,
      icon: AlertTriangle,
      color: "text-destructive bg-destructive/10 border-destructive/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden p-5 relative group hover:shadow-xl transition-all">
              <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl ${card.accent} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform`} />
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground truncate">
                  {card.title}
                </span>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black ${card.color} group-hover:scale-110 transition-transform`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight font-mono">
                  {card.value}
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <p className="text-xs text-muted-foreground font-medium truncate mt-1">
                {card.subline}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Financial Status Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {financialStatusCards.map((item, idx) => (
          <div
            key={item.label}
            className={`p-3.5 rounded-2xl border ${item.color} flex items-center justify-between gap-3`}
          >
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider block opacity-80 truncate">
                {item.label}
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono block mt-0.5">
                {item.value}
              </span>
              <span className="text-[10px] opacity-75 truncate block">
                {item.sub}
              </span>
            </div>
            <item.icon className="w-5 h-5 shrink-0 opacity-80" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsSection;
