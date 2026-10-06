import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from "recharts";
import { Repair } from "@/types/repair";
import { TrendingUp, PieChart as PieChartIcon, Wrench, ShieldAlert, Car } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface RepairAnalyticsProps {
  repairs: Repair[];
}

const TYPE_COLORS: Record<string, string> = {
  Mécanique: "#f59e0b", // amber-500
  Électrique: "#3b82f6", // blue-500
  Garage: "#8b5cf6", // purple-500
  Autre: "#64748b"
};

const OPERATIONAL_COLORS: Record<string, string> = {
  pret_pour_retour: "#10b981", // emerald-500
  immobilise_long: "#ef4444", // red-500
  maintenance: "#f59e0b" // amber-500
};

export const RepairAnalytics: React.FC<RepairAnalyticsProps> = ({ repairs }) => {
  // Monthly Cost & Debt Trend
  const monthlyTrend = useMemo(() => {
    const monthlyMap = new Map<string, { month: string; cout: number; dette: number; paye: number }>();

    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));

    months.forEach((mDate) => {
      const key = format(mDate, "yyyy-MM");
      const label = format(mDate, "MMM yyyy", { locale: fr });
      monthlyMap.set(key, { month: label, cout: 0, dette: 0, paye: 0 });
    });

    repairs.forEach((repair) => {
      const date = new Date(repair.dateReparation);
      const key = format(date, "yyyy-MM");
      if (monthlyMap.has(key)) {
        const item = monthlyMap.get(key)!;
        item.cout += repair.cout || 0;
        item.dette += repair.dette || 0;
        item.paye += repair.paye || 0;
      }
    });

    return Array.from(monthlyMap.values());
  }, [repairs]);

  // Breakdown by Type
  const typePieData = useMemo(() => {
    const countMap: Record<string, number> = {};
    repairs.forEach((r) => {
      const type = r.typeReparation || "Autre";
      countMap[type] = (countMap[type] || 0) + 1;
    });

    return Object.entries(countMap).map(([name, value]) => ({
      name,
      value
    }));
  }, [repairs]);

  // Breakdown by Operational Status
  const operationalData = useMemo(() => {
    const pret = repairs.filter((r) => r.operationalStatus === "pret_pour_retour").length;
    const immobilise = repairs.filter((r) => r.operationalStatus === "immobilise_long").length;
    const maintenance = repairs.filter((r) => !r.operationalStatus || r.operationalStatus === "maintenance").length;

    return [
      { name: "Prêt retour", value: pret, key: "pret_pour_retour" },
      { name: "Immobilisé", value: immobilise, key: "immobilise_long" },
      { name: "En Maintenance", value: maintenance, key: "maintenance" }
    ].filter((item) => item.value > 0);
  }, [repairs]);

  // Top vehicles in maintenance
  const topVehicles = useMemo(() => {
    const vMap = new Map<string, { name: string; count: number; cost: number }>();
    repairs.forEach((r) => {
      const name = `${r.vehicleInfo?.marque || "Véhicule"} ${r.vehicleInfo?.modele || ""}`.trim();
      const existing = vMap.get(name) || { name, count: 0, cost: 0 };
      existing.count += 1;
      existing.cost += r.cout || 0;
      vMap.set(name, existing);
    });

    return Array.from(vMap.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }, [repairs]);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      {/* Monthly Bar/Line Chart (2 Columns) */}
      <Card className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
        <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Évolution des Coûts & Dettes de Maintenance (DH)
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Suivi des dépenses engagées en atelier vs dettes restant à régler.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0 h-[260px] sm:h-[290px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(val) => `${val / 1000}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}
                formatter={(value: number) => [`${value.toLocaleString()} DH`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "700" }} />
              <Bar dataKey="cout" name="Coût Total" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="paye" name="Règlements" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="dette" name="Dette Garages" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Side Analytics Column */}
      <div className="space-y-4">
        {/* Repair Type Breakdown */}
        <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Wrench className="h-4 w-4 text-amber-500" />
              Répartition par Type d'Intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[170px] w-full flex items-center justify-center">
            {typePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {typePieData.map((entry) => (
                      <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                      fontWeight: "bold"
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "700" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground font-semibold">Aucune donnée disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Top Vehicles by Maintenance Cost */}
        <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <Car className="h-4 w-4 text-purple-500" />
              Top Véhicules par Coût Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            {topVehicles.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/20 border border-border/40">
                <div className="space-y-0.5">
                  <span className="font-bold text-foreground block line-clamp-1">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {item.count} intervention{item.count > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="font-black text-primary">
                  {item.cost.toLocaleString()} DH
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default RepairAnalytics;
