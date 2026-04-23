import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import type { TreasuryMovement } from "@/pages/Tresorerie";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { useMemo, useState } from "react";

interface TreasuryChartsProps {
  movements: TreasuryMovement[];
  bankBalance: number;
  cashBalance: number;
}

export const TreasuryCharts = ({ movements, bankBalance, cashBalance }: TreasuryChartsProps) => {
  const [visibleSeries, setVisibleSeries] = useState({
    recettes: true,
    depenses: true,
    solde: true
  });
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Espèces' | 'Chèques' | 'Virements'>('all');
  const [activePieIndex, setActivePieIndex] = useState<number | undefined>(undefined);
  const [showLineDots, setShowLineDots] = useState(true);

  const cashFlowData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthMovements = movements.filter(m => {
        const date = new Date(m.date);
        return date >= monthStart && date <= monthEnd;
      });

      const recettes = monthMovements
        .filter(m => m.amount > 0)
        .reduce((sum, m) => sum + m.amount, 0);
      
      const depenses = Math.abs(monthMovements
        .filter(m => m.amount < 0)
        .reduce((sum, m) => sum + m.amount, 0));

      return {
        month: format(month, 'MMM yyyy', { locale: fr }),
        recettes,
        depenses,
        solde: recettes - depenses
      };
    });
  }, [movements]);

  const paymentMethodData = useMemo(() => {
    const especes = movements.filter(m => m.paymentMethod === 'Espèces' && m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
    const cheques = movements.filter(m => m.paymentMethod === 'Chèque' && m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
    const virements = movements.filter(m => m.paymentMethod === 'Virement' && m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
    
    return [
      { name: 'Espèces', value: especes, color: "hsl(var(--primary))" },
      { name: 'Chèques', value: cheques, color: "hsl(var(--accent-foreground))" },
      { name: 'Virements', value: virements, color: "hsl(var(--ring))" }
    ].filter(item => item.value > 0);
  }, [movements]);

  const filteredPaymentMethodData = useMemo(() => {
    if (paymentFilter === 'all') {
      return paymentMethodData;
    }
    return paymentMethodData.filter((item) => item.name === paymentFilter);
  }, [paymentMethodData, paymentFilter]);

  const treasuryEvolution = useMemo(() => {
    let balance = 0;
    const data = [];
    
    const sortedMovements = [...movements]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);

    sortedMovements.forEach(m => {
      balance += m.amount;
      data.push({
        date: format(new Date(m.date), 'dd/MM'),
        solde: balance
      });
    });

    return data;
  }, [movements]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="border bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Recettes vs Dépenses Mensuelles
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={visibleSeries.recettes ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, recettes: !prev.recettes }))}
            >
              Recettes
            </Button>
            <Button
              size="sm"
              variant={visibleSeries.depenses ? "destructive" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, depenses: !prev.depenses }))}
            >
              Dépenses
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} DH`} />
              <Legend />
              {visibleSeries.recettes && (
                <Bar dataKey="recettes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Recettes" />
              )}
              {visibleSeries.depenses && (
                <Bar dataKey="depenses" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} name="Dépenses" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Répartition par Moyen de Paiement
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={paymentFilter === "all" ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setPaymentFilter("all")}
            >
              Tous
            </Button>
            <Button
              size="sm"
              variant={paymentFilter === "Espèces" ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setPaymentFilter("Espèces")}
            >
              Espèces
            </Button>
            <Button
              size="sm"
              variant={paymentFilter === "Chèques" ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setPaymentFilter("Chèques")}
            >
              Chèques
            </Button>
            <Button
              size="sm"
              variant={paymentFilter === "Virements" ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setPaymentFilter("Virements")}
            >
              Virements
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredPaymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
                onMouseLeave={() => setActivePieIndex(undefined)}
              >
                {filteredPaymentMethodData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    fillOpacity={activePieIndex === undefined || activePieIndex === index ? 1 : 0.5}
                    stroke={activePieIndex === index ? "hsl(var(--foreground))" : "transparent"}
                    strokeWidth={activePieIndex === index ? 2 : 0}
                    onMouseEnter={() => setActivePieIndex(index)}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} DH`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 border bg-gradient-to-br from-[hsl(var(--primary)/0.06)] to-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Courbe de Trésorerie (30 derniers jours)
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={visibleSeries.solde ? "default" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setVisibleSeries((prev) => ({ ...prev, solde: !prev.solde }))}
            >
              Solde
            </Button>
            <Button
              size="sm"
              variant={showLineDots ? "secondary" : "outline"}
              className="h-8 transition-all hover:scale-[1.03]"
              onClick={() => setShowLineDots((prev) => !prev)}
            >
              Points
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:w-1/2">
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-muted-foreground">Banque</p>
              <p className="font-semibold">{bankBalance.toLocaleString()} DH</p>
            </div>
            <div className="rounded-md border bg-background/70 p-2">
              <p className="text-muted-foreground">Espèces</p>
              <p className="font-semibold">{cashBalance.toLocaleString()} DH</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={treasuryEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} DH`} />
              <Legend />
              {visibleSeries.solde && (
                <Line 
                  type="monotone" 
                  dataKey="solde" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  name="Solde"
                  dot={showLineDots ? { fill: 'hsl(var(--primary))', r: 3 } : false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
