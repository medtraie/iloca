import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Car, Wrench, CheckCircle, ShieldCheck, ArrowRight, Activity, Gauge } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface FleetRadarCardProps {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
}

export const FleetRadarCard: React.FC<FleetRadarCardProps> = ({
  totalVehicles,
  availableVehicles,
  rentedVehicles,
  maintenanceVehicles,
}) => {
  const occupancyRate = totalVehicles > 0 ? Math.round((rentedVehicles / totalVehicles) * 100) : 0;

  const data = [
    { name: "Loués", value: rentedVehicles, color: "#2563EB" },
    { name: "Disponibles", value: availableVehicles, color: "#10B981" },
    { name: "Maintenance", value: maintenanceVehicles, color: "#F59E0B" },
  ];

  return (
    <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="p-5 sm:p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-black">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                Radar & Disponibilité Flotte
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                {totalVehicles} véhicule{totalVehicles > 1 ? "s" : ""} au parc
              </CardDescription>
            </div>
          </div>
          <Link to="/vehicles">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-accent hover:text-accent p-0 h-auto">
              Parc <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
        {/* Donut Chart with Centered Occupancy Rate */}
        <div className="h-[180px] w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={6}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "1rem",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-foreground font-mono">{occupancyRate}%</span>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-black">Occupé</span>
          </div>
        </div>

        {/* Status Grid Badges */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Dispos
            </span>
            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
              {availableVehicles}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              En Route
            </span>
            <span className="text-xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {rentedVehicles}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Atelier
            </span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
              {maintenanceVehicles}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FleetRadarCard;
