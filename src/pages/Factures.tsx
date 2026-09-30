import React, { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import InvoiceForm from "@/components/InvoiceForm";
import InvoicesTable from "@/components/InvoicesTable";
import { motion } from "framer-motion";
import {
  FileText,
  List,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  Percent,
  Receipt
} from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";

type InvoiceRole = "Comptable" | "Manager";

const Factures: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("list");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRole, setSelectedRole] = useState<InvoiceRole>("Comptable");
  const { invoices } = useInvoices();

  const headerStats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + (invoice.totalTTC || 0), 0);
    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
    const paidAmount = paidInvoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);
    const pendingCount = invoices.filter((invoice) => invoice.status === "pending").length;
    const overdueCount = invoices.filter((invoice) => invoice.status === "overdue").length;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const recoveryRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 100;

    return {
      count: invoices.length,
      totalAmount,
      paidCount: paidInvoices.length,
      paidAmount,
      pendingCount,
      overdueCount,
      remainingAmount,
      recoveryRate
    };
  }, [invoices]);

  const handleInvoiceCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab("list");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background p-3 sm:p-6 pb-24 safe-pt safe-pb max-w-7xl mx-auto space-y-6">
      {/* 2026 Enterprise Cockpit Header */}
      <motion.div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-card via-card/90 to-background border border-border/60 shadow-xs relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-black uppercase tracking-wider text-primary">
              Facturation Légale & Recouvrement 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-2">
            Gestion des <span className="text-primary">Factures</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
            Émission, suivi des encaissements, TVA, conformité ICE et relances automatiques.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-2">
              Vue :
            </span>
            <Select value={selectedRole} onValueChange={(value: InvoiceRole) => setSelectedRole(value)}>
              <SelectTrigger className="w-[130px] h-9 rounded-xl border-none bg-card font-bold text-xs shadow-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                <SelectItem value="Comptable" className="font-bold text-xs">Comptable</SelectItem>
                <SelectItem value="Manager" className="font-bold text-xs">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-muted hidden sm:flex"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>

          <Button
            onClick={() => setActiveTab(activeTab === "create" ? "list" : "create")}
            className="rounded-2xl h-11 px-5 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            {activeTab === "create" ? (
              <>
                <List className="w-4 h-4 mr-1.5" />
                Voir la Liste
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                Nouvelle Facture
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Telemetry Strip 2026 */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-border/60 bg-card shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Facturé TTC
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground">
            {headerStats.totalAmount.toLocaleString()} MAD
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1">
            {headerStats.count} facture{headerStats.count > 1 ? "s" : ""} au grand livre
          </p>
        </Card>

        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/5 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Règlements Reçus
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {headerStats.paidAmount.toLocaleString()} MAD
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1">
            {headerStats.paidCount} payée{headerStats.paidCount > 1 ? "s" : ""} ({headerStats.recoveryRate}%)
          </p>
        </Card>

        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-amber-500/20 bg-amber-500/5 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              En Attente
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
            {headerStats.remainingAmount.toLocaleString()} MAD
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1">
            {headerStats.pendingCount} en attente d'encaissement
          </p>
        </Card>

        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-red-500/20 bg-red-500/5 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Factures Échues
            </span>
            <div className="p-2 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
            {headerStats.overdueCount}
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1">
            {headerStats.overdueCount > 0 ? "Relance requise" : "Aucun retard de paiement"}
          </p>
        </Card>
      </motion.div>

      {/* Main Content Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/50">
            <TabsTrigger
              value="list"
              className="rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <List className="h-4 w-4" />
              Grand Livre des Factures
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="rounded-xl font-bold text-xs px-4 py-2 flex items-center gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Créer une Facture
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-0 focus-visible:ring-0">
          <InvoicesTable key={refreshKey} userRole={selectedRole} />
        </TabsContent>

        <TabsContent value="create" className="mt-0 focus-visible:ring-0">
          <div className="p-4 sm:p-6 bg-card rounded-3xl border border-border/60 shadow-xs">
            <InvoiceForm onInvoiceCreated={handleInvoiceCreated} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile Android FAB */}
      <div className="fixed bottom-20 right-5 z-40 lg:hidden">
        <Button
          onClick={() => setActiveTab(activeTab === "create" ? "list" : "create")}
          className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center p-0 hover:scale-105 active:scale-95 transition-transform"
          title="Action Facture"
        >
          {activeTab === "create" ? <List className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
        </Button>
      </div>
    </div>
  );
};

export default Factures;
