
import { DashboardStats } from "@/components/DashboardStats";
import { QuickActions } from "@/components/QuickActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, TrendingUp, Users, FileText, Wrench, AlertTriangle, DollarSign, Trophy } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { localStorageService } from "@/services/localStorageService";
import { alertsService } from "@/services/alertsService";
import { fuelService } from "@/services/fuelService";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { motion, useReducedMotion } from "framer-motion";

const Index = () => {
  const { stats, recentActivity, loading } = useDashboardStats();

  const getActivityIcon = (iconType: string) => {
    switch (iconType) {
      case 'users': return Users;
      case 'file-text': return FileText;
      case 'wrench': return Wrench;
      default: return Calendar;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-card-green-bg text-card-green';
      case 'contract': return 'bg-card-blue-bg text-card-blue';
      case 'repair': return 'bg-card-red-bg text-card-red';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Il y a quelques minutes';
    if (diffInHours < 24) return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  };

  const loadingSkeleton = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    </div>
  );

  const occupancyRate = stats.totalVehicles > 0 ? Math.round((stats.rentedVehicles / stats.totalVehicles) * 100) : 0;
  const customerSatisfaction = 94; // This could be calculated from feedback data

  const contracts = localStorageService.getAll<any>('contracts');
  const now = new Date();
  const byMonthMap: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    byMonthMap[key] = 0;
  }
  contracts.forEach((c: any) => {
    const d = new Date(c.created_at);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (byMonthMap[key] !== undefined) {
      byMonthMap[key] += Number(c.total_amount) || 0;
    }
    const dKey = d.toISOString().slice(0, 10);
    dailyMap[dKey] = (dailyMap[dKey] || 0) + 1;
  });
  const monthlyRevenueData = Object.keys(byMonthMap).map((k) => {
    const [y, m] = k.split("-").map(Number);
    return { name: `${m}/${String(y).slice(2)}`, revenue: Math.round(byMonthMap[k]) };
  });
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${prevDate.getMonth() + 1}`;
  const prevRevenue = byMonthMap[prevMonthKey] || 0;
  const currRevenue = byMonthMap[currentMonthKey] || 0;
  const revenueDeltaPct = prevRevenue > 0 ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 100) : 0;
  const growthProgress = Math.min(Math.abs(revenueDeltaPct), 100);
  const last30Days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    last30Days.push(d.toISOString().slice(0, 10));
  }
  const contractActivityData = last30Days.map((k) => ({
    day: k.slice(5),
    count: dailyMap[k] || 0,
  }));
  const usageData = [
    { name: "Loués", value: stats.rentedVehicles },
    { name: "Disponibles", value: stats.availableVehicles },
    { name: "Maintenance", value: stats.maintenanceVehicles },
  ];
  const pieColors = ["#2563EB", "#22C55E", "#F59E0B"];

  const alerts = alertsService.compute();
  const counts = alertsService.groupCount(alerts);
  const fuelMonthly = fuelService.monthlyCost(now.getFullYear(), now.getMonth());
  const monthlyCosts = stats.monthlyExpenses + stats.monthlyRepairs;
  const netMonthlyResult = stats.monthlyRevenue - monthlyCosts;
  const coverageRate = monthlyCosts > 0 ? Math.round((stats.monthlyRevenue / monthlyCosts) * 100) : 100;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const topCustomersMap: Record<string, { name: string; revenue: number; contracts: number }> = {};
  contracts.forEach((contract: any) => {
    const contractDate = new Date(contract.created_at || contract.start_date);
    if (contractDate < monthStart) return;
    const name = contract.customer_name || contract.customerName || "Client";
    const amount = Number(contract.total_amount) || 0;
    if (!topCustomersMap[name]) {
      topCustomersMap[name] = { name, revenue: 0, contracts: 0 };
    }
    topCustomersMap[name].revenue += amount;
    topCustomersMap[name].contracts += 1;
  });
  const topCustomersThisMonth = Object.values(topCustomersMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const expiringContracts = contracts
    .map((contract: any) => {
      const endDateRaw = contract.end_date || contract.endDate || contract.date_fin;
      const endDate = endDateRaw ? new Date(endDateRaw) : null;
      if (!endDate || Number.isNaN(endDate.getTime())) return null;
      const diffMs = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        id: contract.id,
        contractNumber: contract.contract_number || contract.contractNumber || "N/A",
        customerName: contract.customer_name || contract.customerName || "Client",
        daysRemaining,
      };
    })
    .filter((item): item is { id: string; contractNumber: string; customerName: string; daysRemaining: number } => !!item && item.daysRemaining >= 0 && item.daysRemaining <= 7)
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 5);

  if (loading) {
    return loadingSkeleton;
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Section */}
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4" 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-1">
            Tableau de <span className="text-accent">Bord</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Gestion de flotte premium <span className="text-foreground font-bold">SFTLOCATION</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-2xl shadow-sm border border-border/50">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div className="pr-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Aujourd'hui</p>
            <p className="text-sm font-bold">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div 
          className="lg:col-span-2" 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
        >
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-start justify-between pb-8">
              <div>
                <CardTitle className="text-xl font-bold">Revenus mensuels</CardTitle>
                <CardDescription className="font-medium">Performance des 12 derniers mois</CardDescription>
              </div>
              <div className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${revenueDeltaPct >= 0 ? 'bg-card-green-bg text-card-green' : 'bg-card-red-bg text-card-red'}`}>
                <TrendingUp className="h-3.5 w-3.5" />
                <span>{revenueDeltaPct >= 0 ? `+${revenueDeltaPct}%` : `${revenueDeltaPct}%`}</span>
              </div>
            </CardHeader>
            <CardContent className="h-[300px] pr-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--card-accent))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--card-accent))" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(225,255,0,0.05)', radius: 10 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none', 
                      borderRadius: '1rem', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      padding: '12px'
                    }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()} DH`, 'Revenu']}
                  />
                  <Bar 
                    dataKey="revenue" 
                    fill="url(#revGrad)" 
                    radius={[10, 10, 0, 0]} 
                    barSize={32}
                    isAnimationActive 
                    animationDuration={1000} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">Utilisation flotte</CardTitle>
              <CardDescription className="font-medium">Répartition actuelle</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={usageData} 
                    dataKey="value" 
                    nameKey="name" 
                    innerRadius={70} 
                    outerRadius={100} 
                    paddingAngle={8}
                    stroke="none"
                  >
                    {usageData.map((_, i) => (
                      <Cell key={i} fill={i === 1 ? 'hsl(var(--card-accent))' : i === 0 ? 'hsl(var(--card-blue))' : 'hsl(var(--card-orange))'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none', 
                      borderRadius: '1rem', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-10">
                <span className="text-4xl font-black">{occupancyRate}%</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Occupé</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }}
        >
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl font-bold">Activité des contrats</CardTitle>
              <CardDescription className="font-medium">Tendances des 30 derniers jours</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px] pr-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={contractActivityData}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--card-accent))" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="hsl(var(--card-accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="day" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    allowDecimals={false} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: 'none', 
                      borderRadius: '1rem', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.2)' 
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--card-accent))" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: 'hsl(var(--card-accent))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive 
                    animationDuration={1000} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Activité Récente
              </CardTitle>
              <CardDescription className="font-medium">Dernières opérations système</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity) => {
                    const IconComponent = getActivityIcon(activity.icon);
                    return (
                      <div 
                        key={activity.id} 
                        className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 hover:bg-background transition-colors group border border-transparent hover:border-border/50"
                      >
                        <div className={`p-3 rounded-xl ${getActivityColor(activity.type)} transition-transform group-hover:scale-110`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground font-medium truncate">
                            {activity.description}
                          </p>
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                          {formatTimeAgo(activity.timestamp)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                    <p className="text-muted-foreground font-medium">Aucune activité récente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Performance</CardTitle>
                <CardDescription className="font-medium">Indicateurs clés du mois</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Taux d'occupation</span>
                    <span className="text-accent">{occupancyRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-accent h-full rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Satisfaction</span>
                    <span className="text-card-green">{customerSatisfaction}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className="bg-card-green h-full rounded-full" 
                      initial={{ width: 0 }}
                      animate={{ width: `${customerSatisfaction}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Croissance revenus</span>
                    <span className={revenueDeltaPct >= 0 ? "text-card-blue" : "text-card-red"}>
                      {revenueDeltaPct >= 0 ? `+${revenueDeltaPct}%` : `${revenueDeltaPct}%`}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <motion.div 
                      className={revenueDeltaPct >= 0 ? "bg-card-blue h-full rounded-full" : "bg-card-red h-full rounded-full"} 
                      initial={{ width: 0 }}
                      animate={{ width: `${growthProgress}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Statistiques Rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  { label: "Contrats aujourd'hui", value: stats.todayContracts, color: "text-accent" },
                  { label: "Véhicules disponibles", value: stats.availableVehicles, color: "text-card-green" },
                  { label: "Véhicules loués", value: stats.rentedVehicles, color: "text-card-blue" },
                  { label: "En maintenance", value: stats.maintenanceVehicles, color: "text-card-orange" },
                  { label: "Revenus aujourd'hui", value: `${stats.todayRevenue.toLocaleString()} DH`, color: "text-accent" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground font-medium">{item.label}</span>
                    <span className={`text-lg font-black ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <motion.div 
          className="lg:col-span-2" 
          initial={{ opacity: 0, y: 12 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <QuickActions />
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Santé financière
              </CardTitle>
              <CardDescription className="font-medium">Synthèse mensuelle revenus vs charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`rounded-2xl p-4 ${netMonthlyResult >= 0 ? 'bg-card-green-bg text-card-green' : 'bg-card-red-bg text-card-red'}`}>
                <div className="text-xs uppercase tracking-widest font-bold">Résultat net</div>
                <div className="text-2xl font-black mt-1">
                  {netMonthlyResult.toLocaleString()} DH
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Revenus du mois</span>
                  <span className="font-bold">{stats.monthlyRevenue.toLocaleString()} DH</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Charges du mois</span>
                  <span className="font-bold">{monthlyCosts.toLocaleString()} DH</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taux de couverture</span>
                  <span className={`font-bold ${coverageRate >= 100 ? "text-card-green" : "text-card-orange"}`}>{coverageRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-card-orange" />
                Échéances proches
              </CardTitle>
              <CardDescription className="font-medium">Contrats qui finissent sous 7 jours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiringContracts.length > 0 ? (
                expiringContracts.map((contract) => (
                  <div key={contract.id} className="rounded-xl border border-border/50 p-3 bg-background/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{contract.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">#{contract.contractNumber}</p>
                      </div>
                      <div className={`text-xs font-black px-2 py-1 rounded-lg ${contract.daysRemaining <= 2 ? 'bg-card-red-bg text-card-red' : 'bg-card-orange-bg text-card-orange'}`}>
                        {contract.daysRemaining === 0 ? "Aujourd'hui" : `${contract.daysRemaining} j`}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Aucun contrat proche de l'échéance
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-card-blue" />
                Top clients
              </CardTitle>
              <CardDescription className="font-medium">Meilleurs clients du mois en revenu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topCustomersThisMonth.length > 0 ? (
                topCustomersThisMonth.map((customer, index) => (
                  <div key={`${customer.name}-${index}`} className="flex items-center justify-between rounded-xl border border-border/50 p-3 bg-background/50">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.contracts} contrats</p>
                    </div>
                    <div className="text-sm font-black text-card-blue">{Math.round(customer.revenue).toLocaleString()} DH</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Pas de revenus clients ce mois
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Résumé des alertes</CardTitle>
              <CardDescription className="font-medium">Points d'attention immédiate</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="p-5 rounded-[1.5rem] bg-card-red-bg text-card-red flex flex-col items-center justify-center border border-card-red/10">
                <div className="text-3xl font-black">{counts.critical || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-1">Critiques</div>
              </div>
              <div className="p-5 rounded-[1.5rem] bg-card-orange-bg text-card-orange flex flex-col items-center justify-center border border-card-orange/10">
                <div className="text-3xl font-black">{counts.warning || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-1">Alertes</div>
              </div>
              <div className="p-5 rounded-[1.5rem] bg-card-blue-bg text-card-blue flex flex-col items-center justify-center border border-card-blue/10">
                <div className="text-3xl font-black">{counts.info || 0}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest mt-1">Infos</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card flex flex-col justify-center p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-14 w-14 rounded-2xl bg-card-orange-bg flex items-center justify-center">
                <FileText className="h-7 w-7 text-card-orange" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Carburant ce mois</CardTitle>
                <CardDescription className="font-medium">Dépenses totales enregistrées</CardDescription>
              </div>
            </div>
            <div className="text-5xl font-black tracking-tighter text-foreground">
              {fuelMonthly.toLocaleString()} <span className="text-xl text-muted-foreground font-bold">DH</span>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
