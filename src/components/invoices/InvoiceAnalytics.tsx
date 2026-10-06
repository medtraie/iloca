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
  Legend
} from "recharts";
import { Invoice } from "@/hooks/useInvoices";
import { TrendingUp, PieChart as PieChartIcon, CreditCard, Layers } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

interface InvoiceAnalyticsProps {
  invoices: Invoice[];
}

const STATUS_COLORS: Record<string, string> = {
  Payée: "#10b981", // emerald-500
  "En attente": "#f59e0b", // amber-500
  "En retard": "#ef4444" // red-500
};

const PAYMENT_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export const InvoiceAnalytics: React.FC<InvoiceAnalyticsProps> = ({ invoices }) => {
  // Monthly Facturé vs Encaissé Trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => subMonths(now, 5 - i));

    return months.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = format(monthDate, "MMM yyyy", { locale: fr });

      const monthInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.invoiceDate);
        return invDate >= monthStart && invDate <= monthEnd;
      });

      const totalFactured = monthInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
      const totalPaid = monthInvoices
        .filter((inv) => inv.status === "paid")
        .reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
      const totalPending = monthInvoices
        .filter((inv) => inv.status !== "paid")
        .reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

      return {
        month: monthName,
        Facturé: totalFactured,
        Encaissé: totalPaid,
        Attente: totalPending
      };
    });
  }, [invoices]);

  // Status breakdown pie data
  const statusPieData = useMemo(() => {
    const paidCount = invoices.filter((inv) => inv.status === "paid").length;
    const pendingCount = invoices.filter((inv) => inv.status === "pending").length;
    const overdueCount = invoices.filter((inv) => inv.status === "overdue").length;

    return [
      { name: "Payée", value: paidCount },
      { name: "En attente", value: pendingCount },
      { name: "En retard", value: overdueCount }
    ].filter((item) => item.value > 0);
  }, [invoices]);

  // Payment method breakdown
  const paymentMethodData = useMemo(() => {
    const methodsMap: Record<string, number> = {};
    invoices.forEach((inv) => {
      const method = inv.paymentMethod || "Autre";
      methodsMap[method] = (methodsMap[method] || 0) + (inv.totalTTC || 0);
    });

    return Object.entries(methodsMap).map(([name, value]) => ({
      name,
      value
    }));
  }, [invoices]);

  return (
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      {/* Monthly Bar Chart (Takes 2 columns) */}
      <Card className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
        <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-black flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Évolution du Chiffre d'Affaires & Encaissements (MAD)
            </CardTitle>
            <p className="text-xs text-muted-foreground font-medium">
              Comparatif des montants facturés vs encaissés sur 6 mois.
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
                formatter={(value: number) => [`${value.toLocaleString()} MAD`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", fontWeight: "700" }} />
              <Bar dataKey="Facturé" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="Encaissé" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Donut & Payment Breakdowns Column */}
      <div className="space-y-4">
        {/* Status Pie Chart */}
        <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-emerald-500" />
              Répartition des Statuts de Factures
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[170px] w-full flex items-center justify-center">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#64748b"} />
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

        {/* Payment Method Breakdown */}
        <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-md shadow-xs p-5">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-500" />
              Volume par Mode de Règlement
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 space-y-2">
            {paymentMethodData.map((item, idx) => {
              const totalSum = paymentMethodData.reduce((acc, curr) => acc + curr.value, 0);
              const percentage = totalSum > 0 ? Math.round((item.value / totalSum) * 100) : 0;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-foreground flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length] }}
                      />
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">
                      {item.value.toLocaleString()} MAD ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default InvoiceAnalytics;
