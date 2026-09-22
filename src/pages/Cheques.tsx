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
import {
  CalendarIcon,
  FileText,
  Search,
  Filter,
  Edit,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock3,
  BellRing,
  Columns3,
  LayoutGrid,
  Table2,
  ShieldAlert,
  TrendingUp,
  Send,
  X,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info,
  DollarSign
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  applySavedViewPreset,
  computeChequeStats,
  getDelayBucket,
  getDelayDays,
  getPriorityLevel,
  getRiskScore,
  isPendingStatus,
  SavedViewId
} from "@/utils/chequeUtils";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  "encaissé": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "non encaissé": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "partiellement encaissé": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "retourné": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
};

const priorityLabelClass: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  low: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
};

const roleViews: Record<UserRole, { id: SavedViewId; label: string; icon?: string }[]> = {
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
  
  // Search & Filter controls
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
    const aEncaisser = filteredChecks.filter((check) => check.checkDepositStatus === "non encaissé" || check.checkDepositStatus === "partiellement encaissé");
    const aujourdHui = filteredChecks.filter((check) => getDelayBucket(check) === "today");
    const enRetard = filteredChecks.filter((check) => getDelayBucket(check) === "overdue" || check.checkDepositStatus === "retourné");
    const encaisses = filteredChecks.filter((check) => check.checkDepositStatus === "encaissé");
    
    return {
      aEncaisser: { items: aEncaisser, total: aEncaisser.reduce((sum, c) => sum + c.amount, 0) },
      aujourdHui: { items: aujourdHui, total: aujourdHui.reduce((sum, c) => sum + c.amount, 0) },
      enRetard: { items: enRetard, total: enRetard.reduce((sum, c) => sum + c.amount, 0) },
      encaisses: { items: encaisses, total: encaisses.reduce((sum, c) => sum + c.amount, 0) }
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
      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span>Créé</span>
        </div>
        <div className="h-0.5 w-3 bg-muted-foreground/30 rounded-full" />
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", depositedDone ? "bg-blue-500 shadow-sm shadow-blue-500/50" : "bg-muted")} />
          <span>Déposé</span>
        </div>
        <div className="h-0.5 w-3 bg-muted-foreground/30 rounded-full" />
        <div className="flex items-center gap-1">
          <div className={cn("h-2 w-2 rounded-full", finalDone ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : status === "retourné" ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-muted")} />
          <span>{finalLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950/80 px-3 md:px-8 py-6 safe-pt safe-pb space-y-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* ========================================================================= */}
        {/* 1. HERO HEADER 2026 */}
        {/* ========================================================================= */}
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-slate-900 to-zinc-900 p-6 md:p-8 text-white shadow-2xl border border-zinc-800"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Finance & Chèques ERP 2026</span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Gestion des Chèques
              </h1>
              <p className="text-slate-300 text-sm md:text-base font-normal leading-relaxed">
                Pilotage centralisé, priorisation IA des risques, suivi des retards SLA et encaissement sécurisé.
              </p>
            </div>

            {/* Quick Control Deck */}
            <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
              {/* Role Switcher */}
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs text-slate-400 font-medium">Vue:</span>
                <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                  <SelectTrigger className="w-[140px] h-9 bg-white/10 border-white/20 text-white font-semibold text-xs rounded-xl focus:ring-amber-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="Comptable">Comptable</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="h-6 w-px bg-white/15 hidden sm:block" />

              {/* View Switchers */}
              <div className="flex items-center bg-zinc-950/60 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    viewMode === "table"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Tableau
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                    viewMode === "kanban"
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-md"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Kanban
                </button>
              </div>

              {/* PDF Export Button */}
              <UniversalPDFExport
                title="Liste des Chèques"
                columns={pdfColumns}
                allData={checkPayments}
                filteredData={filteredChecks}
                filename={`cheques_${format(new Date(), "yyyy-MM-dd")}.pdf`}
                formatCell={formatPDFCell}
              />
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 2. 2026 GLASS KPI WIDGETS */}
        {/* ========================================================================= */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          {/* Card 1: Total */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Chèques</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{checkPayments.length}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                dossiers
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 dark:bg-white rounded-full w-full" />
            </div>
          </div>

          {/* Card 2: Direction */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Direction Flux</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-lg">
                <ArrowDownLeft className="h-4 w-4 stroke-[3]" />
                {checkPayments.filter((c) => c.checkDirection === "reçu").length}
                <span className="text-[10px] text-slate-400 font-normal">reçus</span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700" />
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-extrabold text-lg">
                <ArrowUpRight className="h-4 w-4 stroke-[3]" />
                {checkPayments.filter((c) => c.checkDirection === "envoyé").length}
                <span className="text-[10px] text-slate-400 font-normal">envoyés</span>
              </div>
            </div>
            <div className="mt-2 flex gap-1 h-1.5 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${checkPayments.length ? (checkPayments.filter(c => c.checkDirection === "reçu").length / checkPayments.length) * 100 : 50}%` }} />
              <div className="h-full bg-indigo-500" style={{ width: `${checkPayments.length ? (checkPayments.filter(c => c.checkDirection === "envoyé").length / checkPayments.length) * 100 : 50}%` }} />
            </div>
          </div>

          {/* Card 3: Montant Total */}
          <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Montant Total</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {stats.totalAmount.toLocaleString()} <span className="text-sm font-semibold">MAD</span>
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-zinc-400">Cumul valeur des chèques</p>
          </div>

          {/* Card 4: À Encaisser */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-5 shadow-lg border border-amber-200/80 dark:border-amber-900/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">À Encaisser</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                <Clock3 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {stats.pendingAmount.toLocaleString()} <span className="text-sm font-semibold">MAD</span>
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium">
              <span>{stats.dueTodayCount} aujourd'hui</span>
              <span>{stats.overdueCount} en retard</span>
            </div>
          </div>

          {/* Card 5: Retournés */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10 p-5 shadow-lg border border-red-200/80 dark:border-red-900/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">Chèques Retournés</span>
              <div className="p-2 rounded-xl bg-red-500/15 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-red-700 dark:text-red-400">
                {stats.returnedAmount.toLocaleString()} <span className="text-sm font-semibold">MAD</span>
              </span>
            </div>
            <p className="mt-2 text-[11px] text-red-600/80 dark:text-red-300/80 font-medium">
              Dossiers impayés ou rejetés
            </p>
          </div>

          {/* Card 6: Taux Encaissement */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 p-5 shadow-lg border border-emerald-200/80 dark:border-emerald-900/40 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Taux Récupération</span>
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {Math.round(stats.recoveryRate)}%
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {stats.next3Count} sous 3j
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-emerald-200/50 dark:bg-emerald-950/60 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, stats.recoveryRate)}%` }} />
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 3. COMBINED SLA & SMART ALERT CONTROL CENTER */}
        {/* ========================================================================= */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* SLA Legend */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Légende SLA & Priorités</h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-zinc-400">Système de règles temporelles</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-semibold">
              <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-3 text-red-700 dark:text-red-300 flex flex-col justify-between space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-red-500">Niveau Critique</span>
                <span className="font-extrabold text-sm">Retourné / Retard</span>
              </div>
              <div className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3 text-amber-700 dark:text-amber-300 flex flex-col justify-between space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-amber-500">Priorité Élevée</span>
                <span className="font-extrabold text-sm">Aujourd'hui / J-3</span>
              </div>
              <div className="rounded-xl border border-blue-300 dark:border-blue-900/60 bg-blue-50/80 dark:bg-blue-950/30 p-3 text-blue-700 dark:text-blue-300 flex flex-col justify-between space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-blue-500">Niveau Moyen</span>
                <span className="font-extrabold text-sm">J-7 d'échéance</span>
              </div>
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-emerald-700 dark:text-emerald-300 flex flex-col justify-between space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-emerald-500">Niveau Traité</span>
                <span className="font-extrabold text-sm">Encaissé avec succès</span>
              </div>
            </div>
          </div>

          {/* Smart Alerts Config */}
          <div className="rounded-2xl bg-white dark:bg-zinc-900 p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BellRing className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Alertes Intelligentes</h3>
              </div>
              {stats.overdueCount > 0 && (
                <Badge variant="destructive" className="animate-bounce">
                  {stats.overdueCount} alerte(s)
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                <span>Notification automatique J-3 / J-7 & Escalade</span>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-semibold whitespace-nowrap">Seuil d'escalade (jours):</Label>
                <Input
                  type="number"
                  min={1}
                  value={escalationDays}
                  onChange={(event) => setEscalationDays(Math.max(1, Number(event.target.value) || 1))}
                  className="h-8 w-24 text-center font-bold text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ========================================================================= */}
        {/* 4. PREVIEW CASHFLOW TIMELINE BAR */}
        {/* ========================================================================= */}
        {forecastRows.length > 0 && (
          <motion.div
            className="rounded-2xl bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 p-4 text-white shadow-lg border border-zinc-800 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.12 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Prévision de Trésorerie (Flux à venir)</h4>
              </div>
              <span className="text-xs text-slate-400">{forecastRows.length} échéances prochaines</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {forecastRows.map((row) => (
                <div
                  key={row.date}
                  className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex flex-col justify-center min-w-[140px]"
                >
                  <span className="text-[11px] text-slate-300 font-medium">
                    {format(new Date(row.date), "dd MMM yyyy", { locale: fr })}
                  </span>
                  <span className="text-sm font-black text-amber-300 mt-0.5">
                    {row.amount.toLocaleString()} MAD
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 5. ROLE PRESETS & ORGANIZED UNIFIED FILTER BAR */}
        {/* ========================================================================= */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-zinc-900 p-4 md:p-5 shadow-lg border border-slate-200/80 dark:border-zinc-800 space-y-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          {/* Role Preset Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 gap-2 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5">
              {roleViews[selectedRole].map((view) => {
                const isActive = activeSavedView === view.id;
                return (
                  <button
                    key={view.id}
                    onClick={() => applySavedView(view.id)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200",
                      isActive
                        ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-md scale-[1.02]"
                        : "bg-slate-100 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {view.label}
                  </button>
                );
              })}
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 px-2"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Réinitialiser ({activeFilterCount})
              </Button>
            )}
          </div>

          {/* Unified Search & Main Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, référence, contrat, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium focus:ring-amber-500"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {/* Advanced Filter Toggle Button */}
              <Button
                variant={showAdvancedFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "h-10 px-4 rounded-xl text-xs font-semibold gap-2 transition-all",
                  showAdvancedFilters ? "bg-amber-500 hover:bg-amber-600 text-zinc-950" : ""
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres Avancés
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] font-bold bg-amber-600 text-white">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {/* Visible Columns Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-2">
                    <Columns3 className="h-4 w-4" />
                    Colonnes
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 space-y-1 max-h-72 overflow-y-auto">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Colonnes Visibles</div>
                  {allColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.key}
                      checked={visibleColumns.includes(column.key)}
                      onCheckedChange={() => toggleColumn(column.key)}
                      className="text-xs font-medium cursor-pointer"
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Collapsible Advanced Filters Drawer */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden border-t border-slate-100 dark:border-zinc-800 pt-4"
              >
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
                  {/* Direction */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Direction</Label>
                    <Select value={directionFilter} onValueChange={setDirectionFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes directions</SelectItem>
                        <SelectItem value="reçu">Reçu (Entrant)</SelectItem>
                        <SelectItem value="envoyé">Envoyé (Sortant)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Statut */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Statut Encaissement</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous statuts</SelectItem>
                        <SelectItem value="pending">En attente (Global)</SelectItem>
                        <SelectItem value="encaissé">Encaissé</SelectItem>
                        <SelectItem value="non encaissé">Non encaissé</SelectItem>
                        <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                        <SelectItem value="retourné">Retourné</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Origine */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Origine Source</Label>
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes origines</SelectItem>
                        <SelectItem value="contrat">Contrats de location</SelectItem>
                        <SelectItem value="reparation">Réparations & Ateliers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Délai */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Délai SLA</Label>
                    <Select value={delayFilter} onValueChange={setDelayFilter}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous délais</SelectItem>
                        <SelectItem value="overdue">En retard</SelectItem>
                        <SelectItem value="today">Échéance aujourd'hui</SelectItem>
                        <SelectItem value="next3">3 prochains jours</SelectItem>
                        <SelectItem value="next7">7 prochains jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tri Primaire */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Tri Primaire</Label>
                    <Select value={sortPrimary} onValueChange={(value: SortKey) => setSortPrimary(value)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Priorité SLA</SelectItem>
                        <SelectItem value="depositDate">Date d'encaissement</SelectItem>
                        <SelectItem value="amount">Montant</SelectItem>
                        <SelectItem value="risk">Score de risque</SelectItem>
                        <SelectItem value="delay">Retard en jours</SelectItem>
                        <SelectItem value="status">Statut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tri Secondaire */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-zinc-400">Tri Secondaire</Label>
                    <Select value={sortSecondary} onValueChange={(value: SortKey) => setSortSecondary(value)}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 dark:bg-zinc-950/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Priorité SLA</SelectItem>
                        <SelectItem value="depositDate">Date d'encaissement</SelectItem>
                        <SelectItem value="amount">Montant</SelectItem>
                        <SelectItem value="risk">Score de risque</SelectItem>
                        <SelectItem value="delay">Retard en jours</SelectItem>
                        <SelectItem value="status">Statut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ========================================================================= */}
        {/* 6. FLOATING BULK ACTIONS BAR (When Selection Exists) */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedChecks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="sticky bottom-4 z-40 rounded-2xl bg-zinc-900 text-white p-4 shadow-2xl border border-zinc-700 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-zinc-950 font-black flex items-center justify-center text-sm">
                  {selectedChecks.length}
                </div>
                <div>
                  <p className="font-bold text-sm">Action Groupée sur {selectedChecks.length} chèque(s)</p>
                  <p className="text-xs text-slate-400">Mise à jour simultanée des statuts et dates</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <Select value={bulkStatus} onValueChange={(value: CheckDepositStatus) => setBulkStatus(value)}>
                  <SelectTrigger className="h-9 w-[160px] bg-zinc-800 border-zinc-700 text-xs text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="non encaissé">Non encaissé</SelectItem>
                    <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                    <SelectItem value="encaissé">Encaissé</SelectItem>
                    <SelectItem value="retourné">Retourné</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  value={bulkDepositDate}
                  onChange={(e) => setBulkDepositDate(e.target.value)}
                  className="h-9 w-[130px] bg-zinc-800 border-zinc-700 text-xs text-white"
                />

                {bulkStatus === "partiellement encaissé" && (
                  <Input
                    type="number"
                    min="0"
                    placeholder="Montant partiel"
                    value={bulkPartialAmount}
                    onChange={(e) => setBulkPartialAmount(e.target.value)}
                    className="h-9 w-[120px] bg-zinc-800 border-zinc-700 text-xs text-white"
                  />
                )}

                {bulkStatus === "retourné" && (
                  <Input
                    placeholder="Motif de retour"
                    value={bulkReturnReason}
                    onChange={(e) => setBulkReturnReason(e.target.value)}
                    className="h-9 w-[140px] bg-zinc-800 border-zinc-700 text-xs text-white"
                  />
                )}

                <Button
                  onClick={applyBulkActions}
                  className="h-9 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl px-4"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Appliquer
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setSelectedChecks([])}
                  className="h-9 text-slate-400 hover:text-white text-xs px-2"
                >
                  Annuler
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 7. TABLE / KANBAN / MOBILE VIEWS */}
        {/* ========================================================================= */}
        {viewMode === "kanban" ? (
          /* ---------------- KANBAN BOARD ---------------- */
          <motion.div
            className="grid gap-4 lg:grid-cols-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {[
              { key: "aEncaisser", title: "À encaisser", data: kanbanGroups.aEncaisser, color: "border-amber-500/30 bg-amber-500/5 text-amber-600" },
              { key: "aujourdHui", title: "Aujourd'hui", data: kanbanGroups.aujourdHui, color: "border-blue-500/30 bg-blue-500/5 text-blue-600" },
              { key: "enRetard", title: "En retard", data: kanbanGroups.enRetard, color: "border-red-500/30 bg-red-500/5 text-red-600" },
              { key: "encaisses", title: "Encaissés", data: kanbanGroups.encaisses, color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" }
            ].map((column) => (
              <div key={column.key} className="rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-lg border border-slate-200/80 dark:border-zinc-800 space-y-3 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full border", column.color)} />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">{column.title}</h3>
                  </div>
                  <Badge variant="outline" className="font-bold text-xs">
                    {column.data.items.length}
                  </Badge>
                </div>
                <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Volume:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{column.data.total.toLocaleString()} MAD</span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[700px] pr-1">
                  {column.data.items.slice(0, 25).map((check) => (
                    <div
                      key={check.id}
                      className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 p-3.5 space-y-2.5 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{check.checkReference || "Chèque sans réf."}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[150px]">{check.customerName}</p>
                        </div>
                        <Badge className={cn("text-[10px] font-bold border", statusLabelClass[check.checkDepositStatus || "non encaissé"])}>
                          {check.checkDepositStatus || "non encaissé"}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between border-t border-b border-slate-100 dark:border-zinc-800 py-1.5 text-[11px]">
                        <span className="text-slate-500 font-medium">{check.contractNumber}</span>
                        <span className="font-black text-amber-600 dark:text-amber-400">{check.amount.toLocaleString()} MAD</span>
                      </div>

                      {renderTimeline(check)}

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-medium">Relance:</span>
                          <button disabled={!check.canEdit} onClick={() => sendRelance(check.id, "1ère")} className="h-5 w-5 rounded bg-slate-200 dark:bg-zinc-800 text-[9px] font-bold hover:bg-amber-500 hover:text-white">1</button>
                          <button disabled={!check.canEdit} onClick={() => sendRelance(check.id, "2ème")} className="h-5 w-5 rounded bg-slate-200 dark:bg-zinc-800 text-[9px] font-bold hover:bg-amber-500 hover:text-white">2</button>
                          <button disabled={!check.canEdit} onClick={() => sendRelance(check.id, "finale")} className="h-5 w-5 rounded bg-slate-200 dark:bg-zinc-800 text-[9px] font-bold hover:bg-red-500 hover:text-white">F</button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCheck(check)} disabled={!check.canEdit} className="h-6 w-6 p-0">
                            <Edit className="h-3 w-3 text-slate-500 hover:text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCheck(check)} disabled={!check.canEdit} className="h-6 w-6 p-0">
                            <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {column.data.items.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">Aucun chèque dans cette colonne</div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        ) : isMobile ? (
          /* ---------------- MOBILE CARD VIEW ---------------- */
          <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {filteredChecks.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-slate-400">Aucun chèque correspondant trouvé</CardContent></Card>
            ) : (
              filteredChecks.map((check) => {
                const priority = getPriorityLevel(check);
                const status = check.checkDepositStatus || "non encaissé";
                const delayDays = getDelayDays(check);
                return (
                  <Card key={check.id} className="rounded-2xl shadow-md border border-slate-200/80 dark:border-zinc-800">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{check.checkName || "Bénéficiaire inconnu"}</p>
                          <p className="text-xs text-slate-500">{check.customerName}</p>
                        </div>
                        <Badge className={cn("text-xs font-bold border", statusLabelClass[status])}>{status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 dark:border-zinc-800 py-2">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">N° Chèque</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{check.checkReference || "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">N° Contrat</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{check.contractNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Date Échéance</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{check.checkDepositDate ? format(new Date(check.checkDepositDate), "dd/MM/yyyy") : "-"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Montant</span>
                          <span className="font-black text-amber-600">{check.amount.toLocaleString()} MAD</span>
                        </div>
                      </div>

                      {renderTimeline(check)}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-400 mr-1">Relance:</span>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "1ère")}>1</Button>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "2ème")}>2</Button>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "finale")}>F</Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditCheck(check)} disabled={!check.canEdit} className="h-8 px-2 text-xs">
                            <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteCheck(check)} disabled={!check.canEdit} className="h-8 px-2 text-xs text-red-500">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </motion.div>
        ) : (
          /* ---------------- DESKTOP TABLE VIEW ---------------- */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="rounded-2xl bg-white dark:bg-zinc-900 shadow-xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Répertoire Centralisé des Chèques ({filteredChecks.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  {selectedChecks.length} sélectionné(s)
                </span>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-zinc-950/60">
                    <TableRow>
                      {visibleColumns.includes("selection") && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelectableVisibleIds.length > 0 && selectedChecks.length === allSelectableVisibleIds.length}
                            onCheckedChange={toggleSelectAllVisible}
                          />
                        </TableHead>
                      )}
                      {visibleColumns.includes("name") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Nom complet</TableHead>}
                      {visibleColumns.includes("contract") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">N° Contrat</TableHead>}
                      {visibleColumns.includes("source") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Origine</TableHead>}
                      {visibleColumns.includes("reference") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Référence</TableHead>}
                      {visibleColumns.includes("paymentDate") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Date Chèque</TableHead>}
                      {visibleColumns.includes("depositDate") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Date Encaissement</TableHead>}
                      {visibleColumns.includes("direction") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Direction</TableHead>}
                      {visibleColumns.includes("status") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Statut</TableHead>}
                      {visibleColumns.includes("amount") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Montant</TableHead>}
                      {visibleColumns.includes("delay") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Délai SLA</TableHead>}
                      {visibleColumns.includes("priority") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Priorité</TableHead>}
                      {visibleColumns.includes("risk") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Risque</TableHead>}
                      {visibleColumns.includes("timeline") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Timeline</TableHead>}
                      {visibleColumns.includes("relance") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300">Relance</TableHead>}
                      {visibleColumns.includes("actions") && <TableHead className="font-bold text-xs text-slate-700 dark:text-zinc-300 text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredChecks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-slate-400">
                          Aucun chèque ne correspond aux critères de recherche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChecks.map((check) => {
                        const priority = getPriorityLevel(check);
                        const status = check.checkDepositStatus || "non encaissé";
                        const delayDays = getDelayDays(check);
                        return (
                          <TableRow
                            key={`${check.sourceType}-${check.id}`}
                            className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            {visibleColumns.includes("selection") && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedChecks.includes(check.id)}
                                  onCheckedChange={() => toggleSelectOne(check.id)}
                                  disabled={!canSelect(check)}
                                />
                              </TableCell>
                            )}

                            {visibleColumns.includes("name") && (
                              <TableCell className="font-bold text-xs text-slate-900 dark:text-white">
                                {check.checkName || check.customerName || "-"}
                              </TableCell>
                            )}

                            {visibleColumns.includes("contract") && (
                              <TableCell className="text-xs font-semibold text-slate-600 dark:text-zinc-400">
                                {check.contractNumber}
                              </TableCell>
                            )}

                            {visibleColumns.includes("source") && (
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] font-semibold">
                                  {check.sourceType === "reparation" ? "Réparation" : "Contrat"}
                                </Badge>
                              </TableCell>
                            )}

                            {visibleColumns.includes("reference") && (
                              <TableCell className="text-xs font-mono font-medium text-slate-700 dark:text-zinc-300">
                                {check.checkReference || "-"}
                              </TableCell>
                            )}

                            {visibleColumns.includes("paymentDate") && (
                              <TableCell className="text-xs text-slate-600 dark:text-zinc-400">
                                {format(new Date(check.paymentDate), "dd/MM/yyyy")}
                              </TableCell>
                            )}

                            {visibleColumns.includes("depositDate") && (
                              <TableCell className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                                {check.checkDepositDate ? format(new Date(check.checkDepositDate), "dd/MM/yyyy") : "-"}
                              </TableCell>
                            )}

                            {visibleColumns.includes("direction") && (
                              <TableCell>
                                <Badge className={cn("text-[10px] font-bold border", check.checkDirection === "reçu" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-indigo-500/10 text-indigo-600 border-indigo-500/30")}>
                                  {check.checkDirection || "reçu"}
                                </Badge>
                              </TableCell>
                            )}

                            {visibleColumns.includes("status") && (
                              <TableCell>
                                <Badge className={cn("text-[10px] font-bold border", statusLabelClass[status])}>
                                  {status}
                                </Badge>
                              </TableCell>
                            )}

                            {visibleColumns.includes("amount") && (
                              <TableCell className="font-extrabold text-xs text-amber-600 dark:text-amber-400">
                                {check.amount.toLocaleString()} MAD
                              </TableCell>
                            )}

                            {visibleColumns.includes("delay") && (
                              <TableCell className="text-xs font-medium">
                                {delayDays > 0 ? (
                                  <span className="text-red-500 font-bold">Retard {delayDays}j</span>
                                ) : delayDays === 0 ? (
                                  <span className="text-amber-600 font-bold">Aujourd'hui</span>
                                ) : (
                                  <span className="text-slate-500">J{delayDays}</span>
                                )}
                              </TableCell>
                            )}

                            {visibleColumns.includes("priority") && (
                              <TableCell>
                                <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border", priorityLabelClass[priority])}>
                                  {priority}
                                </Badge>
                              </TableCell>
                            )}

                            {visibleColumns.includes("risk") && (
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-12 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full", check.riskScore > 60 ? "bg-red-500" : check.riskScore > 30 ? "bg-amber-500" : "bg-emerald-500")}
                                      style={{ width: `${check.riskScore}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500">{check.riskScore}</span>
                                </div>
                              </TableCell>
                            )}

                            {visibleColumns.includes("timeline") && (
                              <TableCell>{renderTimeline(check)}</TableCell>
                            )}

                            {visibleColumns.includes("relance") && (
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "1ère")}>1</Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "2ème")}>2</Button>
                                  <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-[10px] font-bold" disabled={!check.canEdit} onClick={() => sendRelance(check.id, "finale")}>F</Button>
                                </div>
                              </TableCell>
                            )}

                            {visibleColumns.includes("actions") && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditCheck(check)} disabled={!check.canEdit} className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCheck(check)} disabled={!check.canEdit} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* 8. MODALS & DIALOGS */}
        {/* ========================================================================= */}
        <CheckEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} check={editingCheck} onSave={handleSaveCheck} />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold">Confirmer la suppression du chèque</AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-slate-500">
                Êtes-vous sûr de vouloir supprimer définitivement ce chèque ?
                {checkToDelete && (
                  <div className="mt-3 p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl space-y-1 text-slate-700 dark:text-zinc-300">
                    <p className="font-bold">{checkToDelete.checkName || checkToDelete.customerName}</p>
                    <p className="text-xs">Référence: {checkToDelete.checkReference || "Non définie"}</p>
                    <p className="text-xs font-bold text-amber-600">Montant: {checkToDelete.amount.toLocaleString()} MAD</p>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl text-xs font-semibold">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCheck} className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
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
