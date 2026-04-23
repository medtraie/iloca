
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, CircleDollarSign, Gauge, TriangleAlert, Wallet, Wrench, Zap } from "lucide-react";

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

const RepairStatsCards = ({ 
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
}: RepairStatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return `${Math.round(amount).toLocaleString()} DH`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      <Card className="border-primary/20 bg-primary/5 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Interventions</p>
              <p className="text-3xl font-black text-foreground mt-1">{totalRepairs}</p>
              <p className="text-sm text-muted-foreground mt-1">Volume global des réparations</p>
            </div>
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Répartition</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  <Wrench className="h-3.5 w-3.5 mr-1" />
                  Mécanique {mechanicalRepairs}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Électrique {electricalRepairs}
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                  <Car className="h-3.5 w-3.5 mr-1" />
                  Garage {garageRepairs}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl bg-muted p-2.5 text-foreground">
              <Gauge className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Montant engagé</p>
              <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(totalCost)}</p>
              <p className="text-sm text-muted-foreground mt-1">Panier moyen {formatCurrency(averageCost)}</p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Paiements reçus</p>
              <p className="text-2xl font-black text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
              <p className="text-sm text-muted-foreground mt-1">Couverture {paymentCoverage.toFixed(0)}%</p>
            </div>
            <div className="rounded-xl bg-green-100 p-2.5 text-green-700">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, paymentCoverage))}%` }}
            />
          </div>
        </CardContent>
      </Card>
      <Card className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Dette en cours</p>
              <p className="text-2xl font-black text-red-600 mt-1">{formatCurrency(totalDebt)}</p>
              <p className="text-sm text-muted-foreground mt-1">{unpaidRepairs} dossier{unpaidRepairs > 1 ? "s" : ""} à solder</p>
            </div>
            <div className="rounded-xl bg-red-100 p-2.5 text-red-700">
              <TriangleAlert className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="transition-all duration-200 hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Équilibre global</p>
              <p className={`text-2xl font-black mt-1 ${totalDebt > 0 ? "text-amber-600" : "text-green-600"}`}>
                {totalDebt > 0 ? "À surveiller" : "Sain"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalDebt > 0 ? "Prioriser les règlements en attente" : "Trésorerie des réparations stabilisée"}
              </p>
            </div>
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
              <Gauge className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepairStatsCards;
