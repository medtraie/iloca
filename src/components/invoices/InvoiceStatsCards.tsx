import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Invoice } from "@/hooks/useInvoices";
import {
  FileText,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Receipt,
  Percent
} from "lucide-react";

interface InvoiceStatsCardsProps {
  invoices: Invoice[];
}

export const InvoiceStatsCards: React.FC<InvoiceStatsCardsProps> = ({ invoices }) => {
  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
    const totalHT = invoices.reduce((sum, inv) => sum + (inv.totalHT || 0), 0);
    const totalTVA = invoices.reduce((sum, inv) => sum + (inv.tva || 0), 0);

    const paidInvoices = invoices.filter((inv) => inv.status === "paid");
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

    const pendingInvoices = invoices.filter((inv) => inv.status === "pending");
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

    const overdueInvoices = invoices.filter((inv) => inv.status === "overdue");
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

    const recoveryRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 100;

    return {
      count: invoices.length,
      totalAmount,
      totalHT,
      totalTVA,
      paidCount: paidInvoices.length,
      paidAmount,
      pendingCount: pendingInvoices.length,
      pendingAmount,
      overdueCount: overdueInvoices.length,
      overdueAmount,
      recoveryRate
    };
  }, [invoices]);

  const cards = [
    {
      title: "Chiffre d'Affaires Facturé",
      subtitle: `${stats.count} facture${stats.count > 1 ? "s" : ""} émises`,
      value: `${stats.totalAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
      detail: `HT: ${stats.totalHT.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} | TVA: ${stats.totalTVA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`,
      icon: FileText,
      color: "from-blue-600/20 via-blue-500/10 to-transparent",
      borderColor: "border-blue-500/30",
      iconBg: "bg-blue-500/15 text-blue-500 dark:text-blue-400"
    },
    {
      title: "Règlements Encaissés",
      subtitle: `${stats.paidCount} payée${stats.paidCount > 1 ? "s" : ""} (${stats.recoveryRate}% recouvré)`,
      value: `${stats.paidAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
      detail: "Règlements confirmés en trésorerie",
      icon: CheckCircle2,
      color: "from-emerald-600/20 via-emerald-500/10 to-transparent",
      borderColor: "border-emerald-500/30",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "Encours Client En Attente",
      subtitle: `${stats.pendingCount} en attente d'échéance`,
      value: `${stats.pendingAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
      detail: "Encaissements à venir sous 30j",
      icon: Clock3,
      color: "from-amber-600/20 via-amber-500/10 to-transparent",
      borderColor: "border-amber-500/30",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
    },
    {
      title: "Retards & Impayés Échus",
      subtitle: stats.overdueCount > 0 ? "Relance client requise" : "Aucune créance en retard",
      value: `${stats.overdueAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
      detail: `${stats.overdueCount} facture${stats.overdueCount > 1 ? "s" : ""} hors délai`,
      icon: AlertTriangle,
      color: "from-red-600/20 via-red-500/10 to-transparent",
      borderColor: stats.overdueCount > 0 ? "border-red-500/40" : "border-border/60",
      iconBg: "bg-red-500/15 text-red-600 dark:text-red-400"
    },
    {
      title: "TVA Collectée (20%)",
      subtitle: "Conformité fiscale & déclarations",
      value: `${stats.totalTVA.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD`,
      detail: "Montant TVA à déclarer à la DGI",
      icon: Receipt,
      color: "from-purple-600/20 via-purple-500/10 to-transparent",
      borderColor: "border-purple-500/30",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400"
    },
    {
      title: "Taux de Recouvrement",
      subtitle: "Performance des encaissements",
      value: `${stats.recoveryRate}%`,
      detail: stats.recoveryRate >= 80 ? "Excellente santé de trésorerie" : "Attention aux créances",
      icon: Percent,
      color: "from-cyan-600/20 via-cyan-500/10 to-transparent",
      borderColor: "border-cyan-500/30",
      iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
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

export default InvoiceStatsCards;
