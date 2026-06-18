import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  History,
  Settings2,
  AlertCircle,
  Banknote,
  CheckCircle2,
  ArrowLeftRight,
  Calculator,
  Target,
  FileDown,
  ChevronRight,
  DollarSign,
  ArrowLeft,
  BellRing,
  Landmark,
  Activity,
  ArrowRightLeft
} from "lucide-react";
import { TreasuryOverview } from "@/components/treasury/TreasuryOverview";
import { TreasuryMovements } from "@/components/treasury/TreasuryMovements";
import { TreasuryStats } from "@/components/treasury/TreasuryStats";
import { TreasurySettings as TreasurySettingsComponent } from "@/components/treasury/TreasurySettings";
import { AddMovementDialog } from "@/components/treasury/AddMovementDialog";
import { TreasuryDashboard } from "@/components/treasury/TreasuryDashboard";
import { TreasuryCharts } from "@/components/treasury/TreasuryCharts";
import { TreasuryForecast } from "@/components/treasury/TreasuryForecast";
import { TreasuryActions } from "@/components/treasury/TreasuryActions";
import { useContracts } from "@/hooks/useContracts";
import { useRepairs } from "@/hooks/useRepairs";
import { useMiscellaneousExpenses } from "@/hooks/useMiscellaneousExpenses";
import { paymentsRepository } from "@/repositories/paymentsRepository";
import { bankTransfersRepository, BankTransfer } from "@/repositories/bankTransfersRepository";
import { auditLogsRepository, AuditLogEntry } from "@/repositories/auditLogsRepository";
import { treasurySettingsRepository, TreasurySettings } from "@/repositories/treasurySettingsRepository";
import { Payment } from "@/types/payment";
import { computeContractSummary } from "@/utils/contractMath";
import { isPendingStatus } from "@/utils/chequeUtils";
import type { Contract } from "@/types/appData";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

export type TimeFilter = "day" | "week" | "month" | "year";

export type TreasuryMovementType = "recette" | "divers" | "reparation" | "transfert";

export type TreasuryMovement = {
  id: string;
  date: string;
  type: TreasuryMovementType;
  amount: number;
  paymentMethod: "Espèces" | "Virement" | "Chèque";
  reference?: string;
  description?: string;
};

type AlertLevel = "all" | "high" | "medium" | "low";

type PendingAlertCommand = {
  level?: Exclude<AlertLevel, "all">;
  alertId?: string;
  at?: number;
};

