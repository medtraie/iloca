import React from "react";
import { motion } from "framer-motion";
import { Wallet, Clock, CheckCircle2, ShieldAlert } from "lucide-react";
import { CheckStats } from "@/utils/chequeUtils";

interface ChequeStatsCardsProps {
  totalCount: number;
  receivedCount: number;
  sentCount: number;
  stats: CheckStats;
  onFilterClick?: (filterType: string) => void;
}

export const ChequeStatsCards: React.FC<ChequeStatsCardsProps> = ({
  totalCount,
  receivedCount,
  sentCount,
  stats,
  onFilterClick
}) => {
  const cards = [
    {
      id: "total",
      title: "Total Portefeuille",
      value: `${stats.totalAmount.toLocaleString()} MAD`,
      subtitle: `${totalCount} dossier${totalCount > 1 ? "s" : ""}`,
      badge: `${receivedCount} Reçus • ${sentCount} Envoyés`,
      icon: Wallet,
      border: "border-blue-500/20 hover:border-blue-500/40",
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      glow: "from-blue-500/15 via-blue-500/5 to-transparent",
      valueColor: "text-foreground"
    },
    {
      id: "pending",
      title: "À Encaisser",
      value: `${stats.pendingAmount.toLocaleString()} MAD`,
      subtitle: `${stats.dueTodayCount} aujourd'hui • ${stats.next3Count} à 3j`,
      badge: "En attente",
      icon: Clock,
      border: "border-amber-500/20 hover:border-amber-500/40",
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      glow: "from-amber-500/15 via-amber-500/5 to-transparent",
      valueColor: "text-amber-600 dark:text-amber-400"
    },
    {
      id: "settled",
      title: "Encaissements Réalisés",
      value: `${stats.settledAmount.toLocaleString()} MAD`,
      subtitle: `Taux de recouvrement: ${Math.round(stats.recoveryRate)}%`,
      badge: `${Math.round(stats.recoveryRate)}% Réussi`,
      icon: CheckCircle2,
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      valueColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      id: "returned",
      title: "Impayés & Retards",
      value: `${stats.returnedAmount.toLocaleString()} MAD`,
      subtitle: `${stats.overdueCount} chèque${stats.overdueCount > 1 ? "s" : ""} en retard`,
      badge: stats.overdueCount > 0 ? "Alerte Retard" : "Normal",
      icon: ShieldAlert,
      border: "border-red-500/20 hover:border-red-500/40",
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      glow: "from-red-500/15 via-red-500/5 to-transparent",
      valueColor: "text-red-600 dark:text-red-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04, duration: 0.3 }}
          onClick={() => onFilterClick && onFilterClick(card.id)}
          className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-card via-card to-card/90 border ${card.border} shadow-xs cursor-pointer group transition-all duration-300 hover:shadow-md`}
        >
          <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full bg-gradient-to-br ${card.glow} blur-2xl transition-opacity duration-500 pointer-events-none group-hover:opacity-100 opacity-50`} />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground truncate">
              {card.title}
            </span>
            <div className={`p-2.5 rounded-2xl ${card.iconBg} group-hover:scale-110 transition-transform shrink-0`}>
              <card.icon className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>

          <div className="space-y-1 relative z-10">
            <div className={`text-xl sm:text-3xl font-black tracking-tight ${card.valueColor} truncate`}>
              {card.value}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium text-muted-foreground truncate">
                {card.subtitle}
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0 ml-2">
                {card.badge}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ChequeStatsCards;
