import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Coins, FileText, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

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
      tone: "text-blue-600",
      panel: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
      footer: totals.bankBalance >= 0 ? "Positif" : "Négatif",
      footerTone: totals.bankBalance >= 0 ? "text-emerald-600" : "text-red-600",
      isPositive: totals.bankBalance >= 0
    },
    {
      key: "cash",
      title: "Total Espèces",
      value: totals.cashBalance,
      icon: Coins,
      tone: "text-emerald-600",
      panel: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
      footer: totals.cashBalance >= 0 ? "Disponible" : "Déficit",
      footerTone: totals.cashBalance >= 0 ? "text-emerald-600" : "text-red-600",
      isPositive: totals.cashBalance >= 0
    },
    {
      key: "checks",
      title: "Total Chèques",
      value: totals.totalChecks,
      icon: FileText,
      tone: "text-violet-600",
      panel: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
      footer: "En circulation",
      footerTone: "text-muted-foreground",
      isPositive: true
    },
    {
      key: "client-debts",
      title: "Dettes Clients",
      value: totals.clientDebts,
      icon: AlertTriangle,
      tone: "text-orange-600",
      panel: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
      footer: "Contrats impayés",
      footerTone: "text-muted-foreground",
      isPositive: false
    },
    {
      key: "supplier-debts",
      title: "Dettes Diverses",
      value: totals.supplierDebts,
      icon: TrendingDown,
      tone: "text-rose-600",
      panel: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
      footer: "À régler",
      footerTone: "text-muted-foreground",
      isPositive: false
    }
  ];

  if (totals.repairDebts !== undefined && totals.repairDebts > 0) {
    cards.push({
      key: "repair-debts",
      title: "Dettes Réparations",
      value: totals.repairDebts,
      icon: AlertTriangle,
      tone: "text-amber-600",
      panel: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
      footer: "Réparations impayées",
      footerTone: "text-muted-foreground",
      isPositive: false
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className={`border bg-gradient-to-br ${item.panel} shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
              <Icon className={`h-5 w-5 ${item.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {item.value.toLocaleString()} DH
              </div>
              <div className={`mt-1 flex items-center text-xs ${item.footerTone}`}>
                {item.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                <span>{item.footer}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card className="border-2 border-primary shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Trésorerie Disponible
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {totals.totalAvailable.toLocaleString()} DH
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Banque + Espèces + Chèques
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
