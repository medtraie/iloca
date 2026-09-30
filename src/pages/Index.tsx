import { useState, useEffect, useMemo } from "react";
import { DashboardStats } from "@/components/DashboardStats";
import { QuickActions } from "@/components/QuickActions";
import { TodayOperationsHub } from "@/components/dashboard/TodayOperationsHub";
import { FleetRadarCard } from "@/components/dashboard/FleetRadarCard";
import { DashboardMobileDrawer } from "@/components/dashboard/DashboardMobileDrawer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, TrendingUp, Users, FileText, Wrench, AlertTriangle, 
  DollarSign, Trophy, Plus, ShieldCheck, Activity, ArrowRight, 
  Car, Sparkles, Filter, CheckCircle2, ChevronRight, Gauge, Layers 
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { alertsService } from "@/services/alertsService";
import { contractsRepository } from "@/repositories/contractsRepository";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, AreaChart, Area } from "recharts";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

type DashboardViewTab = "overview" | "operations" | "financial" | "alerts";

export const Index = () => {
  const { stats, recentActivity, loading } = useDashboardStats();
  const [activeViewTab, setActiveViewTab] = useState<DashboardViewTab>("overview");
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [contracts, setContracts] = useState<any[]>([]);

  const now = new Date();

  useEffect(() => {
    alertsService.compute().then((a) => {
      setAlerts(a);
      setCounts(alertsService.groupCount(a));
    });
    contractsRepository.getAll().then((c) => setContracts(c));
  }, []);

  // Compute Revenue Timeline for the last 12 months
  const { monthlyRevenueData, revenueDeltaPct, growthProgress } = useMemo(() => {
    const byMonthMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      byMonthMap[key] = 0;
    }

    contracts.forEach((c: any) => {
      const d = new Date(c.created_at || c.start_date || now);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (byMonthMap[key] !== undefined) {
        byMonthMap[key] += Number(c.total_amount) || 0;
      }
    });

    const data = Object.keys(byMonthMap).map((k) => {
      const [y, m] = k.split("-").map(Number);
      return { 
        name: `${m}/${String(y).slice(2)}`, 
        revenue: Math.round(byMonthMap[k]),
      };
    });

    const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${prevDate.getMonth() + 1}`;
    const prevRevenue = byMonthMap[prevMonthKey] || 0;
    const currRevenue = byMonthMap[currentMonthKey] || 0;
    const delta = prevRevenue > 0 ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    return {
      monthlyRevenueData: data,
      revenueDeltaPct: delta,
      growthProgress: Math.min(Math.abs(delta), 100)
    };
  }, [contracts]);

  // Compute Contract Activity for last 30 days
  const contractActivityData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }

    contracts.forEach((c: any) => {
      const d = new Date(c.created_at || c.start_date || now);
      const dKey = d.toISOString().slice(0, 10);
      if (dailyMap[dKey] !== undefined) {
        dailyMap[dKey] += 1;
      }
    });

    return Object.keys(dailyMap).map((k) => ({
      day: k.slice(5),
      count: dailyMap[k],
    }));
  }, [contracts]);

  // Financial Health calculations
  const monthlyCosts = stats.monthlyExpenses + stats.monthlyRepairs;
  const netMonthlyResult = stats.monthlyRevenue - monthlyCosts;
  const coverageRate = monthlyCosts > 0 ? Math.round((stats.monthlyRevenue / monthlyCosts) * 100) : 100;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Top Customers of the month
  const topCustomersThisMonth = useMemo(() => {
    const topCustomersMap: Record<string, { name: string; revenue: number; contracts: number }> = {};
    contracts.forEach((contract: any) => {
      const contractDate = new Date(contract.created_at || contract.start_date || now);
      if (contractDate < monthStart) return;
      const name = contract.customer_name || contract.customerName || "Client";
      const amount = Number(contract.total_amount) || 0;
      if (!topCustomersMap[name]) {
        topCustomersMap[name] = { name, revenue: 0, contracts: 0 };
      }
      topCustomersMap[name].revenue += amount;
      topCustomersMap[name].contracts += 1;
    });
    return Object.values(topCustomersMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4);
  }, [contracts]);

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case "users": return Users;
      case "file-text": return FileText;
      case "wrench": return Wrench;
      default: return Calendar;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "customer": return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
      case "contract": return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30";
      case "repair": return "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays}j`;
  };

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-black tracking-wider uppercase text-xs animate-pulse">
            Chargement du Centre de Contrôle Flotte 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-24 safe-pt safe-pb relative">
      
      {/* 2026 COMMAND CENTER HERO BANNER */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center font-black shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Tableau de <span className="text-accent">Bord</span>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium pl-1 flex items-center gap-2 flex-wrap">
            <span>Fleet Ops & Rental Hub • <strong className="text-foreground font-bold">SFTLOCATION</strong></span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Système 2026 en direct
            </span>
          </p>
        </div>

        {/* Date / Time Card & Action Trigger */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 bg-card/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border/50 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-black">Date Système</p>
              <p className="text-xs font-black text-foreground">
                {now.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex items-center gap-2 h-11 px-4 rounded-2xl bg-accent text-accent-foreground font-black text-xs sm:text-sm shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Opération Rapide</span>
          </button>
        </div>
      </motion.div>

      {/* VIEW MODES FILTER TABS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="flex items-center gap-1.5 p-1.5 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl overflow-x-auto"
      >
        <button
          onClick={() => setActiveViewTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeViewTab === "overview"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Vue d'Ensemble 360°</span>
        </button>

        <button
          onClick={() => setActiveViewTab("operations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeViewTab === "operations"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Car className="w-3.5 h-3.5 text-accent" />
          <span>Opérations & Mouvements</span>
        </button>

        <button
          onClick={() => setActiveViewTab("financial")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeViewTab === "financial"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
          <span>Santé Financière & Rentabilité</span>
        </button>

        <button
          onClick={() => setActiveViewTab("alerts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeViewTab === "alerts"
              ? "bg-foreground text-background shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span>Alertes & Sécurité Flotte ({counts.critical ? counts.critical + (counts.warning || 0) : 0})</span>
        </button>
      </motion.div>

      {/* TELEMETRY PRIMARY KPIS */}
      <DashboardStats />

      {/* OPERATIONS & FLEET RADAR HUB (Shows on overview and operations) */}
      {(activeViewTab === "overview" || activeViewTab === "operations") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <TodayOperationsHub contracts={contracts} />
          </div>
          <div>
            <FleetRadarCard
              totalVehicles={stats.totalVehicles}
              availableVehicles={stats.availableVehicles}
              rentedVehicles={stats.rentedVehicles}
              maintenanceVehicles={stats.maintenanceVehicles}
            />
          </div>
        </div>
      )}

      {/* FINANCIAL DECK & PERFORMANCE CHARTS */}
      {(activeViewTab === "overview" || activeViewTab === "financial") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Revenue 12-Month Bar Chart */}
          <Card className="lg:col-span-2 rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                  Performance & Chiffre d'Affaires
                </CardTitle>
                <CardDescription className="text-xs font-medium">
                  Évolution des revenus sur les 12 derniers mois (MAD)
                </CardDescription>
              </div>
              <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black ${
                revenueDeltaPct >= 0 
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" 
                  : "bg-destructive/15 text-destructive border border-destructive/30"
              }`}>
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{revenueDeltaPct >= 0 ? `+${revenueDeltaPct}%` : `${revenueDeltaPct}%`} vs M-1</span>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: "bold" }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))", 
                      borderRadius: "1rem", 
                      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                      padding: "10px",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()} MAD`, "Chiffre d'Affaires"]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#revGrad)" 
                    radius={[8, 8, 0, 0]} 
                    barSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Financial Balance Summary Card */}
          <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                      Santé Financière
                    </CardTitle>
                    <CardDescription className="text-xs font-medium">Bilan charges vs recettes</CardDescription>
                  </div>
                </div>
                <Link to="/recette">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-accent hover:text-accent p-0 h-auto">
                    Recettes <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
              <div className={`p-4 rounded-2xl border ${
                netMonthlyResult >= 0 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" 
                  : "bg-destructive/10 border-destructive/30 text-destructive"
              }`}>
                <div className="text-[10px] uppercase tracking-widest font-black">Résultat Net du Mois</div>
                <div className="text-2xl font-black font-mono mt-0.5">
                  {netMonthlyResult > 0 ? "+" : ""}{netMonthlyResult.toLocaleString()} MAD
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-semibold">Recettes Locatives</span>
                  <span className="font-bold text-foreground font-mono">{stats.monthlyRevenue.toLocaleString()} MAD</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-semibold">Charges & Réparations</span>
                  <span className="font-bold text-destructive font-mono">{monthlyCosts.toLocaleString()} MAD</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                  <span className="text-muted-foreground font-semibold">Taux de Couverture</span>
                  <span className={`font-black font-mono ${coverageRate >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"}`}>
                    {coverageRate}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* QUICK ACTIONS & RECENT ACTIVITY / TOP CLIENTS */}
      {(activeViewTab === "overview" || activeViewTab === "operations") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <QuickActions />
          </div>

          {/* Activity Timeline */}
          <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-black">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black tracking-tight">Activité Récente</CardTitle>
                    <CardDescription className="text-xs font-medium">Flux système en direct</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2">
              <div className="space-y-2.5">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 4).map((activity) => {
                    const IconComp = getActivityIcon(activity.icon);
                    return (
                      <div key={activity.id} className="p-3 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${getActivityColor(activity.type)}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{activity.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{activity.description}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono font-bold shrink-0">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground">Aucune activité récente</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Clients of Month */}
          <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
            <CardHeader className="p-5 sm:p-6 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg font-black tracking-tight">Top Clients du Mois</CardTitle>
                    <CardDescription className="text-xs font-medium">Par volume généré</CardDescription>
                  </div>
                </div>
                <Link to="/customers">
                  <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-accent hover:text-accent p-0 h-auto">
                    Clients <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 pt-2">
              <div className="space-y-2.5">
                {topCustomersThisMonth.length > 0 ? (
                  topCustomersThisMonth.map((c, i) => (
                    <div key={`${c.name}-${i}`} className="p-3 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{c.contracts} contrat(s)</p>
                      </div>
                      <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                        {Math.round(c.revenue).toLocaleString()} MAD
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground">Aucun contrat clôturé ce mois</div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ALERTS & FLEET SECURITY VIEW */}
      {(activeViewTab === "overview" || activeViewTab === "alerts") && (
        <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
          <CardHeader className="p-5 sm:p-6 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                  Centre d'Alertes & Sécurité Flotte
                </CardTitle>
                <CardDescription className="text-xs font-medium">Points d'attention et maintenance immédiate</CardDescription>
              </div>
            </div>
            <Link to="/alerts">
              <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-accent hover:text-accent p-0 h-auto">
                Toutes les alertes <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/alerts" className="block group">
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 hover:border-destructive/40 transition-all text-center">
                  <div className="text-3xl font-black text-destructive font-mono">{counts.critical || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-destructive/90 mt-1">Alertes Critiques</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Vidange dépassée, visite expirée</p>
                </div>
              </Link>

              <Link to="/alerts" className="block group">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all text-center">
                  <div className="text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">{counts.warning || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 mt-1">Avertissements</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Échéances sous 15 jours</p>
                </div>
              </Link>

              <Link to="/alerts" className="block group">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all text-center">
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">{counts.info || 0}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-300 mt-1">Informations Système</div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Rappels & suivi régulier</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ANDROID FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center font-black active:scale-95 transition-transform"
        aria-label="Opération Rapide"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* ANDROID BOTTOM SHEET DRAWER */}
      <DashboardMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

    </div>
  );
};

export default Index;
