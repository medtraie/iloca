import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, FileText, Search, Filter, Edit, Trash2, ArrowUpRight, ArrowDownLeft, Wallet, Clock3, BellRing, Columns3, LayoutGrid, Table2, ShieldAlert, TrendingUp, Send } from "lucide-react";
import { format, differenceInDays, isWithinInterval, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Payment, CheckDepositStatus, PaymentAuditEntry, RelanceLevel } from "@/types/payment";
import { useToast } from "@/hooks/use-toast";
import { UniversalPDFExport } from "@/components/UniversalPDFExport";
import CheckEditDialog from "@/components/CheckEditDialog";
import { useRepairs } from "@/hooks/useRepairs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { applySavedViewPreset, computeChequeStats, getDelayBucket, getDelayDays, getPriorityLevel, getRiskScore, isPendingStatus, SavedViewId } from "@/utils/chequeUtils";

interface CheckRecord extends Payment {
  sourceType: "contrat" | "reparation";
  canEdit: boolean;
  riskScore: number;
}

interface BankTransfer {
  id: string;
  date: string;
  type: "cash" | "check" | "bank_to_cash";
  amount: number;
  fees: number;
  netAmount: number;
  reference?: string;
  clientName?: string;
  contractNumber?: string;
  checkDate?: string;
  checkDepositDate?: string;
  createdAt: string;
}

type UserRole = "Comptable" | "Manager";
type ViewMode = "table" | "kanban";
type SortKey = "priority" | "depositDate" | "amount" | "risk" | "delay" | "status";

const allColumns = [
  { key: "selection", label: "Sélection" },
  { key: "name", label: "Nom complet" },
  { key: "contract", label: "N° Contrat" },
  { key: "source", label: "Origine" },
  { key: "reference", label: "Référence" },
  { key: "paymentDate", label: "Date chèque" },
  { key: "depositDate", label: "Date encaissement" },
  { key: "direction", label: "Direction" },
  { key: "status", label: "Statut" },
  { key: "amount", label: "Montant" },
  { key: "delay", label: "Délai" },
  { key: "priority", label: "Priorité" },
  { key: "risk", label: "Risque" },
  { key: "timeline", label: "Timeline" },
  { key: "relance", label: "Relance" },
  { key: "actions", label: "Actions" }
];

const statusLabelClass: Record<string, string> = {
  "encaissé": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "non encaissé": "bg-amber-100 text-amber-700 border-amber-200",
  "partiellement encaissé": "bg-blue-100 text-blue-700 border-blue-200",
  "retourné": "bg-red-100 text-red-700 border-red-200"
};

const priorityLabelClass: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-muted text-foreground border-border",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200"
};

const roleViews: Record<UserRole, { id: SavedViewId; label: string }[]> = {
  Comptable: [
    { id: "all", label: "Vue globale" },
    { id: "urgents", label: "Urgents" },
    { id: "aTraiter", label: "À traiter" },
    { id: "partiels", label: "Partiels" },
    { id: "retournes", label: "Retournés" },
    { id: "encaisses", label: "Encaissés" },
    { id: "reparations", label: "Réparations" }
  ],
  Manager: [
    { id: "all", label: "Vue exécutive" },
    { id: "managerRisque", label: "Risque élevé" },
    { id: "urgents", label: "Urgences SLA" },
    { id: "retournes", label: "Retours critiques" },
    { id: "encaisses", label: "Encaissements" }
  ]
};

