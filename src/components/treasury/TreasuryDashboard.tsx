import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Coins, FileText, AlertTriangle, TrendingDown, TrendingUp, Wallet } from "lucide-react";

interface TreasuryDashboardProps {
  totals: {
    bankBalance: number;
    cashBalance: number;
    totalChecks: number;
    clientDebts: number;
    supplierDebts: number;
    repairDebts?: number;
    totalAvailable: number;
  };
}

export const TreasuryDashboard = ({ totals }: TreasuryDashboardProps) => {
  const cards = [
    {
      key: "bank",
      title: "Solde Banque",
      value: totals.bankBalance,
      icon: Building2,
      tone: "text-blue-600 dark:text-blue-400",
      panel: "border-blue-500/20 bg-blue-500/5",
      footer: totals.bankBalance >= 0 ? "Solde Positif" : "Solde Négatif",
      footerTone: totals.bankBalance >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold",
      isPositive: totals.bankBalance >= 0
    },
    {
      key: "cash",
      title: "Total Espèces",
      value: totals.cashBalance,
      icon: Coins,
      tone: "text-emerald-600 dark:text-emerald-400",
      panel: "border-emerald-500/20 bg-emerald-500/5",
      footer: totals.cashBalance >= 0 ? "Caisse Disponible" : "Déficit Caisse",
      footerTone: totals.cashBalance >= 0 ? "text-emerald-600 font-bold" : "text-red-600 font-bold",
      isPositive: totals.cashBalance >= 0
    },
    {
      key: "checks",
      title: "Total Chèques",
      value: totals.totalChecks,
      icon: FileText,
      tone: "text-purple-600 dark:text-purple-400",
      panel: "border-purple-500/20 bg-purple-500/5",
      footer: "Portefeuille actif",
      footerTone: "text-muted-foreground font-semibold",
      isPositive: true
    },
    {
      key: "client-debts",
      title: "Dettes Clients",
      value: totals.clientDebts,
      icon: AlertTriangle,
      tone: "text-orange-600 dark:text-orange-400",
      panel: "border-orange-500/20 bg-orange-500/5",
      footer: "Impayés contrats",
      footerTone: "text-muted-foreground font-semibold",
      isPositive: false
    },
    {
      key: "supplier-debts",
      title: "Dettes Diverses",
      value: totals.supplierDebts,
      icon: TrendingDown,
      tone: "text-rose-600 dark:text-rose-400",
      panel: "border-rose-500/20 bg-rose-500/5",
      footer: "Règlements à effectuer",
      footerTone: "text-muted-foreground font-semibold",
      isPositive: false
    }
  ];

  if (totals.repairDebts !== undefined && totals.repairDebts > 0) {
    cards.push({
      key: "repair-debts",
      title: "Dettes Réparations",
      value: totals.repairDebts,
      icon: AlertTriangle,
      tone: "text-amber-600 dark:text-amber-400",
      panel: "border-amber-500/20 bg-amber-500/5",
      footer: "Réparations en attente",
      footerTone: "text-muted-foreground font-semibold",
      isPositive: false
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className={`rounded-3xl border ${item.panel} shadow-xs backdrop-blur-xl transition-all duration-300 hover:shadow-md`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {item.title}
              </CardTitle>
              <div className="p-2 rounded-2xl bg-background/60 shadow-xs">
                <Icon className={`h-4 w-4 ${item.tone}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {item.value.toLocaleString()} DH
              </div>
              <div className={`mt-1 flex items-center text-xs ${item.footerTone}`}>
                {item.isPositive ? (
                  <TrendingUp className="mr-1 h-3.5 w-3.5 shrink-0" />
                ) : (
                  <TrendingDown className="mr-1 h-3.5 w-3.5 shrink-0" />
                )}
                <span>{item.footer}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="rounded-3xl border-2 border-primary/40 shadow-md bg-gradient-to-br from-primary/10 via-card to-card/90 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-wider text-primary">
            Trésorerie Globale Disponible
          </CardTitle>
          <div className="p-2 rounded-2xl bg-primary/20 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black text-primary tracking-tight">
            {totals.totalAvailable.toLocaleString()} DH
          </div>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Banque + Espèces + Chèques
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
