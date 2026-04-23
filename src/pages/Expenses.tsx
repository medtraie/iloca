
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, TrendingUp, DollarSign, Car, ArrowRight, AlertTriangle, CheckCircle2, Download, Sparkles, Command as CommandIcon, Archive, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useExpenses } from "@/hooks/useExpenses";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { Expense } from "@/types/expense";
import ExpenseFormDialog from "@/components/ExpenseFormDialog";
import ExpensesTable from "@/components/ExpensesTable";
import MonthlyExpenseChart from "@/components/MonthlyExpenseChart";
import ExpensesFilter from "@/components/ExpensesFilter";
import ExpenseTypePieChart from "@/components/ExpenseTypePieChart";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, LineChart, Line } from "recharts";
import VehicleSelector from "@/components/VehicleSelector";
import { motion, useReducedMotion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const Expenses = () => {
  const initialFilters = {
    type: "",
    vehicleId: "",
    fromDate: null as Date | null,
    toDate: null as Date | null,
    search: "",
  };
  const shouldReduceMotion = useReducedMotion();
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showCommandDialog, setShowCommandDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandFeedback, setCommandFeedback] = useState<{ message: string; status: "success" | "warning" } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const {
    expenses,
    monthlyExpenses,
    budgets,
    alerts,
    auditLogs,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    duplicateExpense,
    archiveExpense,
    upsertBudget
  } = useExpenses();
  const { vehicles } = useVehicles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [kpiMode, setKpiMode] = useLocalStorage<"total" | "average" | "median" | "top_type">("expenses:kpi-mode", "total");
  const [exportColumns, setExportColumns] = useLocalStorage<string[]>("expenses:export-columns", [
    "vehicle", "type", "total_cost", "monthly_cost", "start_date", "end_date", "notes", "tags"
  ]);
  const [budgetForm, setBudgetForm] = useState({
    vehicle_id: "",
    expense_type: "all",
    budget_amount: "",
    month_year: new Date().toISOString().slice(0, 7)
  });
  const [filters, setFilters] = useState(initialFilters);

  const handleVehicleSelect = (vehicle: Vehicle | null) => {
    setSelectedVehicleId(vehicle ? vehicle.id : null);
    setFilters(f => ({ ...f, vehicleId: vehicle ? vehicle.id : "" }));
  };

  const handleFiltersChange = (nextFilters: typeof filters) => {
    setFilters(nextFilters);
    if (nextFilters.vehicleId === "") {
      setSelectedVehicleId(null);
      return;
    }
    setSelectedVehicleId(nextFilters.vehicleId);
  };

  const selectedVehicle = useMemo(
    () => vehicles.find(v => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const monthlySeries = useMemo(() => {
    const grouped = monthlyExpenses.reduce<Record<string, number>>((acc, expense) => {
      if (selectedVehicleId && expense.vehicle_id !== selectedVehicleId) {
        return acc;
      }
      const key = expense.month_year.slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(expense.allocated_amount || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [monthlyExpenses, selectedVehicleId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (selectedVehicleId && e.vehicle_id !== selectedVehicleId) return false;
      if (!selectedVehicleId && filters.vehicleId && e.vehicle_id !== filters.vehicleId) return false;
      if (filters.type && e.type !== filters.type) return false;
      if (filters.fromDate && new Date(e.start_date) < filters.fromDate) return false;
      if (filters.toDate && new Date(e.end_date) > filters.toDate) return false;
      if (filters.search) {
        const entry = `${e.type} ${e.notes || ""}`.toLowerCase();
        if (!entry.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
  }, [expenses, filters, selectedVehicleId]);

  const monthlyByVehicle = useMemo(() => {
    const res: Record<string, number> = {};
    monthlyExpenses.forEach(m => {
      res[m.vehicle_id] = (res[m.vehicle_id] || 0) + Number(m.allocated_amount || 0);
    });
    return vehicles.map(v => ({
      vehicle: `${v.brand} ${v.model} ${v.year}`,
      amount: res[v.id] || 0
    }));
  }, [monthlyExpenses, vehicles]);

  const vehicleMonthlyExpenses = useMemo(() => {
    if (!selectedVehicleId) return monthlyExpenses;
    return monthlyExpenses.filter(e => e.vehicle_id === selectedVehicleId);
  }, [monthlyExpenses, selectedVehicleId]);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowExpenseDialog(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowExpenseDialog(true);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
      await deleteExpense(expenseId);
    }
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + Number(expense.total_cost || 0), 0);
  const currentMonthExpenses = vehicleMonthlyExpenses
    .filter(expense => {
      try {
        const expenseMonth = new Date(expense.month_year);
        const currentMonth = new Date();
        return expenseMonth.getMonth() === currentMonth.getMonth() &&
               expenseMonth.getFullYear() === currentMonth.getFullYear();
      } catch {
        return false;
      }
    })
    .reduce((sum, expense) => sum + Number(expense.allocated_amount || 0), 0);

  const averageExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;
  const topExpenseType = useMemo(() => {
    const counts = filteredExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.type] = (acc[expense.type] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "Aucun";
  }, [filteredExpenses]);

  const typeLabelMap: Record<string, string> = {
    vignette: "Vignette",
    assurance: "Assurance",
    visite_technique: "Visite technique",
    gps: "GPS",
    credit: "Crédit",
    reparation: "Réparation",
    Aucun: "Aucun"
  };

  const medianExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    const sorted = filteredExpenses.map((expense) => Number(expense.total_cost || 0)).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
  }, [filteredExpenses]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthKey = previousMonthDate.toISOString().slice(0, 7);
  const sameMonthLastYearDate = new Date();
  sameMonthLastYearDate.setFullYear(sameMonthLastYearDate.getFullYear() - 1);
  const sameMonthLastYearKey = sameMonthLastYearDate.toISOString().slice(0, 7);

  const monthTotals = useMemo(() => {
    return monthlyExpenses.reduce<Record<string, number>>((acc, entry) => {
      if (selectedVehicleId && entry.vehicle_id !== selectedVehicleId) {
        return acc;
      }
      const key = entry.month_year.slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(entry.allocated_amount || 0);
      return acc;
    }, {});
  }, [monthlyExpenses, selectedVehicleId]);

  const currentMonthTotal = monthTotals[currentMonthKey] || 0;
  const previousMonthTotal = monthTotals[previousMonthKey] || 0;
  const sameMonthLastYearTotal = monthTotals[sameMonthLastYearKey] || 0;
  const previousDelta = previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0;
  const yearlyDelta = sameMonthLastYearTotal > 0 ? ((currentMonthTotal - sameMonthLastYearTotal) / sameMonthLastYearTotal) * 100 : 0;

  const dynamicKpi = (() => {
    if (kpiMode === "average") {
      return { title: "KPI dynamique: Moyenne", value: `${averageExpense.toLocaleString()} DH`, subtitle: "Valeur moyenne par dépense" };
    }
    if (kpiMode === "median") {
      return { title: "KPI dynamique: Médiane", value: `${medianExpense.toLocaleString()} DH`, subtitle: "Valeur médiane des dépenses" };
    }
    if (kpiMode === "top_type") {
      return { title: "KPI dynamique: Type dominant", value: typeLabelMap[topExpenseType] || topExpenseType, subtitle: "Catégorie la plus fréquente" };
    }
    return { title: "KPI dynamique: Total", value: `${totalExpenses.toLocaleString()} DH`, subtitle: "Total selon les filtres actifs" };
  })();

  const budgetRows = useMemo(() => {
    return budgets
      .filter((budget) => budget.month_year === budgetForm.month_year)
      .map((budget) => {
        const actual = monthlyExpenses
          .filter((entry) => {
            if (entry.vehicle_id !== budget.vehicle_id) return false;
            if (entry.month_year.slice(0, 7) !== budget.month_year) return false;
            if (budget.expense_type === "all") return true;
            return entry.expense_type === budget.expense_type;
          })
          .reduce((sum, entry) => sum + Number(entry.allocated_amount || 0), 0);
        const ratio = budget.budget_amount > 0 ? (actual / budget.budget_amount) * 100 : 0;
        return {
          ...budget,
          actual,
          ratio,
          variance: actual - budget.budget_amount
        };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [budgets, monthlyExpenses, budgetForm.month_year]);

  const handleBulkArchive = async () => {
    await Promise.all(selectedExpenseIds.map((id) => archiveExpense(id)));
    setSelectedExpenseIds([]);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("Supprimer les dépenses sélectionnées ?")) return;
    await Promise.all(selectedExpenseIds.map((id) => deleteExpense(id)));
    setSelectedExpenseIds([]);
  };

  const handleBulkTypeChange = async (nextType: Expense["type"]) => {
    await Promise.all(selectedExpenseIds.map((id) => updateExpense(id, { type: nextType })));
    setSelectedExpenseIds([]);
  };

  const exportHeaderMap: Record<string, string> = {
    vehicle: "Véhicule",
    type: "Type",
    total_cost: "Coût Total",
    monthly_cost: "Coût Mensuel",
    start_date: "Date Début",
    end_date: "Date Fin",
    notes: "Notes",
    tags: "Tags"
  };

  const buildCsvExport = () => {
    const rows = (selectedExpenseIds.length > 0 ? filteredExpenses.filter(expense => selectedExpenseIds.includes(expense.id)) : filteredExpenses)
      .map((expense) => {
        const vehicleName = vehicles.find(vehicle => vehicle.id === expense.vehicle_id);
        const vehicleLabel = vehicleName ? `${vehicleName.brand} ${vehicleName.model} ${vehicleName.year}` : "Non défini";
        const valueByKey: Record<string, string | number> = {
          vehicle: vehicleLabel,
          type: typeLabelMap[expense.type] || expense.type,
          total_cost: Number(expense.total_cost || 0),
          monthly_cost: Number(expense.monthly_cost || 0),
          start_date: expense.start_date,
          end_date: expense.end_date,
          notes: expense.notes || "",
          tags: (expense.tags || []).join(" | ")
        };
        return exportColumns.map((key) => `"${String(valueByKey[key] ?? "").replaceAll('"', '""')}"`).join(",");
      });
    const header = exportColumns.map((key) => `"${exportHeaderMap[key] || key}"`).join(",");
    return [header, ...rows].join("\n");
  };

  const triggerExport = () => {
    const csv = buildCsvExport();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `expenses-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDialog(false);
  };

  const handleBudgetSave = async () => {
    if (!budgetForm.vehicle_id || !budgetForm.month_year || !budgetForm.budget_amount) {
      return;
    }
    await upsertBudget({
      vehicle_id: budgetForm.vehicle_id,
      expense_type: budgetForm.expense_type as Expense["type"] | "all",
      month_year: budgetForm.month_year,
      budget_amount: Number(budgetForm.budget_amount)
    });
    setBudgetForm((prev) => ({ ...prev, budget_amount: "" }));
  };

  const normalizeCommand = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const detectTypeFromCommand = (query: string): Expense["type"] | "" => {
    const normalized = normalizeCommand(query);
    const typeMap: Array<{ type: Expense["type"]; keywords: string[] }> = [
      { type: "assurance", keywords: ["assurance", "تامين", "تأمين"] },
      { type: "vignette", keywords: ["vignette", "ضريبة", "taxe"] },
      { type: "visite_technique", keywords: ["visite", "technique", "فحص", "تقني"] },
      { type: "gps", keywords: ["gps"] },
      { type: "credit", keywords: ["credit", "crédit", "قرض"] },
      { type: "reparation", keywords: ["reparation", "réparation", "اصلاح", "إصلاح"] },
    ];
    const found = typeMap.find((entry) =>
      entry.keywords.some((keyword) => normalized.includes(normalizeCommand(keyword)))
    );
    return found?.type || "";
  };

  const detectVehicleFromCommand = (query: string) => {
    const normalized = normalizeCommand(query);
    return vehicles.find((vehicle) => {
      const tokens = [
        vehicle.brand || "",
        vehicle.model || "",
        vehicle.registration || "",
        vehicle.immatriculation || "",
        String(vehicle.year || ""),
      ]
        .map((value) => normalizeCommand(value))
        .filter(Boolean);
      return tokens.some((token) => normalized.includes(token));
    }) || null;
  };

  const runSmartCommand = (rawCommand: string) => {
    const normalized = normalizeCommand(rawCommand);
    if (!normalized) {
      setCommandFeedback({ message: "اكتب أمرًا أولاً.", status: "warning" });
      return;
    }

    const detectedType = detectTypeFromCommand(normalized);
    const detectedVehicle = detectVehicleFromCommand(normalized);
    const isAddCommand = /(add|ajoute|ajouter|nouvelle|new|اضف|أضف|اضافة|إضافة)/.test(normalized);
    const isFilterCommand = /(filtre|filter|show|affiche|عرض|فلتر|تصفية)/.test(normalized);
    const isExportCommand = /(export|csv|excel|تصدير)/.test(normalized);
    const isResetCommand = /(reset|clear|vider|reinitial|réinitial|مسح|اعادة|إعادة)/.test(normalized);
    const isAlertsCommand = /(alert|alerte|alerts|تنبيه|تنبيهات)/.test(normalized);

    if (isResetCommand) {
      handleVehicleSelect(null);
      setFilters(initialFilters);
      setCommandFeedback({ message: "تمت إعادة تعيين الفلاتر.", status: "success" });
      setShowCommandDialog(false);
      setCommandQuery("");
      return;
    }

    if (isExportCommand) {
      setShowExportDialog(true);
      setShowCommandDialog(false);
      setCommandFeedback({ message: "تم فتح نافذة التصدير.", status: "success" });
      setCommandQuery("");
      return;
    }

    if (detectedVehicle) {
      handleVehicleSelect(detectedVehicle);
    }
    if (detectedType) {
      setFilters((prev) => ({ ...prev, type: detectedType }));
    }

    if (isAddCommand) {
      setEditingExpense(null);
      setShowExpenseDialog(true);
      setShowCommandDialog(false);
      setCommandFeedback({
        message: `تم فتح إضافة مصروف${detectedType ? ` لنوع ${typeLabelMap[detectedType]}` : ""}${detectedVehicle ? ` لسيارة ${detectedVehicle.brand} ${detectedVehicle.model}` : ""}.`,
        status: "success"
      });
      setCommandQuery("");
      return;
    }

    if (isAlertsCommand) {
      const firstAlert = alerts[0];
      if (firstAlert?.vehicle_id) {
        const alertVehicle = vehicles.find((entry) => entry.id === firstAlert.vehicle_id) || null;
        if (alertVehicle) {
          handleVehicleSelect(alertVehicle);
        }
      }
      if (firstAlert?.type) {
        setFilters((prev) => ({ ...prev, type: firstAlert.type || "" }));
      }
      setShowCommandDialog(false);
      setCommandFeedback({
        message: firstAlert ? "تم تطبيق سياق أول تنبيه نشط." : "لا توجد تنبيهات نشطة حالياً.",
        status: firstAlert ? "success" : "warning"
      });
      setCommandQuery("");
      return;
    }

    if (isFilterCommand || detectedType || detectedVehicle) {
      setShowCommandDialog(false);
      setCommandFeedback({
        message: `تم تطبيق الفلاتر${detectedType ? `: ${typeLabelMap[detectedType]}` : ""}${detectedVehicle ? ` + ${detectedVehicle.brand} ${detectedVehicle.model}` : ""}.`,
        status: "success"
      });
      setCommandQuery("");
      return;
    }

    setCommandFeedback({
      message: "لم أتعرف على الأمر. جرّب: أضف تأمين لسيارة Peugeot أو filtre assurance.",
      status: "warning"
    });
  };

  const statsCards = [
    {
      title: dynamicKpi.title,
      value: dynamicKpi.value,
      subtitle: dynamicKpi.subtitle,
      icon: DollarSign,
      iconClass: "text-[hsl(var(--primary))]",
      panelClass: "from-[hsl(var(--primary)/0.14)] to-[hsl(var(--primary)/0.04)] border-[hsl(var(--primary)/0.22)]"
    },
    {
      title: "Mois actuel",
      value: `${currentMonthExpenses.toLocaleString()} DH`,
      subtitle: "Répartition mensuelle active",
      icon: Calculator,
      iconClass: "text-[hsl(var(--primary))]",
      panelClass: "from-[hsl(var(--primary)/0.1)] to-[hsl(var(--primary)/0.03)] border-[hsl(var(--primary)/0.18)]"
    },
    {
      title: "Moyenne par dépense",
      value: `${averageExpense.toLocaleString()} DH`,
      subtitle: `${filteredExpenses.length} dépense${filteredExpenses.length > 1 ? "s" : ""}`,
      icon: TrendingUp,
      iconClass: "text-[hsl(var(--primary))]",
      panelClass: "from-[hsl(var(--primary)/0.12)] to-[hsl(var(--primary)/0.05)] border-[hsl(var(--primary)/0.2)]"
    },
    {
      title: "Type dominant",
      value: typeLabelMap[topExpenseType] || topExpenseType,
      subtitle: "Catégorie la plus fréquente",
      icon: Car,
      iconClass: "text-[hsl(var(--primary))]",
      panelClass: "from-[hsl(var(--primary)/0.11)] to-[hsl(var(--primary)/0.04)] border-[hsl(var(--primary)/0.19)]"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-100/70 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 rounded-[var(--radius)] border bg-card/90 p-6 shadow-lg backdrop-blur-sm"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-foreground">Gestion des Dépenses</h1>
              <p className="text-muted-foreground">Suivi et gestion des dépenses des véhicules et coûts mensuels</p>
              {selectedVehicle && (
                <p className="mt-2 text-sm font-medium text-primary">
                  Vue active: {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAddExpense} disabled={vehicles.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une dépense
              </Button>
              <Button variant="outline" onClick={() => setShowCommandDialog(true)}>
                <CommandIcon className="h-4 w-4 mr-2" />
                Commandes rapides
              </Button>
              <Button variant="outline" onClick={() => setShowExportDialog(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export avancé
              </Button>
              <Link to="/">
                <Button variant="outline">
                  Retour à l'accueil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Filtrer rapidement par véhicule</p>
              <VehicleSelector selectedVehicle={selectedVehicle} onVehicleSelect={handleVehicleSelect} />
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Résumé rapide</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {filteredExpenses.length} dépense{filteredExpenses.length > 1 ? "s" : ""} affichée{filteredExpenses.length > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""} enregistré{vehicles.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {vehicles.length === 0 && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-yellow-800">
                Aucun véhicule enregistré. Veuillez d'abord ajouter un véhicule avant d'ajouter des dépenses.
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.03 }}
        >
          <ExpensesFilter
            vehicles={vehicles}
            expenses={expenses}
            filters={filters}
            onChange={handleFiltersChange}
          />
        </motion.div>

        {commandFeedback && (
          <div className={`mb-4 rounded-lg border p-3 ${commandFeedback.status === "success" ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <div className="flex items-center gap-2">
              {commandFeedback.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              <p className="text-sm font-medium">{commandFeedback.message}</p>
            </div>
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparaison temporelle</CardTitle>
              <CardDescription>Comparaison du mois courant avec le mois précédent et N-1</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Mois courant</p>
                <p className="text-xl font-semibold">{currentMonthTotal.toLocaleString()} DH</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">vs Mois précédent</p>
                <p className={`text-xl font-semibold ${previousDelta >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {previousDelta.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{previousMonthTotal.toLocaleString()} DH</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">vs Même mois N-1</p>
                <p className={`text-xl font-semibold ${yearlyDelta >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {yearlyDelta.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">{sameMonthLastYearTotal.toLocaleString()} DH</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mode KPI</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={kpiMode} onValueChange={(value: "total" | "average" | "median" | "top_type") => setKpiMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="average">Moyenne</SelectItem>
                  <SelectItem value="median">Médiane</SelectItem>
                  <SelectItem value="top_type">Type dominant</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statsCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <Card
                className={`cursor-pointer border bg-gradient-to-br ${stat.panelClass}`}
                onClick={() => {
                  if (index === 3 && topExpenseType !== "Aucun") {
                    setFilters((prev) => ({ ...prev, type: topExpenseType }));
                  }
                }}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.subtitle}</p>
                  <div className="mt-2 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlySeries}>
                        <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 }}
          >
            <ExpenseTypePieChart
              expenses={filteredExpenses}
              onSliceClick={(type) => setFilters((prev) => ({ ...prev, type }))}
            />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.1 }}
          >
            <Card className="h-full border bg-card/90 shadow-sm">
              <CardHeader>
                <CardTitle>
                  {selectedVehicle
                    ? `Dépenses mensuelles pour ${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.year}`
                    : "Dépenses mensuelles par véhicule"}
                </CardTitle>
                <CardDescription>
                  {selectedVehicle
                    ? "Répartition des dépenses mensuelles pour ce véhicule"
                    : "Comparaison des dépenses mensuelles entre tous les véhicules"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedVehicle ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={[{
                        vehicle: `${selectedVehicle.brand} ${selectedVehicle.model} ${selectedVehicle.year}`,
                        amount: vehicleMonthlyExpenses.reduce((sum, m) => sum + Number(m.allocated_amount || 0), 0)
                      }]}
                      layout="vertical"
                      margin={{ left: 30, right: 12, top: 16, bottom: 16 }}
                    >
                      <XAxis type="number" tickFormatter={v => `${v.toLocaleString()} DH`} />
                      <YAxis dataKey="vehicle" type="category" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip formatter={v => `${Number(v).toLocaleString()} DH`} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" name="Coût mensuel" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : monthlyByVehicle.length === 0 ? (
                  <div className="flex h-[260px] items-center justify-center text-gray-400">
                    Données insuffisantes
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={monthlyByVehicle}
                      layout="vertical"
                      margin={{ left: 30, right: 12, top: 16, bottom: 16 }}
                      onClick={(state) => {
                        const label = String(state?.activeLabel || "");
                        const vehicle = vehicles.find(v => `${v.brand} ${v.model} ${v.year}` === label);
                        if (vehicle) {
                          handleVehicleSelect(vehicle);
                        }
                      }}
                    >
                      <XAxis type="number" tickFormatter={v => `${v.toLocaleString()} DH`} />
                      <YAxis dataKey="vehicle" type="category" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip formatter={v => `${Number(v).toLocaleString()} DH`} />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" name="Coût mensuel" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.14 }}
          className="mb-8"
        >
          <MonthlyExpenseChart monthlyExpenses={vehicleMonthlyExpenses} />
        </motion.div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Smart Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
              ) : (
                alerts.map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left ${alert.level === "critical" ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}
                    onClick={() => {
                      if (alert.vehicle_id) {
                        const vehicle = vehicles.find((entry) => entry.id === alert.vehicle_id) || null;
                        handleVehicleSelect(vehicle);
                      }
                      if (alert.type) {
                        setFilters((prev) => ({ ...prev, type: alert.type || "" }));
                      }
                    }}
                  >
                    <p className="text-sm font-semibold">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Véhicule</Label>
                  <Select value={budgetForm.vehicle_id} onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, vehicle_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Choisir le véhicule" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model} {vehicle.year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={budgetForm.expense_type} onValueChange={(value) => setBudgetForm((prev) => ({ ...prev, expense_type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="vignette">Vignette</SelectItem>
                      <SelectItem value="assurance">Assurance</SelectItem>
                      <SelectItem value="visite_technique">Visite technique</SelectItem>
                      <SelectItem value="gps">GPS</SelectItem>
                      <SelectItem value="credit">Crédit</SelectItem>
                      <SelectItem value="reparation">Réparation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Mois</Label>
                  <Input type="month" value={budgetForm.month_year} onChange={(event) => setBudgetForm((prev) => ({ ...prev, month_year: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Budget (DH)</Label>
                  <Input type="number" value={budgetForm.budget_amount} onChange={(event) => setBudgetForm((prev) => ({ ...prev, budget_amount: event.target.value }))} />
                </div>
              </div>
              <Button onClick={handleBudgetSave} className="w-full">Enregistrer budget</Button>
              <div className="space-y-2">
                {budgetRows.slice(0, 5).map((row) => {
                  const vehicle = vehicles.find((entry) => entry.id === row.vehicle_id);
                  const ratioClass = row.ratio > 100 ? "text-red-600" : row.ratio > 80 ? "text-amber-600" : "text-emerald-600";
                  return (
                    <div key={row.id} className="rounded-md border p-2 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : row.vehicle_id}</p>
                        <p className={`font-semibold ${ratioClass}`}>{row.ratio.toFixed(1)}%</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Budget {row.budget_amount.toLocaleString()} DH • Réel {row.actual.toLocaleString()} DH
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.18 }}
        >
          <Card className="border bg-card/95 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Liste des Dépenses</CardTitle>
              <CardDescription>
                Toutes les dépenses enregistrées avec détails et répartition mensuelle
                {selectedVehicle && (
                  <span className="ml-2 font-medium text-[hsl(var(--primary))]">
                    - {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              {selectedExpenseIds.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
                  <p className="text-sm font-medium">{selectedExpenseIds.length} sélectionnée(s)</p>
                  <Button size="sm" variant="outline" onClick={handleBulkArchive}>
                    <Archive className="mr-1 h-4 w-4" />
                    Archiver
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkTypeChange("assurance")}>
                    Assurance
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Supprimer
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowExportDialog(true)}>
                    <Download className="mr-1 h-4 w-4" />
                    Exporter sélection
                  </Button>
                </div>
              )}
              <ExpensesTable
                expenses={filteredExpenses}
                vehicles={vehicles}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
                onDuplicate={duplicateExpense}
                onArchive={archiveExpense}
                selectedIds={selectedExpenseIds}
                onSelectionChange={setSelectedExpenseIds}
                loading={loading}
              />
            </CardContent>
          </Card>
        </motion.div>

        <CommandDialog open={showCommandDialog} onOpenChange={setShowCommandDialog}>
          <CommandInput
            value={commandQuery}
            onValueChange={setCommandQuery}
            placeholder="Ex: أضف تأمين لسيارة Peugeot أو filtre assurance"
          />
          <CommandList>
            <CommandEmpty>Aucune commande disponible.</CommandEmpty>
            <CommandGroup heading="Assistant intelligent">
              <CommandItem onSelect={() => runSmartCommand(commandQuery)}>
                <CommandIcon className="mr-2 h-4 w-4" />
                Exécuter la commande
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => { setShowCommandDialog(false); handleAddExpense(); }}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une dépense
              </CommandItem>
              <CommandItem onSelect={() => { setShowCommandDialog(false); setFilters((prev) => ({ ...prev, type: "assurance" })); }}>
                <Sparkles className="mr-2 h-4 w-4" />
                Filtrer Assurance
              </CommandItem>
              <CommandItem onSelect={() => { setShowCommandDialog(false); setShowExportDialog(true); }}>
                <Download className="mr-2 h-4 w-4" />
                Exporter dépenses filtrées
              </CommandItem>
              <CommandItem onSelect={() => runSmartCommand("reset filters")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Réinitialiser les filtres
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Export avancé</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(exportHeaderMap).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={exportColumns.includes(key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setExportColumns((prev) => Array.from(new Set([...prev, key])));
                      } else {
                        setExportColumns((prev) => prev.filter((entry) => entry !== key));
                      }
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Button onClick={triggerExport} disabled={exportColumns.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger CSV
            </Button>
          </DialogContent>
        </Dialog>

        <ExpenseFormDialog
          open={showExpenseDialog}
          onOpenChange={setShowExpenseDialog}
          onSave={editingExpense ?
            (data) => updateExpense(editingExpense.id, data) :
            addExpense
          }
          vehicles={vehicles}
          expense={editingExpense}
        />
      </div>
    </div>
  );
};

export default Expenses;