const Tresorerie = () => {
  const { toast } = useToast();
  const { contracts: allContracts, loading: contractsLoading } = useContracts();
  const { repairs, loading: repairsLoading } = useRepairs();
  const { expenses: miscExpenses, deleteExpense, loading: miscExpensesLoading } = useMiscellaneousExpenses();

  const shouldReduceMotion = useReducedMotion();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [alertLevelFilter, setAlertLevelFilter] = useState<AlertLevel>("all");
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);

  const [budgetTargets, setBudgetTargets] = useState(() => ({
    entryTarget: 120000,
    exitCap: 80000,
    minAvailable: 25000
  }));

  const [forecastThresholds, setForecastThresholds] = useState(() => ({
    urgentCheckDays: 3,
    urgentExpenseDays: 7
  }));
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<TreasurySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!settings) return;
    setBudgetTargets({
      entryTarget: settings.entryTarget,
      exitCap: settings.exitCap,
      minAvailable: settings.minAvailable
    });
    setForecastThresholds({
      urgentCheckDays: settings.urgentCheckDays,
      urgentExpenseDays: settings.urgentExpenseDays
    });
  }, [settings]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, b, a, s] = await Promise.all([
        paymentsRepository.getAll(),
        bankTransfersRepository.getAll(),
        auditLogsRepository.getAll(),
        treasurySettingsRepository.get()
      ]);
      setPayments(p);
      setBankTransfers(b);
      setAuditLogs(a);
      setSettings(s);
    } catch (error) {
      console.error("Failed to fetch treasury data", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de trésorerie",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPayment = async (p: Omit<Payment, "id">) => {
    try {
      const newPayment = await paymentsRepository.create(p);
      setPayments(prev => [newPayment, ...prev]);
      await auditLogsRepository.create({
        action: "payment_added",
        details: `Paiement reçu de ${p.customerName}`,
        amount: p.amount,
        reference: p.contractNumber
      });
      fetchData();
      toast({ title: "Succès", description: "Paiement ajouté" });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'ajout", variant: "destructive" });
    }
  };

  const handleAddTransfer = async (t: Omit<BankTransfer, "id">) => {
    try {
      const newTransfer = await bankTransfersRepository.create(t);
      setBankTransfers(prev => [newTransfer, ...prev]);
      await auditLogsRepository.create({
        action: "transfer_added",
        details: `Transfert ${t.type}`,
        amount: t.amount,
        reference: t.reference
      });
      fetchData();
      toast({ title: "Succès", description: "Transfert effectué" });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec du transfert", variant: "destructive" });
    }
  };

  const updateSettings = async (s: Partial<TreasurySettings>) => {
    try {
      const updated = await treasurySettingsRepository.update(s);
      setSettings(updated);
      toast({ title: "Succès", description: "Paramètres mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la mise à jour", variant: "destructive" });
    }
  };

  // Handle delete movement
  const handleDeleteMovement = async (movementId: string, movementType: string) => {
    try {
      switch (movementType) {
        case 'recette':
          // Delete payment
          setPayments(prev => prev.filter(p => p.id !== movementId));
          break;
        case 'divers':
          // Delete miscellaneous expense
          await deleteExpense(movementId);
          break;
        case 'reparation':
          // Delete repair payment (now in payments table)
          await paymentsRepository.delete(movementId);
          setPayments(prev => prev.filter(p => p.id !== movementId));
          break;
        case 'transfert':
          // Delete bank transfer
          setBankTransfers(prev => prev.filter(t => t.id !== movementId));
          break;
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    let totalEspeces = 0;
    let totalVirements = 0;

    // تأثير التحويلات على espèces مطابق لصفحة Recette
    (bankTransfers || []).forEach(transfer => {
      if (transfer.type === 'cash') {
        // Espèces → Banque: espèces تنقص
        totalEspeces -= transfer.amount;
      } else if (transfer.type === 'bank_to_cash') {
        // Banque → Espèces: espèces تزيد بالصافي (amount - fees) أو netAmount إن وُجد
        const net = (transfer.netAmount ?? (transfer.amount - (transfer.fees ?? 0)));
        totalEspeces += net;
      }
      // ملاحظة: تحويل Chèque → Banque لا يغيّر espèces
    });

    payments.forEach(payment => {
      // If payment is a receipt (contract) it's positive, if it's a repair payment it's negative for treasury
      const amount = payment.repairId ? -payment.amount : payment.amount;
      
      if (payment.paymentMethod === 'Espèces') totalEspeces += amount;
      else if (payment.paymentMethod === 'Virement') totalVirements += amount;
    });

    (miscExpenses || []).forEach(expense => {
      if (expense.payment_method === 'Espèces') totalEspeces -= expense.amount;
      else if (expense.payment_method === 'Virement') totalVirements -= expense.amount;
    });

    // رصيد البنك = virements + التحويلات الداخلة (cash/check) - التحويلات الخارجة (bank_to_cash)
    const bankTransfersIn = (bankTransfers || []).reduce((sum, t) =>
      (t.type === 'cash' || t.type === 'check')
        ? sum + ((t.netAmount ?? (t.amount - (t.fees ?? 0))))
        : sum, 0
    );
    const bankTransfersOut = (bankTransfers || []).reduce((sum, t) =>
      (t.type === 'bank_to_cash') ? sum + t.amount : sum, 0
    );
    const computedBankBalance = Math.max(0, totalVirements + bankTransfersIn - bankTransfersOut);

    // الشيكات غير المودعة
    const totalChecks = payments
      .filter(p => p.paymentMethod === 'Chèque' && isPendingStatus(p.checkDepositStatus))
      .reduce((sum, p) => sum + p.amount, 0);

    const clientDebts = (allContracts || []).reduce((sum, contract) => {
      const summary = computeContractSummary(contract as Contract, { advanceMode: 'field' });
      return sum + summary.reste;
    }, 0);
    const totalDivers = (miscExpenses || []).reduce((sum, exp) => sum + exp.amount, 0);
    const repairDebts = (repairs || []).reduce((sum, repair) => sum + (repair.dette || 0), 0);

    return {
      bankBalance: computedBankBalance,
      cashBalance: Math.max(0, totalEspeces),
      totalChecks,
      clientDebts,
      supplierDebts: totalDivers,
      repairDebts,
      totalAvailable: computedBankBalance + Math.max(0, totalEspeces) + totalChecks
    };
  }, [payments, allContracts, miscExpenses, bankTransfers, repairs]);

  // Build all treasury movements
  const allMovements = useMemo(() => {
    const movements: TreasuryMovement[] = [];

    // Add payments (recettes & reparations)
    (payments || []).forEach(payment => {
      movements.push({
        id: payment.id,
        date: payment.paymentDate,
        type: payment.repairId ? 'reparation' : 'recette',
        amount: payment.repairId ? -payment.amount : payment.amount,
        paymentMethod: payment.paymentMethod,
        reference: payment.repairId ? `Réparation ${payment.contractNumber}` : `Contrat ${payment.contractNumber}`,
        description: payment.customerName
      });
    });

    // Add misc expenses (divers)
    (miscExpenses || []).forEach(expense => {
      movements.push({
        id: expense.id,
        date: expense.expense_date,
        type: 'divers',
        amount: -expense.amount,
        paymentMethod: expense.payment_method as any,
        reference: expense.expense_type,
        description: expense.notes || expense.custom_expense_type
      });
    });

    // Add bank transfers
    (bankTransfers || []).forEach(transfer => {
      movements.push({
        id: transfer.id,
        date: transfer.date,
        type: 'transfert',
        amount: transfer.type === 'bank_to_cash' ? transfer.amount : -transfer.amount,
        paymentMethod: transfer.type === 'cash' ? 'Espèces' : transfer.type === 'check' ? 'Chèque' : 'Virement',
        reference: `Transfert ${transfer.type}`,
        description: transfer.reference
      });
    });

    // Sort by date desc, handling invalid dates
    return movements.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
  }, [payments, miscExpenses, repairs, bankTransfers]);

  const operationsSummary = useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthlyMovements = allMovements.filter((movement) => {
      if (!movement.date) return false;
      const d = new Date(movement.date);
      if (isNaN(d.getTime())) return false;
      return d.toISOString().slice(0, 7) === monthKey;
    });
    const entries = monthlyMovements.filter((movement) => movement.amount > 0).reduce((sum, movement) => sum + movement.amount, 0);
    const exits = Math.abs(monthlyMovements.filter((movement) => movement.amount < 0).reduce((sum, movement) => sum + movement.amount, 0));
    const pendingDebts = totals.clientDebts + totals.supplierDebts + (totals.repairDebts || 0);
    return {
      entries,
      exits,
      net: entries - exits,
      operationCount: monthlyMovements.length,
      pendingDebts
    };
  }, [allMovements, totals]);

  const budgetVsActual = useMemo(() => {
    const entryVariance = operationsSummary.entries - budgetTargets.entryTarget;
    const exitVariance = budgetTargets.exitCap - operationsSummary.exits;
    const availableVariance = totals.totalAvailable - budgetTargets.minAvailable;
    return {
      entryVariance,
      exitVariance,
      availableVariance,
      entryProgress: budgetTargets.entryTarget > 0 ? (operationsSummary.entries / budgetTargets.entryTarget) * 100 : 0,
      exitUsage: budgetTargets.exitCap > 0 ? (operationsSummary.exits / budgetTargets.exitCap) * 100 : 0
    };
  }, [operationsSummary, budgetTargets, totals.totalAvailable]);

  const treasuryAlerts = useMemo(() => {
    const alerts: { id: string; level: "high" | "medium" | "low"; title: string; description: string; action: string }[] = [];
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);

    const overdueChecks = payments.filter((payment) => {
      if (payment.paymentMethod !== "Chèque" || !isPendingStatus(payment.checkDepositStatus) || !payment.checkDepositDate) {
        return false;
      }
      return new Date(payment.checkDepositDate) < now;
    });

    const urgentChecks = payments.filter((payment) => {
      if (payment.paymentMethod !== "Chèque" || !isPendingStatus(payment.checkDepositStatus) || !payment.checkDepositDate) {
        return false;
      }
      const diff = Math.ceil((new Date(payment.checkDepositDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= forecastThresholds.urgentCheckDays;
    });

    const nearExpenses = (miscExpenses || []).filter((expense) => {
      const diff = Math.ceil((new Date(expense.expense_date).getTime() - now.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= forecastThresholds.urgentExpenseDays;
    });

    const monthlyEntries = allMovements
      .filter((movement) => {
        if (!movement.date) return false;
        const d = new Date(movement.date);
        if (isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 7) === monthKey && movement.amount > 0;
      })
      .reduce((sum, movement) => sum + movement.amount, 0);

    if (overdueChecks.length > 0) {
      alerts.push({
        id: "overdue-checks",
        level: "high",
        title: "Chèques en retard",
        description: `${overdueChecks.length} chèque(s) dépassent la date de dépôt.`,
        action: "Prioriser l'encaissement aujourd'hui"
      });
    }

    if (totals.totalAvailable < budgetTargets.minAvailable) {
      alerts.push({
        id: "low-liquidity",
        level: "high",
        title: "Liquidité sous le seuil",
        description: `Disponible ${totals.totalAvailable.toLocaleString()} DH vs seuil ${budgetTargets.minAvailable.toLocaleString()} DH.`,
        action: "Réduire les sorties non urgentes"
      });
    }

    if (monthlyEntries < budgetTargets.entryTarget * 0.7 && now.getDate() > 15) {
      alerts.push({
        id: "entries-behind",
        level: "medium",
        title: "Entrées en retard sur l'objectif",
        description: `Réalisation ${monthlyEntries.toLocaleString()} DH pour objectif ${budgetTargets.entryTarget.toLocaleString()} DH.`,
        action: "Relancer les paiements clients"
      });
    }

    if (nearExpenses.length > 0 || urgentChecks.length > 0) {
      alerts.push({
        id: "near-deadlines",
        level: "low",
        title: "Échéances proches",
        description: `${urgentChecks.length} chèque(s) urgent(s) et ${nearExpenses.length} charge(s) à venir.`,
        action: "Planifier la semaine de trésorerie"
      });
    }

    return alerts.slice(0, 4);
  }, [payments, miscExpenses, allMovements, totals.totalAvailable, budgetTargets, forecastThresholds]);

  useEffect(() => {
    const raw = localStorage.getItem("treasury:alert-command");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PendingAlertCommand;
      if (parsed.level) {
        setAlertLevelFilter(parsed.level);
      } else {
        setAlertLevelFilter("all");
      }
      setFocusedAlertId(parsed.alertId || null);
    } catch {
      setAlertLevelFilter("all");
      setFocusedAlertId(null);
    }

    localStorage.removeItem("treasury:alert-command");
  });

  const displayedAlerts = useMemo(() => {
    let filtered = treasuryAlerts;
    if (alertLevelFilter !== "all") {
      filtered = filtered.filter((alert) => alert.level === alertLevelFilter);
    }
    if (focusedAlertId) {
      filtered = filtered.filter((alert) => alert.id === focusedAlertId);
    }
    return filtered;
  }, [treasuryAlerts, alertLevelFilter, focusedAlertId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-indigo-100/40 p-4 md:p-6 safe-pt safe-pb">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border bg-card/95 shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-3xl">
                    <Wallet className="h-8 w-8 text-primary" />
                    Trésorerie
                  </CardTitle>
                  <p className="mt-2 text-muted-foreground">
                    Vue consolidée des flux, prévisions et opérations financières.
                  </p>
                </div>
                <Link to="/">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="rounded-lg border bg-emerald-50 p-3">
                  <p className="text-xs text-muted-foreground">Entrées du mois</p>
                  <p className="text-xl font-semibold text-emerald-700">+{operationsSummary.entries.toLocaleString()} DH</p>
                </div>
                <div className="rounded-lg border bg-red-50 p-3">
                  <p className="text-xs text-muted-foreground">Sorties du mois</p>
                  <p className="text-xl font-semibold text-red-700">-{operationsSummary.exits.toLocaleString()} DH</p>
                </div>
                <div className={`rounded-lg border p-3 ${operationsSummary.net >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
                  <p className="text-xs text-muted-foreground">Net mensuel</p>
                  <p className={`text-xl font-semibold ${operationsSummary.net >= 0 ? "text-blue-700" : "text-amber-700"}`}>
                    {operationsSummary.net >= 0 ? "+" : ""}{operationsSummary.net.toLocaleString()} DH
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Dettes en attente</p>
                      <p className="text-xl font-semibold text-foreground">{operationsSummary.pendingDebts.toLocaleString()} DH</p>
                    </div>
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{operationsSummary.operationCount} opérations ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.04 }}
        >
          <Card className="border bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BellRing className="h-5 w-5 text-primary" />
                Alert Center
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant={alertLevelFilter === "all" && !focusedAlertId ? "default" : "outline"} size="sm" onClick={() => { setAlertLevelFilter("all"); setFocusedAlertId(null); }}>
                  Toutes
                </Button>
                <Button variant={alertLevelFilter === "high" ? "default" : "outline"} size="sm" onClick={() => { setAlertLevelFilter("high"); setFocusedAlertId(null); }}>
                  High
                </Button>
                <Button variant={alertLevelFilter === "medium" ? "default" : "outline"} size="sm" onClick={() => { setAlertLevelFilter("medium"); setFocusedAlertId(null); }}>
                  Medium
                </Button>
                <Button variant={alertLevelFilter === "low" ? "default" : "outline"} size="sm" onClick={() => { setAlertLevelFilter("low"); setFocusedAlertId(null); }}>
                  Low
                </Button>
              </div>
              {displayedAlerts.length === 0 ? (
                <div className="rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-700">
                  Aucun signal pour ce filtre. Trésorerie sous contrôle.
                </div>
              ) : (
                displayedAlerts.map((alert) => (
                  <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{alert.title}</p>
                        <Badge
                          variant="outline"
                          className={
                            alert.level === "high"
                              ? "bg-red-100 text-red-800"
                              : alert.level === "medium"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-blue-100 text-blue-800"
                          }
                        >
                          {alert.level === "high" ? "High" : alert.level === "medium" ? "Medium" : "Low"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    <p className="text-sm font-medium text-primary">{alert.action}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
        >
          <Card className="border bg-card/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Budget vs Réalisé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Objectif entrées mensuel</p>
                  <Input
                    type="number"
                    value={budgetTargets.entryTarget}
                    onChange={(event) => setBudgetTargets((prev) => ({ ...prev, entryTarget: Math.max(0, Number(event.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Plafond sorties mensuel</p>
                  <Input
                    type="number"
                    value={budgetTargets.exitCap}
                    onChange={(event) => setBudgetTargets((prev) => ({ ...prev, exitCap: Math.max(0, Number(event.target.value) || 0) }))}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Seuil minimum disponible</p>
                  <Input
                    type="number"
                    value={budgetTargets.minAvailable}
                    onChange={(event) => setBudgetTargets((prev) => ({ ...prev, minAvailable: Math.max(0, Number(event.target.value) || 0) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-emerald-50 p-3">
                  <p className="text-xs text-muted-foreground">Entrées</p>
                  <p className="text-lg font-semibold text-emerald-700">
                    {operationsSummary.entries.toLocaleString()} / {budgetTargets.entryTarget.toLocaleString()} DH
                  </p>
                  <p className={`text-sm ${budgetVsActual.entryVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {budgetVsActual.entryVariance >= 0 ? "+" : ""}{budgetVsActual.entryVariance.toLocaleString()} DH ({budgetVsActual.entryProgress.toFixed(1)}%)
                  </p>
                </div>
                <div className="rounded-lg border bg-red-50 p-3">
                  <p className="text-xs text-muted-foreground">Sorties</p>
                  <p className="text-lg font-semibold text-red-700">
                    {operationsSummary.exits.toLocaleString()} / {budgetTargets.exitCap.toLocaleString()} DH
                  </p>
                  <p className={`text-sm ${budgetVsActual.exitVariance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {budgetVsActual.exitVariance >= 0 ? "Sous budget" : "Dépassement"}: {Math.abs(budgetVsActual.exitVariance).toLocaleString()} DH ({budgetVsActual.exitUsage.toFixed(1)}%)
                  </p>
                </div>
                <div className={`rounded-lg border p-3 ${budgetVsActual.availableVariance >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
                  <p className="text-xs text-muted-foreground">Disponible vs seuil</p>
                  <p className={`text-lg font-semibold ${budgetVsActual.availableVariance >= 0 ? "text-blue-700" : "text-amber-700"}`}>
                    {totals.totalAvailable.toLocaleString()} DH
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Écart: {budgetVsActual.availableVariance >= 0 ? "+" : ""}{budgetVsActual.availableVariance.toLocaleString()} DH
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <TreasuryDashboard totals={totals} />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <TreasuryCharts
            movements={allMovements}
            bankBalance={totals.bankBalance}
            cashBalance={totals.cashBalance}
          />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.14 }}
        >
          <TreasuryForecast
            payments={payments}
            miscExpenses={miscExpenses || []}
            contracts={allContracts || []}
          />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <TreasuryMovements
            movements={allMovements}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onDelete={handleDeleteMovement}
          />
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.22 }}
        >
          <Card className="border bg-gradient-to-r from-[hsl(var(--primary)/0.08)] via-card to-card shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lecture rapide</p>
                <p className="text-lg font-semibold text-foreground">
                  {totals.totalAvailable.toLocaleString()} DH disponibles
                </p>
                <p className="text-sm text-muted-foreground">Banque + Espèces + Chèques</p>
              </div>
              <div className="flex items-center gap-2 text-primary">
                <Landmark className="h-5 w-5" />
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.26 }}
        >
          <TreasuryActions
            onRefresh={() => {
              refetchContracts();
              refetchMisc();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Tresorerie;
