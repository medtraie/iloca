import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Car,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Percent,
  Sparkles
} from "lucide-react";
import { Contract } from "@/hooks/useContracts";
import { computeContractSummary } from "@/utils/contractMath";
import { motion } from "framer-motion";

interface ContractsStatsProps {
  contracts: Contract[];
  onFilterSelect?: (filter: string) => void;
}

export const ContractsStats: React.FC<ContractsStatsProps> = ({ contracts, onFilterSelect }) => {
  const totalContracts = contracts.length;

  const ouvertContracts = contracts.filter(
    (c) => c.status === "ouvert" || c.status === "draft" || c.status === "sent" || c.status === "signed"
  ).length;

  const fermeContracts = contracts.filter(
    (c) => c.status === "ferme" || c.status === "completed"
  ).length;

  let totalRevenue = 0;
  let totalAdvance = 0;
  let overdueCount = 0;
  let extensionCount = 0;

  contracts.forEach((c) => {
    const summary = computeContractSummary(c, { advanceMode: "field" });
    totalRevenue += summary.total || Number(c.total_amount || 0);
    totalAdvance += Number(c.advance_payment || 0);
    if (c.status === "ouvert" && (summary.overdueDays || 0) > 0) {
      overdueCount++;
    }
    if ((summary.extensionDays || 0) > 0) {
      extensionCount++;
    }
  });

  const totalRemaining = Math.max(0, totalRevenue - totalAdvance);
  const recoveryRate = totalRevenue > 0 ? Math.round((totalAdvance / totalRevenue) * 100) : 100;

  const kpis = [
    {
      id: "all",
      title: "Total Contrats",
      value: totalContracts,
      subValue: "Cycle complet",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      id: "ouvert",
      title: "En Circulation",
      value: ouvertContracts,
      subValue: `${totalContracts > 0 ? Math.round((ouvertContracts / totalContracts) * 100) : 0}% de la flotte`,
      icon: Car,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      id: "overdue",
      title: "Retards Critiques",
      value: overdueCount,
      subValue: overdueCount > 0 ? "Action requise" : "Aucun retard",
      icon: AlertTriangle,
      color: overdueCount > 0 ? "text-red-500" : "text-emerald-500",
      bg: overdueCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      border: overdueCount > 0 ? "border-red-500/30" : "border-emerald-500/20",
    },
    {
      id: "ferme",
      title: "Clôturés",
      value: fermeContracts,
      subValue: "Réintégrés",
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onFilterSelect && onFilterSelect(kpi.id)}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-[1.75rem] bg-card border ${kpi.border} shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color} shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {kpi.value}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1 truncate">
                {kpi.subValue}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Financial Telemetry Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl sm:rounded-[1.75rem] bg-card/60 backdrop-blur-md border border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Volume Engagé (Total TTC)
            </span>
            <p className="text-lg font-black text-foreground">
              {totalRevenue.toLocaleString()} MAD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Encaissé (Acomptes)
            </span>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {totalAdvance.toLocaleString()} MAD
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Créances Restantes ({recoveryRate}% Recouvré)
            </span>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">
              {totalRemaining.toLocaleString()} MAD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsStats;
