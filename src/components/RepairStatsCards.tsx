import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, CircleDollarSign, Wallet, TriangleAlert, Gauge, CheckCircle2 } from "lucide-react";

interface RepairStatsCardsProps {
  totalRepairs: number;
  mechanicalRepairs: number;
  electricalRepairs: number;
  garageRepairs: number;
  totalCost: number;
  totalPaid: number;
  totalDebt: number;
  unpaidRepairs: number;
  averageCost: number;
  paymentCoverage: number;
}

const RepairStatsCards: React.FC<RepairStatsCardsProps> = ({
  totalRepairs,
  mechanicalRepairs,
  electricalRepairs,
  garageRepairs,
  totalCost,
  totalPaid,
  totalDebt,
  unpaidRepairs,
  averageCost,
  paymentCoverage
}) => {
  const cards = [
    {
      title: "Interventions Globales",
      subtitle: `${totalRepairs} dossier${totalRepairs > 1 ? "s" : ""} atelier enregistrés`,
      value: totalRepairs.toString(),
      detail: `Méca: ${mechanicalRepairs} | Élec: ${electricalRepairs} | Gar: ${garageRepairs}`,
      icon: Wrench,
      color: "from-blue-600/20 via-blue-500/10 to-transparent",
      borderColor: "border-blue-500/30",
      iconBg: "bg-blue-500/15 text-blue-500 dark:text-blue-400"
    },
    {
      title: "Budget Maintenance Engagé",
      subtitle: `Coût moyen: ${Math.round(averageCost).toLocaleString()} DH`,
      value: `${Math.round(totalCost).toLocaleString()} DH`,
      detail: "Total facturé par garages partenaires",
      icon: CircleDollarSign,
      color: "from-purple-600/20 via-purple-500/10 to-transparent",
      borderColor: "border-purple-500/30",
      iconBg: "bg-purple-500/15 text-purple-500 dark:text-purple-400"
    },
    {
      title: "Règlements Confirmés",
      subtitle: `Couverture: ${paymentCoverage.toFixed(0)}% du budget`,
      value: `${Math.round(totalPaid).toLocaleString()} DH`,
      detail: "Montants réglés aux garages",
      icon: Wallet,
      color: "from-emerald-600/20 via-emerald-500/10 to-transparent",
      borderColor: "border-emerald-500/30",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "Dette Garages En Attente",
      subtitle: unpaidRepairs > 0 ? `${unpaidRepairs} dossier${unpaidRepairs > 1 ? "s" : ""} à solder` : "Aucune dette",
      value: `${Math.round(totalDebt).toLocaleString()} DH`,
      detail: unpaidRepairs > 0 ? "Paiements à planifier" : "Dossiers 100% à jour",
      icon: TriangleAlert,
      color: "from-red-600/20 via-red-500/10 to-transparent",
      borderColor: totalDebt > 0 ? "border-red-500/40" : "border-border/60",
      iconBg: "bg-red-500/15 text-red-600 dark:text-red-400"
    },
    {
      title: "Couverture Financière",
      subtitle: "Performance de règlement atelier",
      value: `${paymentCoverage.toFixed(0)}%`,
      detail: paymentCoverage >= 80 ? "Trésorerie atelier saine" : "Action requise sur relances",
      icon: CheckCircle2,
      color: "from-cyan-600/20 via-cyan-500/10 to-transparent",
      borderColor: "border-cyan-500/30",
      iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
    },
    {
      title: "Santé Opérationnelle Flotte",
      subtitle: totalDebt > 0 ? "Dettes garages en cours" : "Atelier sous contrôle",
      value: totalDebt > 0 ? "À surveiller" : "Optimisé",
      detail: totalDebt > 0 ? "Planifier les règlements d'intervention" : "Aucun blocage fournisseur",
      icon: Gauge,
      color: "from-amber-600/20 via-amber-500/10 to-transparent",
      borderColor: "border-amber-500/30",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
          >
            <Card className={`relative overflow-hidden rounded-3xl border ${card.borderColor} bg-card p-4 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-md`}>
              <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${card.color}`} />
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">
                  {card.title}
                </span>
                <div className={`p-2 rounded-2xl ${card.iconBg} shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-black text-foreground tracking-tight my-1">
                {card.value}
              </div>

              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mt-2 pt-2 border-t border-border/40">
                <span className="line-clamp-1">{card.subtitle}</span>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default RepairStatsCards;
