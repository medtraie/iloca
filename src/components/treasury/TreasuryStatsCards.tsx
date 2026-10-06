import React from "react";
import { motion } from "framer-motion";
import { Building2, Coins, FileText, AlertTriangle, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";

interface TreasuryStatsCardsProps {
  totals: {
    bankBalance: number;
    cashBalance: number;
    totalChecks: number;
    clientDebts: number;
    supplierDebts: number;
    repairDebts?: number;
    totalAvailable: number;
  };
  operationsSummary: {
    entries: number;
    exits: number;
    net: number;
    pendingDebts: number;
    operationCount: number;
  };
}

export const TreasuryStatsCards: React.FC<TreasuryStatsCardsProps> = ({ totals, operationsSummary }) => {
  const cards = [
    {
      key: "bank",
      title: "Solde Banque",
      value: `${totals.bankBalance.toLocaleString()} DH`,
      subtitle: totals.bankBalance >= 0 ? "Solde Positif" : "Découvert Bancaire",
      badge: totals.bankBalance >= 0 ? "+Actif" : "Alerte",
      icon: Building2,
      border: totals.bankBalance >= 0 ? "border-blue-500/20 hover:border-blue-500/40" : "border-red-500/20 hover:border-red-500/40",
      iconBg: totals.bankBalance >= 0 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-red-500/10 text-red-600 dark:text-red-400",
      glow: totals.bankBalance >= 0 ? "from-blue-500/15 via-blue-500/5 to-transparent" : "from-red-500/15 via-red-500/5 to-transparent",
      valueColor: totals.bankBalance >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"
    },
    {
      key: "cash",
      title: "Total Espèces",
      value: `${totals.cashBalance.toLocaleString()} DH`,
      subtitle: totals.cashBalance >= 0 ? "Caisse Liquide" : "Déficit Caisse",
      badge: "Caisse",
      icon: Coins,
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-500/15 via-emerald-500/5 to-transparent",
      valueColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      key: "checks",
      title: "Total Chèques",
      value: `${totals.totalChecks.toLocaleString()} DH`,
      subtitle: "En portefeuille active",
      badge: "Chèques",
      icon: FileText,
      border: "border-purple-500/20 hover:border-purple-500/40",
      iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      glow: "from-purple-500/15 via-purple-500/5 to-transparent",
      valueColor: "text-purple-600 dark:text-purple-400"
    },
    {
      key: "net",
      title: "Net Mensuel",
      value: `${operationsSummary.net >= 0 ? "+" : ""}${operationsSummary.net.toLocaleString()} DH`,
      subtitle: `+${operationsSummary.entries.toLocaleString()} / -${operationsSummary.exits.toLocaleString()} DH`,
      badge: operationsSummary.net >= 0 ? "Excédent" : "Déficit",
      icon: operationsSummary.net >= 0 ? TrendingUp : TrendingDown,
      border: operationsSummary.net >= 0 ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-amber-500/20 hover:border-amber-500/40",
      iconBg: operationsSummary.net >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      glow: operationsSummary.net >= 0 ? "from-emerald-500/15 via-emerald-500/5 to-transparent" : "from-amber-500/15 via-amber-500/5 to-transparent",
      valueColor: operationsSummary.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
    },
    {
      key: "debts",
      title: "Dettes & Impayés",
      value: `${(totals.clientDebts + totals.supplierDebts + (totals.repairDebts || 0)).toLocaleString()} DH`,
      subtitle: `Clients: ${totals.clientDebts.toLocaleString()} DH`,
      badge: "À Recouvrer",
      icon: AlertTriangle,
      border: "border-rose-500/20 hover:border-rose-500/40",
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      glow: "from-rose-500/15 via-rose-500/5 to-transparent",
      valueColor: "text-rose-600 dark:text-rose-400"
    },
    {
      key: "available",
      title: "Trésorerie Disponible",
      value: `${totals.totalAvailable.toLocaleString()} DH`,
      subtitle: "Banque + Espèces + Chèques",
      badge: "Total Actif",
      icon: Wallet,
      border: "border-primary/40 hover:border-primary/60",
      iconBg: "bg-primary/10 text-primary",
      glow: "from-primary/20 via-primary/5 to-transparent",
      valueColor: "text-primary"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.3 }}
            className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-card via-card to-card/90 border ${card.border} shadow-xs group transition-all duration-300 hover:shadow-md`}
          >
            <div className={`absolute -top-16 -right-16 h-36 w-36 rounded-full bg-gradient-to-br ${card.glow} blur-2xl transition-opacity duration-500 pointer-events-none group-hover:opacity-100 opacity-50`} />

            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-muted-foreground truncate">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-2xl ${card.iconBg} group-hover:scale-110 transition-transform shrink-0`}>
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1 relative z-10">
              <div className={`text-lg sm:text-2xl font-black tracking-tight ${card.valueColor} truncate`}>
                {card.value}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground truncate">
                  {card.subtitle}
                </span>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40 shrink-0 ml-1">
                  {card.badge}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default TreasuryStatsCards;