const Cheques = () => {
  const [payments, setPayments] = useLocalStorage<Payment[]>("payments", []);
  const [bankTransfers, setBankTransfers] = useLocalStorage<BankTransfer[]>("bankTransfers", []);
  const [notifRegistry, setNotifRegistry] = useLocalStorage<Record<string, string>>("cheques:notif-registry", {});
  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>("cheques:columns", allColumns.map((column) => column.key));
  const [selectedRole, setSelectedRole] = useLocalStorage<UserRole>("cheques:role", "Comptable");
  const [activeSavedView, setActiveSavedView] = useLocalStorage<SavedViewId>("cheques:saved-view-v2", "all");
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>("cheques:view-mode", "table");
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<CheckDepositStatus>("non encaissé");
  const [bulkDepositDate, setBulkDepositDate] = useState<string>("");
  const [bulkReturnReason, setBulkReturnReason] = useState<string>("");
  const [bulkPartialAmount, setBulkPartialAmount] = useState<string>("");
  const [escalationDays, setEscalationDays] = useLocalStorage<number>("cheques:escalation-days", 10);
  const { repairs } = useRepairs();
  const [editingCheck, setEditingCheck] = useState<Payment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkToDelete, setCheckToDelete] = useState<CheckRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [delayFilter, setDelayFilter] = useState<string>("all");
  const [sortPrimary, setSortPrimary] = useState<SortKey>("priority");
  const [sortSecondary, setSortSecondary] = useState<SortKey>("depositDate");
  const { toast } = useToast();

  const customerReturnsMap = useMemo(() => {
    return payments.reduce<Record<string, number>>((acc, payment) => {
      const key = payment.customerName.toLowerCase();
      if (payment.checkDepositStatus === "retourné") {
        acc[key] = (acc[key] || 0) + 1;
      }
      return acc;
    }, {});
  }, [payments]);

  const checkPayments = useMemo<CheckRecord[]>(() => {
    const paymentChecks: CheckRecord[] = payments
      .filter((payment) => payment.paymentMethod === "Chèque")
      .map((payment) => ({
        ...payment,
        checkDepositStatus: payment.checkDepositStatus || "non encaissé",
        relanceLevel: payment.relanceLevel || "aucune",
        relanceHistory: payment.relanceHistory || [],
        auditTrail: payment.auditTrail || [],
        sourceType: "contrat",
        canEdit: true,
        riskScore: getRiskScore(payment, customerReturnsMap[payment.customerName.toLowerCase()] || 0)
      }));

    const repairChecks: CheckRecord[] = repairs
      .filter((repair) => repair.paymentMethod === "Chèque")
      .map((repair) => {
        const paymentLike: Payment = {
          id: `repair-${repair.id}`,
          contractId: repair.vehicleId,
          contractNumber: `REP-${repair.vehicleInfo.immatriculation}`,
          customerName: `Réparation ${repair.typeReparation}`,
          amount: repair.paye,
          paymentMethod: "Chèque",
          paymentDate: repair.dateReparation,
          createdAt: repair.created_at,
          checkReference: repair.checkReference,
          checkName: repair.checkName,
          checkDepositDate: repair.checkDepositDate,
          checkDirection: "envoyé",
          checkDepositStatus: "non encaissé",
          relanceLevel: "aucune",
          relanceHistory: [],
          auditTrail: []
        };
        return {
          ...paymentLike,
          sourceType: "reparation",
          canEdit: false,
          riskScore: getRiskScore(paymentLike, 0)
        };
      });

    return [...paymentChecks, ...repairChecks];
  }, [payments, repairs, customerReturnsMap]);

  const appendAuditEntry = (payment: Payment, action: string, details?: string): PaymentAuditEntry[] => {
    const entries = payment.auditTrail || [];
    return [
      ...entries,
      {
        id: crypto.randomUUID(),
        action,
        changedAt: new Date().toISOString(),
        changedBy: selectedRole,
        details
      }
    ];
  };

  const shouldCreateTreasuryTransfer = (beforeStatus: CheckDepositStatus | undefined, afterStatus: CheckDepositStatus | undefined) => {
    return beforeStatus !== "encaissé" && afterStatus === "encaissé";
  };

  const createTreasuryTransfer = (payment: Payment) => {
    const alreadyExists = bankTransfers.some(
      (transfer) => transfer.type === "check" && transfer.reference === `AUTO-${payment.id}`
    );
    if (alreadyExists) return;
    const transfer: BankTransfer = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      type: "check",
      amount: payment.amount,
      fees: 0,
      netAmount: payment.amount,
      reference: `AUTO-${payment.id}`,
      clientName: payment.customerName,
      contractNumber: payment.contractNumber,
      checkDate: payment.paymentDate.split("T")[0],
      checkDepositDate: payment.checkDepositDate,
      createdAt: new Date().toISOString()
    };
    setBankTransfers([transfer, ...bankTransfers]);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterDate(undefined);
    setStartDate(undefined);
    setEndDate(undefined);
    setDirectionFilter("all");
    setStatusFilter("all");
    setSourceFilter("all");
    setDelayFilter("all");
    setSortPrimary("priority");
    setSortSecondary("depositDate");
  };

  const applySavedView = (viewId: SavedViewId) => {
    setActiveSavedView(viewId);
    resetFilters();
    const patch = applySavedViewPreset(viewId);
    if (patch.statusFilter) setStatusFilter(patch.statusFilter);
    if (patch.delayFilter) setDelayFilter(patch.delayFilter);
    if (patch.sourceFilter) setSourceFilter(patch.sourceFilter);
    if (patch.sortPrimary) setSortPrimary(patch.sortPrimary as SortKey);
    if (patch.sortSecondary) setSortSecondary(patch.sortSecondary as SortKey);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count += 1;
    if (filterDate) count += 1;
    if (startDate || endDate) count += 1;
    if (directionFilter !== "all") count += 1;
    if (statusFilter !== "all") count += 1;
    if (sourceFilter !== "all") count += 1;
    if (delayFilter !== "all") count += 1;
    return count;
  }, [searchTerm, filterDate, startDate, endDate, directionFilter, statusFilter, sourceFilter, delayFilter]);

  const compareValue = (check: CheckRecord, key: SortKey) => {
    if (key === "priority") {
      const rank = { critical: 5, high: 4, medium: 3, low: 2, done: 1 };
      return rank[getPriorityLevel(check)];
    }
    if (key === "depositDate") return check.checkDepositDate ? new Date(check.checkDepositDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (key === "amount") return check.amount;
    if (key === "risk") return check.riskScore;
    if (key === "delay") return getDelayDays(check);
    const rank = { "retourné": 4, "non encaissé": 3, "partiellement encaissé": 2, "encaissé": 1 };
    return rank[(check.checkDepositStatus || "non encaissé") as CheckDepositStatus];
  };

  const filteredChecks = useMemo(() => {
    const filtered = checkPayments.filter((check) => {
      const status = check.checkDepositStatus || "non encaissé";
      const matchesSearch =
        (check.checkName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (check.checkReference || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDirection = directionFilter === "all" || check.checkDirection === directionFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" ? isPendingStatus(status) : status === statusFilter);
      const matchesSource = sourceFilter === "all" || check.sourceType === sourceFilter;
      const matchesDelay = delayFilter === "all" || getDelayBucket(check) === delayFilter;
      let matchesDate = true;
      if (filterDate) {
        matchesDate = check.checkDepositDate === format(filterDate, "yyyy-MM-dd");
      } else if (startDate && endDate) {
        const checkDate = new Date(check.checkDepositDate || check.paymentDate);
        matchesDate = isWithinInterval(checkDate, { start: startDate, end: endDate });
      }
      return matchesSearch && matchesDirection && matchesStatus && matchesSource && matchesDelay && matchesDate;
    });

    return filtered.sort((a, b) => {
      const primary = compareValue(b, sortPrimary) - compareValue(a, sortPrimary);
      if (primary !== 0) return primary;
      return compareValue(b, sortSecondary) - compareValue(a, sortSecondary);
    });
  }, [checkPayments, searchTerm, directionFilter, statusFilter, sourceFilter, delayFilter, filterDate, startDate, endDate, sortPrimary, sortSecondary]);

  const stats = useMemo(() => computeChequeStats(checkPayments), [checkPayments]);

  const kanbanGroups = useMemo(() => {
    return {
      aEncaisser: filteredChecks.filter((check) => check.checkDepositStatus === "non encaissé" || check.checkDepositStatus === "partiellement encaissé"),
      aujourdHui: filteredChecks.filter((check) => getDelayBucket(check) === "today"),
      enRetard: filteredChecks.filter((check) => getDelayBucket(check) === "overdue" || check.checkDepositStatus === "retourné"),
      encaisses: filteredChecks.filter((check) => check.checkDepositStatus === "encaissé")
    };
  }, [filteredChecks]);

  const forecastRows = useMemo(() => {
    const rows: Record<string, number> = {};
    filteredChecks
      .filter((check) => isPendingStatus(check.checkDepositStatus) && check.checkDepositDate)
      .forEach((check) => {
        const dateKey = check.checkDepositDate as string;
        rows[dateKey] = (rows[dateKey] || 0) + (check.amount - (check.partiallyCollectedAmount || 0));
      });
    return Object.entries(rows)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(0, 8)
      .map(([date, amount]) => ({ date, amount }));
  }, [filteredChecks]);

  useEffect(() => {
    const now = new Date();
    const next3 = addDays(now, 3);
    const next7 = addDays(now, 7);
    const pendingChecks = checkPayments.filter((check) => isPendingStatus(check.checkDepositStatus) && check.checkDepositDate);
    pendingChecks.forEach((check) => {
      const depositDate = new Date(check.checkDepositDate as string);
      const baseKey = `${check.id}-${check.checkDepositDate}`;
      if (depositDate <= next3 && depositDate >= now && notifRegistry[`soon3-${baseKey}`] !== format(now, "yyyy-MM-dd")) {
        toast({
          title: "Alerte J-3",
          description: `Le chèque ${check.checkReference || check.id} arrive à échéance dans 3 jours ou moins.`,
          duration: 6000
        });
        setNotifRegistry({ ...notifRegistry, [`soon3-${baseKey}`]: format(now, "yyyy-MM-dd") });
      } else if (depositDate <= next7 && depositDate >= now && notifRegistry[`soon7-${baseKey}`] !== format(now, "yyyy-MM-dd")) {
        toast({
          title: "Alerte J-7",
          description: `Le chèque ${check.checkReference || check.id} arrive à échéance dans 7 jours.`,
          duration: 5000
        });
        setNotifRegistry({ ...notifRegistry, [`soon7-${baseKey}`]: format(now, "yyyy-MM-dd") });
      }
      const overdueDays = differenceInDays(now, depositDate);
      if (overdueDays >= escalationDays && notifRegistry[`escalation-${baseKey}`] !== format(now, "yyyy-MM-dd")) {
        toast({
          title: "Escalade",
          description: `Le chèque ${check.checkReference || check.id} dépasse ${escalationDays} jours de retard.`,
          variant: "destructive"
        });
        setNotifRegistry({ ...notifRegistry, [`escalation-${baseKey}`]: format(now, "yyyy-MM-dd") });
      }
    });
  }, [checkPayments, escalationDays, notifRegistry, setNotifRegistry, toast]);

  const formatPDFCell = (key: string, value: unknown) => {
    if (key === "paymentDate" || key === "checkDepositDate" || key === "checkReturnDate") {
      return value ? format(new Date(String(value)), "dd/MM/yyyy") : "-";
    }
    if (key === "amount" || key === "partiallyCollectedAmount") {
      return value ? `${Number(value).toLocaleString()} MAD` : "-";
    }
    return (value as string) || "-";
  };

  const pdfColumns = [
    { key: "checkName", label: "Nom" },
    { key: "contractNumber", label: "N° Contrat" },
    { key: "checkReference", label: "Référence" },
    { key: "paymentDate", label: "Créé" },
    { key: "checkDepositDate", label: "Prévu dépôt" },
    { key: "checkDepositStatus", label: "Statut" },
    { key: "partiallyCollectedAmount", label: "Partiel" },
    { key: "checkReturnReason", label: "Motif retour" },
    { key: "amount", label: "Montant" }
  ];

  const handleEditCheck = (check: CheckRecord) => {
    if (!check.canEdit) {
      toast({
        title: "Modification indisponible",
        description: "Les chèques liés aux réparations se modifient depuis la section Réparations.",
        variant: "destructive"
      });
      return;
    }
    setEditingCheck(check);
    setEditDialogOpen(true);
  };

  const handleSaveCheck = (updatedCheck: Payment) => {
    const before = payments.find((payment) => payment.id === updatedCheck.id);
    const nextCheck: Payment = {
      ...updatedCheck,
      relanceLevel: updatedCheck.relanceLevel || before?.relanceLevel || "aucune",
      relanceHistory: updatedCheck.relanceHistory || before?.relanceHistory || [],
      auditTrail: appendAuditEntry(updatedCheck, "édition", "Mise à jour manuelle depuis la fiche chèque")
    };
    if (before && shouldCreateTreasuryTransfer(before.checkDepositStatus, nextCheck.checkDepositStatus)) {
      createTreasuryTransfer(nextCheck);
    }
    setPayments(payments.map((payment) => (payment.id === nextCheck.id ? nextCheck : payment)));
  };

  const handleDeleteCheck = (check: CheckRecord) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCheck = () => {
    if (checkToDelete) {
      if (checkToDelete.canEdit) {
        const updatedPayments = payments.filter((payment) => payment.id !== checkToDelete.id);
        setPayments(updatedPayments);
        toast({
          title: "Supprimé",
          description: "Le chèque a été supprimé avec succès."
        });
      } else {
        toast({
          title: "Attention",
          description: "Les chèques de réparation doivent être supprimés depuis la page Réparations.",
          variant: "destructive"
        });
      }
    }
    setDeleteDialogOpen(false);
    setCheckToDelete(null);
  };

  const applyBulkActions = () => {
    if (selectedChecks.length === 0) {
      toast({ title: "Aucune sélection", description: "Sélectionnez au moins un chèque modifiable.", variant: "destructive" });
      return;
    }
    const partial = Number(bulkPartialAmount) || 0;
    const nowDate = new Date().toISOString().split("T")[0];
    const updated = payments.map((payment) => {
      if (!selectedChecks.includes(payment.id) || payment.paymentMethod !== "Chèque") return payment;
      const previousStatus = payment.checkDepositStatus;
      const nextStatus = bulkStatus;
      const nextPayment: Payment = {
        ...payment,
        checkDepositStatus: nextStatus,
        checkDepositDate: bulkDepositDate || payment.checkDepositDate || nowDate,
        checkReturnReason: nextStatus === "retourné" ? bulkReturnReason : undefined,
        checkReturnDate: nextStatus === "retourné" ? nowDate : undefined,
        partiallyCollectedAmount: nextStatus === "partiellement encaissé" ? partial : nextStatus === "encaissé" ? payment.amount : undefined,
        auditTrail: appendAuditEntry(payment, "action_groupee", `Statut ${nextStatus}`)
      };
      if (shouldCreateTreasuryTransfer(previousStatus, nextStatus)) {
        createTreasuryTransfer(nextPayment);
      }
      return nextPayment;
    });
    setPayments(updated);
    setSelectedChecks([]);
    toast({
      title: "Actions groupées appliquées",
      description: `${selectedChecks.length} chèque(s) mis à jour.`
    });
  };

  const sendRelance = (checkId: string, level: RelanceLevel) => {
    const updated = payments.map((payment) => {
      if (payment.id !== checkId) return payment;
      const history = payment.relanceHistory || [];
      return {
        ...payment,
        relanceLevel: level,
        relanceHistory: [
          ...history,
          {
            id: crypto.randomUUID(),
            level,
            sentAt: new Date().toISOString(),
            sentBy: selectedRole
          }
        ],
        auditTrail: appendAuditEntry(payment, "relance", `Relance ${level}`)
      };
    });
    setPayments(updated);
    toast({
      title: "Relance envoyée",
      description: `Relance ${level} enregistrée avec traçabilité.`
    });
  };

  const toggleColumn = (column: string) => {
    if (visibleColumns.includes(column)) {
      const next = visibleColumns.filter((item) => item !== column);
      setVisibleColumns(next.length > 0 ? next : visibleColumns);
      return;
    }
    setVisibleColumns([...visibleColumns, column]);
  };

  const canSelect = (check: CheckRecord) => check.canEdit;

  const allSelectableVisibleIds = filteredChecks.filter(canSelect).map((check) => check.id);

  const toggleSelectAllVisible = () => {
    if (allSelectableVisibleIds.length === 0) return;
    if (selectedChecks.length === allSelectableVisibleIds.length) {
      setSelectedChecks([]);
      return;
    }
    setSelectedChecks(allSelectableVisibleIds);
  };

  const toggleSelectOne = (checkId: string) => {
    setSelectedChecks((prev) => {
      if (prev.includes(checkId)) return prev.filter((id) => id !== checkId);
      return [...prev, checkId];
    });
  };

  const renderTimeline = (check: CheckRecord) => {
    const status = check.checkDepositStatus || "non encaissé";
    const depositedDone = status === "encaissé" || status === "partiellement encaissé" || status === "retourné";
    const finalLabel = status === "retourné" ? "Retourné" : "Encaissé";
    const finalDone = status === "encaissé" || status === "retourné";
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Créé</span>
        </div>
        <div className="h-px w-6 bg-border" />
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", depositedDone ? "bg-blue-500" : "bg-muted")} />
          <span>Déposé</span>
        </div>
        <div className="h-px w-6 bg-border" />
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", finalDone ? "bg-emerald-500" : status === "retourné" ? "bg-red-500" : "bg-muted")} />
          <span>{finalLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Finance & Chèques</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-1">Gestion des Chèques</h1>
            <p className="text-muted-foreground font-medium">
              Pilotage centralisé des chèques avec priorisation, relances et suivi audit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comptable">Comptable</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
              <Table2 className="h-4 w-4 mr-1" />
              Tableau
            </Button>
            <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}>
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <UniversalPDFExport
              title="Liste des Chèques"
              columns={pdfColumns}
              allData={checkPayments}
              filteredData={filteredChecks}
              filename={`cheques_${format(new Date(), "yyyy-MM-dd")}.pdf`}
              formatCell={formatPDFCell}
            />
          </div>
        </motion.div>

        <motion.div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.02 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Total chèques</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-black">{checkPayments.length}</div><p className="text-xs text-muted-foreground mt-1">dossiers suivis</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Direction</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-emerald-700 font-bold"><ArrowDownLeft className="h-4 w-4" />{checkPayments.filter((c) => c.checkDirection === "reçu").length}</div>
                <div className="flex items-center gap-1 text-indigo-700 font-bold"><ArrowUpRight className="h-4 w-4" />{checkPayments.filter((c) => c.checkDirection === "envoyé").length}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">reçus / envoyés</p>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Montant total</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-primary">{stats.totalAmount.toLocaleString()} MAD</div></CardContent></Card>
          <Card className="border-amber-200 bg-amber-50/60"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">À encaisser</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-amber-700">{stats.pendingAmount.toLocaleString()} MAD</div></CardContent></Card>
          <Card className="border-red-200 bg-red-50/60"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Retournés</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-red-700">{stats.returnedAmount.toLocaleString()} MAD</div></CardContent></Card>
          <Card className="border-emerald-200 bg-emerald-50/60"><CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Taux d'encaissement</CardTitle></CardHeader><CardContent><div className="text-2xl font-black text-emerald-700">{Math.round(stats.recoveryRate)}%</div><p className="text-xs text-muted-foreground mt-1">{stats.dueTodayCount} aujourd'hui • {stats.next3Count} sous 3 jours</p></CardContent></Card>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.03 }}
        >
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Légende SLA</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2">Critique: Retourné / Retard</div>
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">Élevé: Aujourd'hui / J-3</div>
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">Moyen: J-7</div>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2">Traité: Encaissé</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Alertes intelligentes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">J-3/J-7 automatiques et escalade.</div>
              <div className="space-y-2">
                <Label>Seuil escalade (jours)</Label>
                <Input type="number" min={1} value={escalationDays} onChange={(event) => setEscalationDays(Math.max(1, Number(event.target.value) || 1))} />
              </div>
              <p className="text-xs text-muted-foreground">Retard actuel: {stats.overdueCount} chèque(s)</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="flex flex-wrap items-center gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.04 }}>
          {roleViews[selectedRole].map((view) => (
            <Button key={view.id} variant={activeSavedView === view.id ? "default" : "outline"} size="sm" onClick={() => applySavedView(view.id)}>
              {view.label}
            </Button>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filtres, tri et colonnes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
                <div className="space-y-2 md:col-span-2">
                  <Label>Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Nom, référence, contrat, client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Filtre par jour</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{filterDate ? format(filterDate, "PPP", { locale: fr }) : "Sélectionner"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={filterDate} onSelect={(date) => { setFilterDate(date); setStartDate(undefined); setEndDate(undefined); }} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Période (Début)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "dd/MM/yyyy") : "Début"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={(date) => { setStartDate(date); setFilterDate(undefined); }} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Période (Fin)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "dd/MM/yyyy") : "Fin"}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={(date) => { setEndDate(date); setFilterDate(undefined); }} disabled={(date) => startDate ? date < startDate : false} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2"><Label>Direction</Label><Select value={directionFilter} onValueChange={setDirectionFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="reçu">Reçu</SelectItem><SelectItem value="envoyé">Envoyé</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Statut</Label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="pending">En attente</SelectItem><SelectItem value="encaissé">Encaissé</SelectItem><SelectItem value="non encaissé">Non encaissé</SelectItem><SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem><SelectItem value="retourné">Retourné</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Origine</Label><Select value={sourceFilter} onValueChange={setSourceFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem><SelectItem value="contrat">Contrats</SelectItem><SelectItem value="reparation">Réparations</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Délai</Label><Select value={delayFilter} onValueChange={setDelayFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="overdue">En retard</SelectItem><SelectItem value="today">Aujourd'hui</SelectItem><SelectItem value="next3">3 prochains jours</SelectItem><SelectItem value="next7">7 prochains jours</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2"><Label>Tri primaire</Label><Select value={sortPrimary} onValueChange={(value: SortKey) => setSortPrimary(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Priorité</SelectItem><SelectItem value="depositDate">Date encaissement</SelectItem><SelectItem value="amount">Montant</SelectItem><SelectItem value="risk">Risque</SelectItem><SelectItem value="delay">Retard</SelectItem><SelectItem value="status">Statut</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Tri secondaire</Label><Select value={sortSecondary} onValueChange={(value: SortKey) => setSortSecondary(value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">Priorité</SelectItem><SelectItem value="depositDate">Date encaissement</SelectItem><SelectItem value="amount">Montant</SelectItem><SelectItem value="risk">Risque</SelectItem><SelectItem value="delay">Retard</SelectItem><SelectItem value="status">Statut</SelectItem></SelectContent></Select></div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Columns3 className="h-4 w-4" />Colonnes visibles</Label>
                  <div className="rounded-md border p-2 max-h-28 overflow-y-auto space-y-1">
                    {allColumns.map((column) => (
                      <div className="flex items-center gap-2" key={column.key}>
                        <Checkbox checked={visibleColumns.includes(column.key)} onCheckedChange={() => toggleColumn(column.key)} />
                        <span className="text-xs">{column.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{activeFilterCount} filtre(s) actif(s)</p>
                <Button variant="outline" onClick={resetFilters}>Réinitialiser</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.06 }}>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Prévision de trésorerie (chèques à venir)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {forecastRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun flux prévisionnel sur la période.</p>
              ) : (
                forecastRows.map((row) => (
                  <div key={row.date} className="flex items-center justify-between rounded border p-2">
                    <span className="text-sm">{format(new Date(row.date), "dd MMM yyyy", { locale: fr })}</span>
                    <span className="font-semibold">{row.amount.toLocaleString()} MAD</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.07 }}>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Actions groupées ({selectedChecks.length})</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={bulkStatus} onValueChange={(value: CheckDepositStatus) => setBulkStatus(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non encaissé">Non encaissé</SelectItem>
                    <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                    <SelectItem value="encaissé">Encaissé</SelectItem>
                    <SelectItem value="retourné">Retourné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Date d'encaissement</Label><Input type="date" value={bulkDepositDate} onChange={(e) => setBulkDepositDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Montant partiel</Label><Input type="number" min="0" step="0.01" value={bulkPartialAmount} onChange={(e) => setBulkPartialAmount(e.target.value)} /></div>
              <div className="space-y-2"><Label>Motif retour</Label><Input value={bulkReturnReason} onChange={(e) => setBulkReturnReason(e.target.value)} placeholder="Motif si retourné" /></div>
              <div className="flex items-end"><Button className="w-full" onClick={applyBulkActions}>Appliquer</Button></div>
            </CardContent>
          </Card>
        </motion.div>

        {viewMode === "kanban" ? (
          <motion.div className="grid gap-4 lg:grid-cols-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
            {[
              { key: "aEncaisser", title: "À encaisser", data: kanbanGroups.aEncaisser },
              { key: "aujourdHui", title: "Aujourd'hui", data: kanbanGroups.aujourdHui },
              { key: "enRetard", title: "En retard", data: kanbanGroups.enRetard },
              { key: "encaisses", title: "Encaissés", data: kanbanGroups.encaisses }
            ].map((column) => (
              <Card key={column.key}>
                <CardHeader><CardTitle className="text-base">{column.title} ({column.data.length})</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {column.data.slice(0, 15).map((check) => (
                    <div key={check.id} className="rounded border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{check.checkReference || "-"}</p>
                          <p className="text-xs text-muted-foreground">{check.customerName}</p>
                        </div>
                        <Badge className={statusLabelClass[check.checkDepositStatus || "non encaissé"]}>{check.checkDepositStatus || "non encaissé"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{check.amount.toLocaleString()} MAD • score {check.riskScore}</div>
                      {renderTimeline(check)}
                    </div>
                  ))}
                  {column.data.length === 0 && <p className="text-sm text-muted-foreground">Aucun élément</p>}
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <>
            <motion.div className="md:hidden space-y-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
              {filteredChecks.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Aucun chèque trouvé</CardContent></Card>
              ) : (
                filteredChecks.map((check) => (
                  <Card key={check.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{check.checkName || "-"}</p>
                          <p className="text-xs text-muted-foreground">{check.contractNumber} • {check.checkReference || "-"}</p>
                        </div>
                        <Badge className={statusLabelClass[check.checkDepositStatus || "non encaissé"]}>{check.checkDepositStatus || "non encaissé"}</Badge>
                      </div>
                      <div className="text-sm">{check.amount.toLocaleString()} MAD</div>
                      <div className="text-xs text-muted-foreground">Risque {check.riskScore} • {getDelayDays(check)} j</div>
                      {renderTimeline(check)}
                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>

            <motion.div className="hidden md:block" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Liste des chèques ({filteredChecks.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {visibleColumns.includes("selection") && (
                            <TableHead>
                              <Checkbox checked={allSelectableVisibleIds.length > 0 && selectedChecks.length === allSelectableVisibleIds.length} onCheckedChange={toggleSelectAllVisible} />
                            </TableHead>
                          )}
                          {visibleColumns.includes("name") && <TableHead>Nom complet</TableHead>}
                          {visibleColumns.includes("contract") && <TableHead>N° Contrat</TableHead>}
                          {visibleColumns.includes("source") && <TableHead>Origine</TableHead>}
                          {visibleColumns.includes("reference") && <TableHead>Référence</TableHead>}
                          {visibleColumns.includes("paymentDate") && <TableHead>Date chèque</TableHead>}
                          {visibleColumns.includes("depositDate") && <TableHead>Date encaissement</TableHead>}
                          {visibleColumns.includes("direction") && <TableHead>Direction</TableHead>}
                          {visibleColumns.includes("status") && <TableHead>Statut</TableHead>}
                          {visibleColumns.includes("amount") && <TableHead>Montant</TableHead>}
                          {visibleColumns.includes("delay") && <TableHead>Délai</TableHead>}
                          {visibleColumns.includes("priority") && <TableHead>Priorité</TableHead>}
                          {visibleColumns.includes("risk") && <TableHead>Score risque</TableHead>}
                          {visibleColumns.includes("timeline") && <TableHead>Timeline</TableHead>}
                          {visibleColumns.includes("relance") && <TableHead>Relance</TableHead>}
                          {visibleColumns.includes("actions") && <TableHead>Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredChecks.length === 0 ? (
                          <TableRow><TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">Aucun chèque trouvé</TableCell></TableRow>
                        ) : (
                          filteredChecks.map((check) => {
                            const priority = getPriorityLevel(check);
                            const status = check.checkDepositStatus || "non encaissé";
                            const delayDays = getDelayDays(check);
                            return (
                              <TableRow key={`${check.sourceType}-${check.id}`}>
                                {visibleColumns.includes("selection") && (
                                  <TableCell>
                                    <Checkbox checked={selectedChecks.includes(check.id)} onCheckedChange={() => toggleSelectOne(check.id)} disabled={!canSelect(check)} />
                                  </TableCell>
                                )}
                                {visibleColumns.includes("name") && <TableCell className="font-medium">{check.checkName || "-"}</TableCell>}
                                {visibleColumns.includes("contract") && <TableCell>{check.contractNumber}</TableCell>}
                                {visibleColumns.includes("source") && <TableCell><Badge variant="outline">{check.sourceType === "reparation" ? "Réparation" : "Contrat"}</Badge></TableCell>}
                                {visibleColumns.includes("reference") && <TableCell>{check.checkReference || "-"}</TableCell>}
                                {visibleColumns.includes("paymentDate") && <TableCell>{format(new Date(check.paymentDate), "dd/MM/yyyy")}</TableCell>}
                                {visibleColumns.includes("depositDate") && <TableCell>{check.checkDepositDate ? format(new Date(check.checkDepositDate), "dd/MM/yyyy") : "-"}</TableCell>}
                                {visibleColumns.includes("direction") && <TableCell><Badge className={check.checkDirection === "reçu" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-indigo-100 text-indigo-700 border-indigo-200"}>{check.checkDirection || "reçu"}</Badge></TableCell>}
                                {visibleColumns.includes("status") && <TableCell><Badge className={statusLabelClass[status]}>{status}</Badge></TableCell>}
                                {visibleColumns.includes("amount") && <TableCell className="font-semibold">{check.amount.toLocaleString()} MAD</TableCell>}
                                {visibleColumns.includes("delay") && <TableCell>{delayDays > 0 ? `Retard ${delayDays} j` : delayDays === 0 ? "Aujourd'hui" : `J${delayDays}`}</TableCell>}
                                {visibleColumns.includes("priority") && <TableCell><Badge className={priorityLabelClass[priority]}>{priority}</Badge></TableCell>}
                                {visibleColumns.includes("risk") && <TableCell><Badge variant="outline">{check.riskScore}/100</Badge></TableCell>}
                                {visibleColumns.includes("timeline") && <TableCell>{renderTimeline(check)}</TableCell>}
                                {visibleColumns.includes("relance") && (
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button variant="outline" size="sm" className="h-7 px-2" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "1ère")}>1</Button>
                                      <Button variant="outline" size="sm" className="h-7 px-2" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "2ème")}>2</Button>
                                      <Button variant="outline" size="sm" className="h-7 px-2" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "finale")}>F</Button>
                                    </div>
                                  </TableCell>
                                )}
                                {visibleColumns.includes("actions") && (
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button variant="ghost" size="sm" onClick={() => handleEditCheck(check)} className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700" title="Modifier" disabled={!check.canEdit}><Edit className="h-4 w-4" /></Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCheck(check)} className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-700" title="Supprimer" disabled={!check.canEdit}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        <CheckEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} check={editingCheck} onSave={handleSaveCheck} />
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce chèque ? Cette action est irréversible.
                {checkToDelete && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="font-medium">{checkToDelete.checkName}</p>
                    <p className="text-sm text-muted-foreground">Référence: {checkToDelete.checkReference}</p>
                    <p className="text-sm text-muted-foreground">Montant: {checkToDelete.amount.toLocaleString()} MAD</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCheck} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Cheques;
