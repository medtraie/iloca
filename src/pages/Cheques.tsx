import { useState, useMemo, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { CalendarIcon, FileText, Search, Filter, Edit, Trash2, ArrowUpRight, ArrowDownLeft, Wallet, Clock3, BellRing, Columns3, LayoutGrid, Table2, ShieldAlert, TrendingUp, Send, Sparkles } from "lucide-react";
import { format, differenceInDays, isWithinInterval, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Payment, CheckDepositStatus, PaymentAuditEntry, RelanceLevel } from "@/types/payment";
import { paymentsRepository } from "@/repositories/paymentsRepository";
import { bankTransfersRepository } from "@/repositories/bankTransfersRepository";
import { useToast } from "@/hooks/use-toast";
import { UniversalPDFExport } from "@/components/UniversalPDFExport";
import CheckEditDialog from "@/components/CheckEditDialog";
import { useRepairs } from "@/hooks/useRepairs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { applySavedViewPreset, computeChequeStats, getDelayBucket, getDelayDays, getPriorityLevel, getRiskScore, isPendingStatus, SavedViewId } from "@/utils/chequeUtils";
import ChequeStatsCards from "@/components/ChequeStatsCards";
import ChequesFilter from "@/components/ChequesFilter";
import ChequesTable, { CheckRecord } from "@/components/ChequesTable";
import ChequesKanban from "@/components/ChequesKanban";

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
  const isMobile = useIsMobile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankTransfers, setBankTransfers] = useState<BankTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [paymentsData, bankTransfersData] = await Promise.all([
          paymentsRepository.getAll(),
          bankTransfersRepository.getAll()
        ]);
        setPayments(paymentsData);
        setBankTransfers(bankTransfersData as BankTransfer[]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de récupérer les données depuis Supabase.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

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

  const createTreasuryTransfer = async (payment: Payment) => {
    const alreadyExists = bankTransfers.some(
      (transfer) => transfer.type === "check" && transfer.reference === `AUTO-${payment.id}`
    );
    if (alreadyExists) return;
    const transfer: Omit<BankTransfer, "id" | "createdAt"> = {
      date: new Date().toISOString().split("T")[0],
      type: "check",
      amount: payment.amount,
      fees: 0,
      netAmount: payment.amount,
      reference: `AUTO-${payment.id}`,
      clientName: payment.customerName,
      contractNumber: payment.contractNumber,
      checkDate: payment.paymentDate.split("T")[0],
      checkDepositDate: payment.checkDepositDate
    };
    
    try {
      const newTransfer = await bankTransfersRepository.create(transfer);
      setBankTransfers([newTransfer, ...bankTransfers]);
    } catch (error) {
      console.error("Error creating treasury transfer:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le virement bancaire.",
        variant: "destructive"
      });
    }
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

  const handleSaveCheck = async (updatedCheck: Payment) => {
    const before = payments.find((payment) => payment.id === updatedCheck.id);
    const nextCheck: Payment = {
      ...updatedCheck,
      relanceLevel: updatedCheck.relanceLevel || before?.relanceLevel || "aucune",
      relanceHistory: updatedCheck.relanceHistory || before?.relanceHistory || [],
      auditTrail: appendAuditEntry(updatedCheck, "édition", "Mise à jour manuelle depuis la fiche chèque")
    };

    try {
      const savedCheck = await paymentsRepository.update(nextCheck.id, nextCheck);
      
      if (before && shouldCreateTreasuryTransfer(before.checkDepositStatus, savedCheck.checkDepositStatus)) {
        await createTreasuryTransfer(savedCheck);
      }
      
      setPayments(payments.map((payment) => (payment.id === savedCheck.id ? savedCheck : payment)));
      toast({
        title: "Mis à jour",
        description: "Le chèque a été mis à jour avec succès."
      });
    } catch (error) {
      console.error("Error saving check:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le chèque.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCheck = (check: CheckRecord) => {
    setCheckToDelete(check);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCheck = async () => {
    if (checkToDelete) {
      if (checkToDelete.canEdit) {
        try {
          await paymentsRepository.delete(checkToDelete.id);
          const updatedPayments = payments.filter((payment) => payment.id !== checkToDelete.id);
          setPayments(updatedPayments);
          toast({
            title: "Supprimé",
            description: "Le chèque a été supprimé avec succès."
          });
        } catch (error) {
          console.error("Error deleting check:", error);
          toast({
            title: "Erreur",
            description: "Impossible de supprimer le chèque.",
            variant: "destructive"
          });
        }
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

  const applyBulkActions = async () => {
    if (selectedChecks.length === 0) {
      toast({ title: "Aucune sélection", description: "Sélectionnez au moins un chèque modifiable.", variant: "destructive" });
      return;
    }
    const partial = Number(bulkPartialAmount) || 0;
    const nowDate = new Date().toISOString().split("T")[0];
    
    try {
      const updatedPayments = await Promise.all(payments.map(async (payment) => {
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
        
        const savedPayment = await paymentsRepository.update(payment.id, nextPayment);
        
        if (shouldCreateTreasuryTransfer(previousStatus, nextStatus)) {
          await createTreasuryTransfer(savedPayment);
        }
        return savedPayment;
      }));
      
      setPayments(updatedPayments);
      setSelectedChecks([]);
      toast({
        title: "Actions groupées appliquées",
        description: `${selectedChecks.length} chèque(s) mis à jour.`
      });
    } catch (error) {
      console.error("Error applying bulk actions:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'appliquer les actions groupées.",
        variant: "destructive"
      });
    }
  };

  const sendRelance = async (checkId: string, level: RelanceLevel) => {
    const payment = payments.find(p => p.id === checkId);
    if (!payment) return;

    const history = payment.relanceHistory || [];
    const updatedPayment: Payment = {
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

    try {
      const savedPayment = await paymentsRepository.update(checkId, updatedPayment);
      setPayments(payments.map((p) => (p.id === checkId ? savedPayment : p)));
      toast({
        title: "Relance envoyée",
        description: `Relance ${level} enregistrée avec traçabilité.`
      });
    } catch (error) {
      console.error("Error sending relance:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la relance.",
        variant: "destructive"
      });
    }
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
    <div className="w-full min-h-screen p-2 sm:p-4 lg:p-6 pb-24 space-y-6 transition-all bg-gradient-to-b from-background via-background/95 to-background safe-pt safe-pb">
      <div className="space-y-6">
        {/* Top Header Card */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-card via-card/90 to-background border border-border/60 shadow-xs relative overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                Trésorerie & Portefeuille Chèques 2026
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Gestion du <span className="text-primary">Portefeuille Chèques</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-1">
              Pilotage centralisé, échéancier d'encaissement, scoring de risque et traçabilité bancaire.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 z-10">
            <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-2">
                Rôle :
              </span>
              <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                <SelectTrigger className="w-[130px] h-9 rounded-xl border-none bg-card font-bold text-xs shadow-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                  <SelectItem value="Comptable" className="font-bold text-xs">Comptable</SelectItem>
                  <SelectItem value="Manager" className="font-bold text-xs">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/40 p-1 rounded-2xl border border-border/50 flex items-center gap-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-xl font-bold text-xs h-9"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4 mr-1.5" />
                Tableau
              </Button>
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                className="rounded-xl font-bold text-xs h-9"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" />
                Kanban
              </Button>
            </div>
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

        {/* 2026 Telemetry Stats Cards */}
        <ChequeStatsCards
          totalCount={checkPayments.length}
          receivedCount={checkPayments.filter((c) => c.checkDirection === "reçu").length}
          sentCount={checkPayments.filter((c) => c.checkDirection === "envoyé").length}
          stats={stats}
          onFilterClick={(filterId) => {
            if (filterId === "returned") applySavedView("retournes");
            if (filterId === "pending") applySavedView("urgents");
            if (filterId === "settled") applySavedView("encaisses");
            if (filterId === "total") applySavedView("all");
          }}
        />

        {/* SLA & Smart Alerts Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Légende SLA & Priorités d'Encaissement
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-red-700 dark:text-red-300 font-semibold">
                <p className="font-bold text-xs">Critique</p>
                <p className="text-[11px] opacity-80 mt-0.5">Retourné / Retard</p>
              </div>
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300 font-semibold">
                <p className="font-bold text-xs">Élevé</p>
                <p className="text-[11px] opacity-80 mt-0.5">Aujourd'hui / J-3</p>
              </div>
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-700 dark:text-blue-300 font-semibold">
                <p className="font-bold text-xs">Moyen</p>
                <p className="text-[11px] opacity-80 mt-0.5">Échéance J-7</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300 font-semibold">
                <p className="font-bold text-xs">Traité</p>
                <p className="text-[11px] opacity-80 mt-0.5">Encaissé avec succès</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <BellRing className="h-4 w-4 text-amber-500" />
                Alertes & Escalade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Seuil d'escalade (jours de retard)</Label>
                <Input
                  type="number"
                  min={1}
                  value={escalationDays}
                  onChange={(event) => setEscalationDays(Math.max(1, Number(event.target.value) || 1))}
                  className="rounded-xl h-9 text-xs font-bold border-border/60"
                />
              </div>
              <p className="text-xs font-bold text-red-500">
                ⚠️ {stats.overdueCount} chèque(s) dépassent le délai limite
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Forecast & Bulk Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Prévision Trésorerie (7 jours)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-48 overflow-y-auto">
              {forecastRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center font-medium">
                  Aucun flux prévisionnel sur la période.
                </p>
              ) : (
                forecastRows.map((row) => (
                  <div key={row.date} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-2.5 text-xs">
                    <span className="font-semibold text-muted-foreground">{format(new Date(row.date), "dd MMM yyyy", { locale: fr })}</span>
                    <span className="font-black text-primary">{row.amount.toLocaleString()} MAD</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Send className="h-4 w-4 text-primary" />
                Actions Groupées ({selectedChecks.length} chèque(s) sélectionné(s))
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Statut</Label>
                <Select value={bulkStatus} onValueChange={(value: CheckDepositStatus) => setBulkStatus(value)}>
                  <SelectTrigger className="h-9 rounded-xl border-border/60 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="non encaissé">Non encaissé</SelectItem>
                    <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                    <SelectItem value="encaissé">Encaissé</SelectItem>
                    <SelectItem value="retourné">Retourné</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Date d'encaissement</Label>
                <Input type="date" value={bulkDepositDate} onChange={(e) => setBulkDepositDate(e.target.value)} className="h-9 rounded-xl border-border/60 text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Montant partiel</Label>
                <Input type="number" min="0" step="0.01" value={bulkPartialAmount} onChange={(e) => setBulkPartialAmount(e.target.value)} className="h-9 rounded-xl border-border/60 text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-muted-foreground">Motif retour</Label>
                <Input value={bulkReturnReason} onChange={(e) => setBulkReturnReason(e.target.value)} placeholder="Motif si retourné" className="h-9 rounded-xl border-border/60 text-xs font-bold" />
              </div>
              <div>
                <Button className="w-full h-9 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90" onClick={applyBulkActions}>
                  Appliquer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modular Filter Bar */}
        <ChequesFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterDate={filterDate}
          onFilterDateChange={setFilterDate}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          directionFilter={directionFilter}
          onDirectionChange={setDirectionFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          delayFilter={delayFilter}
          onDelayChange={setDelayFilter}
          sortPrimary={sortPrimary}
          onSortPrimaryChange={(val) => setSortPrimary(val)}
          sortSecondary={sortSecondary}
          onSortSecondaryChange={(val) => setSortSecondary(val)}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
          activeSavedView={activeSavedView}
          onApplySavedView={applySavedView}
          roleViews={roleViews[selectedRole]}
          allColumns={allColumns}
          activeFilterCount={activeFilterCount}
          onResetFilters={resetFilters}
        />

        {/* View Mode: Kanban or Table */}
        {viewMode === "kanban" ? (
          <ChequesKanban kanbanGroups={kanbanGroups} onEdit={handleEditCheck} />
        ) : (
          <ChequesTable
            checks={filteredChecks}
            visibleColumns={visibleColumns}
            selectedChecks={selectedChecks}
            allSelectableVisibleIds={allSelectableVisibleIds}
            onToggleSelectAll={toggleSelectAllVisible}
            onToggleSelectOne={toggleSelectOne}
            onEdit={handleEditCheck}
            onDelete={handleDeleteCheck}
            onSendRelance={sendRelance}
            isMobile={isMobile}
          />
        )}

        <CheckEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} check={editingCheck} onSave={handleSaveCheck} />
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl border-border/60">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold">Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer ce chèque ? Cette action est irréversible.
                {checkToDelete && (
                  <div className="mt-4 p-3.5 bg-muted/40 rounded-2xl border border-border/50">
                    <p className="font-bold text-foreground">{checkToDelete.checkName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Référence: {checkToDelete.checkReference}</p>
                    <p className="text-xs font-black text-primary mt-0.5">Montant: {checkToDelete.amount.toLocaleString()} MAD</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCheck} className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Cheques;
