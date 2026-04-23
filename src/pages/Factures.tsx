import React, { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { FileText, List, Sparkles, AlertTriangle, CircleCheck, Clock3 } from "lucide-react";
import { useInvoices } from "@/hooks/useInvoices";

type InvoiceRole = "Comptable" | "Manager";

const Factures = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRole, setSelectedRole] = useState<InvoiceRole>("Comptable");
  const { invoices } = useInvoices();

  const headerStats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalTTC, 0);
    const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
    const pendingCount = invoices.filter((invoice) => invoice.status === "pending").length;
    const overdueCount = invoices.filter((invoice) => invoice.status === "overdue").length;
    return {
      count: invoices.length,
      totalAmount,
      paidCount,
      pendingCount,
      overdueCount
    };
  }, [invoices]);

  const handleInvoiceCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab("list");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background p-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="bg-card rounded-xl border shadow-sm p-6 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Finance & Facturation</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-2 flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Gestion des Factures
          </h1>
          <p className="text-muted-foreground">
            Créez, suivez et pilotez vos factures avec une expérience optimisée.
          </p>
          <div className="mt-4 w-[180px]">
            <Select value={selectedRole} onValueChange={(value: InvoiceRole) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comptable">Comptable</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Factures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{headerStats.count}</div>
              <p className="text-xs text-muted-foreground mt-1">documents enregistrés</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Montant total TTC</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">{headerStats.totalAmount.toFixed(2)} DH</div>
              <p className="text-xs text-muted-foreground mt-1">sur tout l'historique</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><CircleCheck className="h-4 w-4" />Payées</CardTitle>
            </CardHeader>
            <CardContent><div className="text-2xl font-black text-emerald-700">{headerStats.paidCount}</div></CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Clock3 className="h-4 w-4" />En attente / retard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-700">{headerStats.pendingCount + headerStats.overdueCount}</div>
              <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{headerStats.overdueCount} en retard</p>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-2 mb-6">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Créer une facture
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Liste des factures
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="pt-2">
            <InvoiceForm onInvoiceCreated={handleInvoiceCreated} />
          </TabsContent>
          
          <TabsContent value="list" className="pt-2">
            <InvoicesTable key={refreshKey} userRole={selectedRole} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Factures;
