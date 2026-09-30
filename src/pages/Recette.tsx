import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  ArrowLeft, CreditCard, Coins, Banknote, CheckCircle, Clock, 
  Send, Building2, History, Search, LayoutGrid, Table2, ChevronUp, 
  ChevronDown, BellRing, TriangleAlert, Plus, Sparkles, TrendingUp, 
  DollarSign, ArrowUpRight, CheckCircle2, Lock, Unlock, X, ShieldCheck, Wallet, Car 
} from "lucide-react";
import { Link } from "react-router-dom";
import { useContracts } from "@/hooks/useContracts";
import { useMiscellaneousExpenses } from "@/hooks/useMiscellaneousExpenses";
import { getContractFinancialStatusWithPayments, recalculateContractFinancials } from "@/utils/contractFinancialStatus";
import { Vehicle, Contract, Customer } from "@/types/appData";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths, type Interval } from "date-fns";
import { fr } from "date-fns/locale";
import { computeContractSummary, getAdditionalContractPayments, getContractSummaryWithPayments } from "@/utils/contractMath";
import { BankTransferDialog } from "@/components/BankTransferDialog";
import { ReportFilters, type TimeFilter } from "@/components/ReportFilters";
import { PDFExportButton } from "@/components/PDFExportButton";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PaymentDialog, type PaymentData } from "@/components/PaymentDialog";
import MiscellaneousExpenseDialog from "@/components/MiscellaneousExpenseDialog";
import MiscellaneousExpenseTable from "@/components/MiscellaneousExpenseTable";
import MiscellaneousExpenseChart from "@/components/MiscellaneousExpenseChart";
import type { Payment, PaymentSummary } from "@/types/payment";
import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { SettledContractsDialog } from "@/components/SettledContractsDialog";
import { paymentsRepository } from "@/repositories/paymentsRepository";
import { bankTransfersRepository } from "@/repositories/bankTransfersRepository";
import { auditLogsRepository } from "@/repositories/auditLogsRepository";
import { useExpenses } from "@/hooks/useExpenses";
import { useVehicles } from "@/hooks/useVehicles";
import { motion } from "framer-motion";
import type { MonthlyExpense } from "@/types/expense";
import { useIsMobile } from "@/hooks/use-mobile";

interface BankTransfer {
  id: string;
  date: string;
  type: 'cash' | 'check' | 'bank_to_cash';
  amount: number;
  fees: number;
  netAmount: number;
  reference?: string;
  clientName?: string;
  contractNumber?: string;
  createdAt: string;
}

type ContractsSortKey = "contract_number" | "customer_name" | "daily_rate" | "duration" | "total_paid" | "remaining_amount";
type SortDirection = "asc" | "desc";

const resolveContractPaymentMethod = (contract: Contract): "Espèces" | "Chèque" | "Virement" | undefined => {
  const rawValue = contract.payment_method || contract.contract_data?.paymentMethod;
  if (rawValue === "Espèces" || rawValue === "Chèque" || rawValue === "Virement") {
    return rawValue;
  }
  return undefined;
};

interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface BarChartItem {
  mode: string;
  montant: number;
}

interface VehicleEntity {
  id: string;
  marque?: string;
  modele?: string;
  annee?: number;
  brand?: string;
  model?: string;
  year?: number;
}

interface MonthlyVehicleExpenseRow {
  id: string;
  vehicleName: string;
  expenseType: string;
  amount: number;
  monthYear: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  details: string;
  amount?: number;
  reference?: string;
  createdAt: string;
}

interface SmartAlertItem {
  id: string;
  title: string;
  description: string;
  level: "warning" | "critical";
}

interface SortableHeaderProps {
  label: string;
  isActive: boolean;
  direction: SortDirection;
  onClick: () => void;
}

const SortableHeader = ({ label, isActive, direction, onClick }: SortableHeaderProps) => (
  <Button variant="ghost" size="sm" className="px-0 font-bold text-xs" onClick={onClick}>
    {label}
    {isActive ? (direction === "asc" ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-accent" /> : <ChevronDown className="w-3.5 h-3.5 ml-1 text-accent" />) : null}
  </Button>
);

export const Recette = () => {
  const { contracts: allContracts, updateContract, refetch } = useContracts();
  const {
    expenses: miscellaneousExpenses,
    loading: expensesLoading,
    deleteExpense: deleteMiscellaneousExpense,
    refetch: refetchMiscellaneousExpenses
  } = useMiscellaneousExpenses();
  const { toast } = useToast();

  const { monthlyExpenses } = useExpenses();
  const { vehicles } = useVehicles();
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPieChart, setShowPieChart] = useState(true);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useLocalStorage<'analytics' | 'contracts' | 'expenses' | 'vehicle_expenses'>("recette:active-tab", "analytics");
  const [contractsViewMode, setContractsViewMode] = useLocalStorage<'table' | 'cards'>("recette:contracts-view-mode", "table");
  const effectiveContractsViewMode = isMobile ? 'cards' : contractsViewMode;
  const [contractsSearch, setContractsSearch] = useState("");
  const [contractsSortKey, setContractsSortKey] = useLocalStorage<ContractsSortKey>("recette:contracts-sort-key", "remaining_amount");
  const [contractsSortDirection, setContractsSortDirection] = useLocalStorage<SortDirection>("recette:contracts-sort-direction", "desc");
  const [contractsPage, setContractsPage] = useState(1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  
  // Financial analysis filters
  const [tenantFilter, setTenantFilter] = useState('');
  const [contractNumberFilter, setContractNumberFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showBarChart, setShowBarChart] = useState(true);
  const [showLineChart, setShowLineChart] = useState(true);
  
  // Freeze states for charts
  const [freezePieChart, setFreezePieChart] = useState(false);
  const [freezeBarChart, setFreezeBarChart] = useState(false);
  const [freezeCash, setFreezeCash] = useState(false);
  const [freezeChecks, setFreezeChecks] = useState(false);
  
  // Frozen data storage
  const [frozenPieData, setFrozenPieData] = useState<PieChartItem[]>([]);
  const [frozenBarData, setFrozenBarData] = useState<BarChartItem[]>([]);
  const [frozenCashAmount, setFrozenCashAmount] = useState(0);
  const [frozenChecksAmount, setFrozenChecksAmount] = useState(0);
  
  // Bank transfers and balance
  const [bankTransfers, setBankTransfers] = useState<any[]>([]);
  const [bankBalance, setBankBalance] = useState<number>(0);
  
  // Payments tracking
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [bankAccount, setBankAccount] = useState<number>(0);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [cashAlertThreshold, setCashAlertThreshold] = useState<number>(2000);
  const [bankAlertThreshold, setBankAlertThreshold] = useState<number>(5000);
  const contractsPerPage = 10;

  const fetchData = useCallback(async () => {
    try {
      const [p, bt, al] = await Promise.all([
        paymentsRepository.getAll(),
        bankTransfersRepository.getAll(),
        auditLogsRepository.getAll()
      ]);
      setPayments(p);
      setBankTransfers(bt);
      setAuditLogs(al);
    } catch (error) {
      console.error("Failed to fetch data in Recette", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    refetch();
  }, [fetchData, refetch]);

  const appendAuditLog = async (entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
    try {
      await auditLogsRepository.create(entry);
      fetchData();
    } catch (error) {
      console.error("Failed to append audit log", error);
    }
  };

  const handleRefresh = () => {
    refetch();
    fetchData();
    toast({
      title: "Données actualisées",
      description: "Les flux financiers et créances sont synchronisés.",
    });
  };

  const getContractPaymentSummary = (contractId: string): PaymentSummary => {
    const summary = getContractSummaryWithPayments(contractId, contracts, payments);
    if (!summary) {
      return {
        totalPaid: 0,
        remainingAmount: 0,
        isFullyPaid: false,
        payments: []
      };
    }
    
    return {
      totalPaid: summary.avance,
      remainingAmount: summary.reste,
      isFullyPaid: summary.isFullyPaid,
      payments: summary.payments
    };
  };

  const filteredContracts: Contract[] = useMemo(() => {
    const processed = allContracts?.map(c => {
      const contractWithAmount = {...c, total_amount: Number(c.total_amount)};
      const updatedContract = recalculateContractFinancials(contractWithAmount);
      if (updatedContract.advance_payment === undefined || updatedContract.advance_payment === null) {
        updatedContract.advance_payment = 0;
      }
      
      return updatedContract;
    }) || [];

    const filterDate = new Date(selectedDate);
    let interval: Interval;

    switch (timeFilter) {
      case 'day':
        interval = { start: startOfDay(filterDate), end: endOfDay(filterDate) };
        break;
      case 'month':
        interval = { start: startOfMonth(filterDate), end: endOfMonth(filterDate) };
        break;
      case 'year':
        interval = { start: startOfYear(filterDate), end: endOfYear(filterDate) };
        break;
      default:
        return processed;
    }

    return processed.filter(contract => {
      if (!contract.start_date) return false;
      const contractDate = parseISO(contract.start_date);
      return isWithinInterval(contractDate, interval);
    });
  }, [allContracts, timeFilter, selectedDate]);

  const contracts = filteredContracts;

  const analyticsFilteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      if (tenantFilter && !contract.customer_name.toLowerCase().includes(tenantFilter.toLowerCase())) {
        return false;
      }
      if (contractNumberFilter && !contract.contract_number.toLowerCase().includes(contractNumberFilter.toLowerCase())) {
        return false;
      }
      if (dateFilter) {
        const contractDate = contract.start_date;
        if (!contractDate || contractDate !== dateFilter) {
          return false;
        }
      }
      
      return true;
    });
  }, [contracts, tenantFilter, contractNumberFilter, dateFilter]);

  const handleBankTransfer = async (transfer: any) => {
    try {
      await bankTransfersRepository.create(transfer);
      fetchData();
      appendAuditLog({
        action: "bank_transfer_created",
        details: `Transfert ${transfer.type} vers banque`,
        amount: transfer.amount,
        reference: transfer.reference
      });
      toast({
        title: "Virement bancaire enregistré",
        description: `${transfer.amount.toLocaleString()} MAD transférés avec succès.`,
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Échec du transfert", variant: "destructive" });
    }
  };

  const stats = useMemo(() => {
    let totalEncaisse = 0;
    let totalDettes = 0;
    let totalSolde = 0;
    let totalEspeces = 0;
    let totalCheques = 0;
    let totalVirements = 0;
    let totalDivers = 0;

    contracts.forEach(contract => {
      const total = contract.total_amount || 0;
      const paymentSummary = getContractPaymentSummary(contract.id);
      const advance = contract.advance_payment || 0;
      
      totalEncaisse += paymentSummary.totalPaid;

      if (advance > 0) {
        const paymentMethod = resolveContractPaymentMethod(contract);
        if (paymentMethod === 'Espèces') {
          totalEspeces += advance;
        } else if (paymentMethod === 'Virement') {
          totalVirements += advance;
        } else if (paymentMethod === 'Chèque') {
          totalCheques += advance;
        }
      }
      
      if (paymentSummary.isFullyPaid) {
        totalSolde += total;
      } else if (paymentSummary.remainingAmount > 0) {
        totalDettes += paymentSummary.remainingAmount;
      }
    });

    payments.forEach(payment => {
      if (payment.paymentMethod === 'Espèces') {
        totalEspeces += payment.amount;
      } else if (payment.paymentMethod === 'Virement') {
        totalVirements += payment.amount;
      } else if (payment.paymentMethod === 'Chèque') {
        totalCheques += payment.amount;
      }
    });

    let diversEspeces = 0;
    let diversVirements = 0;
    let diversCheques = 0;

    miscellaneousExpenses.forEach(expense => {
      totalDivers += expense.amount;
      switch (expense.payment_method) {
        case 'Espèces':
          diversEspeces += expense.amount;
          break;
        case 'Virement':
          diversVirements += expense.amount;
          break;
        case 'Chèque':
          diversCheques += expense.amount;
          break;
      }
    });

    totalEspeces = totalEspeces - diversEspeces;
    totalVirements = totalVirements - diversVirements;
    totalCheques = totalCheques - diversCheques;

    let repairsEspeces = 0;
    let repairsVirements = 0;
    let repairsCheques = 0;
    payments.filter(p => p.repairId).forEach((p) => {
      if (p.paymentMethod === 'Espèces') repairsEspeces += p.amount;
      else if (p.paymentMethod === 'Virement') repairsVirements += p.amount;
      else if (p.paymentMethod === 'Chèque') repairsCheques += p.amount;
    });
    totalEspeces -= repairsEspeces;
    totalVirements -= repairsVirements;
    totalCheques -= repairsCheques;

    bankTransfers.forEach(transfer => {
      if (transfer.type === 'cash') {
        totalEspeces -= transfer.amount;
      } else if (transfer.type === 'check') {
        totalCheques -= transfer.amount;
      } else if (transfer.type === 'bank_to_cash') {
        totalEspeces += (transfer.amount - transfer.fees);
      }
    });

    const bankTransfersIn = bankTransfers.reduce((sum, t) =>
      (t.type === 'cash' || t.type === 'check') ? sum + t.netAmount : sum, 0
    );
    const bankTransfersOut = bankTransfers.reduce((sum, t) =>
      (t.type === 'bank_to_cash') ? sum + t.amount : sum, 0
    );
    const computedBankBalance = Math.max(0, totalVirements + bankTransfersIn - bankTransfersOut);

    const currentMonthKey = selectedDate.slice(0, 7);
    const totalVehiculeExpenses = (monthlyExpenses || [])
      .filter((e) => (e.month_year || "").slice(0, 7) === currentMonthKey)
      .reduce((sum, e) => sum + Number(e.allocated_amount || 0), 0);

    return {
      totalEncaisse,
      totalDettes,
      totalSolde,
      totalEspeces: Math.max(0, totalEspeces),
      totalCheques: Math.max(0, totalCheques),
      totalVirements: Math.max(0, totalVirements),
      bankBalance: computedBankBalance,
      totalDivers,
      totalVehiculeExpenses
    };
  }, [contracts, payments, cashBalance, bankAccount, bankTransfers, bankBalance, miscellaneousExpenses, monthlyExpenses, selectedDate]);

  const analyticsStats = useMemo(() => {
    let totalEncaisse = 0;
    let totalDettes = 0;
    let totalSolde = 0;
    let totalEspeces = 0;
    let totalCheques = 0;
    let totalVirements = 0;

    analyticsFilteredContracts.forEach(contract => {
      const total = contract.total_amount || 0;
      const advance = contract.advance_payment || 0;
      const paymentSummary = getContractPaymentSummary(contract.id);
      const additionalPayments = getAdditionalContractPayments(contract, payments);
      
      totalEncaisse += paymentSummary.totalPaid;
      
      if (paymentSummary.isFullyPaid) {
        totalSolde += total;
      } else if (paymentSummary.remainingAmount > 0) {
        totalDettes += paymentSummary.remainingAmount;
      }

      if (advance > 0) {
        const paymentMethod = resolveContractPaymentMethod(contract);
        if (paymentMethod === 'Espèces') {
          totalEspeces += advance;
        } else if (paymentMethod === 'Chèque') {
          totalCheques += advance;
        } else if (paymentMethod === 'Virement') {
          totalVirements += advance;
        }
      }

      additionalPayments.forEach(payment => {
        if (payment.paymentMethod === 'Espèces') {
          totalEspeces += payment.amount;
        } else if (payment.paymentMethod === 'Virement') {
          totalVirements += payment.amount;
        } else if (payment.paymentMethod === 'Chèque') {
          totalCheques += payment.amount;
        }
      });
    });

    return {
      totalEncaisse: Math.max(0, totalEncaisse),
      totalDettes: Math.max(0, totalDettes),
      totalSolde: Math.max(0, totalSolde),
      totalEspeces: Math.max(0, totalEspeces),
      totalCheques: Math.max(0, totalCheques),
      totalVirements: Math.max(0, totalVirements)
    };
  }, [analyticsFilteredContracts, payments]);

  const pieChartData = useMemo(() => {
    const currentData = [
      { name: "Espèces", value: analyticsStats.totalEspeces, color: "#10b981" },
      { name: "Chèques", value: analyticsStats.totalCheques, color: "#3b82f6" },
      { name: "Virements", value: analyticsStats.totalVirements, color: "#f59e0b" }
    ].filter(item => item.value > 0);
    
    if (freezePieChart && frozenPieData.length === 0) {
      setFrozenPieData(currentData);
      return currentData;
    }
    
    return freezePieChart ? frozenPieData : currentData;
  }, [analyticsStats, freezePieChart, frozenPieData]);

  const barChartData = useMemo(() => {
    const currentData = [
      { mode: "Espèces", montant: analyticsStats.totalEspeces },
      { mode: "Chèques", montant: analyticsStats.totalCheques },
      { mode: "Virements", montant: analyticsStats.totalVirements }
    ];
    
    if (freezeBarChart && frozenBarData.length === 0) {
      setFrozenBarData(currentData);
      return currentData;
    }
    
    return freezeBarChart ? frozenBarData : currentData;
  }, [analyticsStats, freezeBarChart, frozenBarData]);

  const lineChartData = useMemo(() => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const data = months.map((month, index) => ({
      month,
      recettes: 0,
      dettes: 0,
      monthIndex: index
    }));

    analyticsFilteredContracts.forEach(contract => {
      if (contract.start_date) {
        try {
          const startDate = parseISO(contract.start_date);
          const monthIndex = startDate.getMonth();
          const year = startDate.getFullYear();
          const currentYear = new Date().getFullYear();
          
          if (year === currentYear) {
            const paymentSummary = getContractPaymentSummary(contract.id);
            data[monthIndex].recettes += paymentSummary.totalPaid;
            if (paymentSummary.remainingAmount > 0) {
              data[monthIndex].dettes += paymentSummary.remainingAmount;
            }
          }
        } catch {
          return;
        }
      }
    });

    return data;
  }, [analyticsFilteredContracts, payments]);

  const contractsWithDebts = useMemo(() => {
    return contracts.filter(contract => {
      const paymentSummary = getContractPaymentSummary(contract.id);
      const financialStatus = getContractFinancialStatusWithPayments(contract, paymentSummary);
      
      return paymentSummary.remainingAmount > 0 && 
             (financialStatus.status === 'en_attente' || 
              financialStatus.status === 'prolonger' || 
              financialStatus.status === 'impaye' || 
              financialStatus.status === 'en_cours');
    }).map(contract => {
      const paymentSummary = getContractPaymentSummary(contract.id);
      const financialStatus = getContractFinancialStatusWithPayments(contract, paymentSummary);
      const contractSummary = computeContractSummary(contract, { advanceMode: 'field' });
      const duration = contractSummary.duration;
      
      return {
        ...contract,
        duration: duration,
        remaining_amount: paymentSummary.remainingAmount,
        total_paid: paymentSummary.totalPaid,
        financial_status: paymentSummary.isFullyPaid ? 
          { status: "paye", label: "Payé", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30", description: "Contrat entièrement soldé" } :
          financialStatus,
        payment_summary: paymentSummary
      };
    }).sort((a, b) => b.remaining_amount - a.remaining_amount);
  }, [contracts, payments]);

  const settledContracts = useMemo(() => {
    return contracts.filter(contract => {
      const paymentSummary = getContractPaymentSummary(contract.id);
      return paymentSummary.remainingAmount <= 0 && paymentSummary.totalPaid > 0;
    });
  }, [contracts, payments]);

  const displayedContractsWithDebts = useMemo(() => {
    const search = contractsSearch.trim().toLowerCase();
    if (!search) return contractsWithDebts;
    return contractsWithDebts.filter((contract) => {
      const statusLabel = contract.financial_status?.label || "";
      return (
        contract.contract_number.toLowerCase().includes(search) ||
        contract.customer_name.toLowerCase().includes(search) ||
        statusLabel.toLowerCase().includes(search)
      );
    });
  }, [contractsWithDebts, contractsSearch]);

  const sortedContractsWithDebts = useMemo(() => {
    const sorted = [...displayedContractsWithDebts];
    sorted.sort((a, b) => {
      const baseDirection = contractsSortDirection === "asc" ? 1 : -1;
      if (contractsSortKey === "contract_number") {
        return a.contract_number.localeCompare(b.contract_number) * baseDirection;
      }
      if (contractsSortKey === "customer_name") {
        return a.customer_name.localeCompare(b.customer_name) * baseDirection;
      }
      if (contractsSortKey === "daily_rate") {
        return ((a.daily_rate || 0) - (b.daily_rate || 0)) * baseDirection;
      }
      if (contractsSortKey === "duration") {
        return ((a.duration || 0) - (b.duration || 0)) * baseDirection;
      }
      if (contractsSortKey === "total_paid") {
        return ((a.total_paid || 0) - (b.total_paid || 0)) * baseDirection;
      }
      return ((a.remaining_amount || 0) - (b.remaining_amount || 0)) * baseDirection;
    });
    return sorted;
  }, [displayedContractsWithDebts, contractsSortKey, contractsSortDirection]);

  const totalContractsPages = Math.max(1, Math.ceil(sortedContractsWithDebts.length / contractsPerPage));

  useEffect(() => {
    if (contractsPage > totalContractsPages) {
      setContractsPage(totalContractsPages);
    }
  }, [contractsPage, totalContractsPages]);

  useEffect(() => {
    setContractsPage(1);
  }, [contractsSearch, contractsViewMode, contractsSortKey, contractsSortDirection]);

  const paginatedContractsWithDebts = useMemo(() => {
    const startIndex = (contractsPage - 1) * contractsPerPage;
    return sortedContractsWithDebts.slice(startIndex, startIndex + contractsPerPage);
  }, [sortedContractsWithDebts, contractsPage, contractsPerPage]);

  const toggleContractsSort = (key: ContractsSortKey) => {
    if (contractsSortKey === key) {
      setContractsSortDirection((prev) => prev === "asc" ? "desc" : "asc");
      return;
    }
    setContractsSortKey(key);
    setContractsSortDirection(key === "contract_number" || key === "customer_name" ? "asc" : "desc");
  };

  const monthlyVehicleExpensesData = useMemo(() => {
    const monthKey = selectedDate.slice(0, 7);
    const vehicleNameMap: Record<string, string> = Object.fromEntries(
      ((vehicles || []) as VehicleEntity[]).map((v) => [
        v.id,
        `${v.marque || v.brand || ''} ${v.modele || v.model || ''} ${v.annee || v.year || ''}`.trim()
      ])
    );
    const rows: MonthlyVehicleExpenseRow[] = ((monthlyExpenses || []) as MonthlyExpense[])
      .filter((e) => e.month_year === monthKey)
      .map((e) => ({
        id: e.id,
        vehicleName: vehicleNameMap[e.vehicle_id] || e.vehicle_id,
        expenseType: e.expense_type,
        amount: Number(e.allocated_amount || 0),
        monthYear: e.month_year
      }));

    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    return { monthKey, rows, total };
  }, [monthlyExpenses, vehicles, selectedDate]);

  const smartAlerts = useMemo(() => {
    const now = new Date();
    const overdueContracts = contractsWithDebts.filter((contract) => {
      if (!contract.end_date) return false;
      const endDate = parseISO(contract.end_date);
      return Number.isFinite(endDate.getTime()) && endDate < now && contract.remaining_amount > 0;
    });
    const nonDepositedChecks = payments.filter(
      (payment) => payment.paymentMethod === "Chèque" && payment.checkDepositStatus !== "encaissé"
    );
    const alerts: SmartAlertItem[] = [];
    if (overdueContracts.length > 0) {
      alerts.push({
        id: "overdue_contracts",
        title: "Contrats avec créances échues",
        description: `${overdueContracts.length} contrat(s) ont dépassé la date sans règlement complet.`,
        level: "critical"
      });
    }
    if (nonDepositedChecks.length > 0) {
      const totalChecks = nonDepositedChecks.reduce((sum, item) => sum + item.amount, 0);
      alerts.push({
        id: "checks_not_deposited",
        title: "Chèques en attente d'encaissement",
        description: `${nonDepositedChecks.length} chèque(s) en portefeuille pour ${totalChecks.toLocaleString()} MAD`,
        level: "warning"
      });
    }
    if (stats.totalEspeces < cashAlertThreshold) {
      alerts.push({
        id: "low_cash",
        title: "Niveau de caisse faible",
        description: `Caisse actuelle: ${stats.totalEspeces.toLocaleString()} MAD (Seuil: ${cashAlertThreshold.toLocaleString()} MAD)`,
        level: "warning"
      });
    }
    if (stats.bankBalance < bankAlertThreshold) {
      alerts.push({
        id: "low_bank_balance",
        title: "Solde bancaire sous le seuil",
        description: `Banque: ${stats.bankBalance.toLocaleString()} MAD (Seuil: ${bankAlertThreshold.toLocaleString()} MAD)`,
        level: "warning"
      });
    }
    return alerts;
  }, [contractsWithDebts, payments, stats.totalEspeces, stats.bankBalance, cashAlertThreshold, bankAlertThreshold]);

  const monthlyKpis = useMemo(() => {
    const selected = parseISO(selectedDate);
    const currentMonthKey = format(startOfMonth(selected), "yyyy-MM");
    const previousMonthKey = format(startOfMonth(subMonths(selected, 1)), "yyyy-MM");
    const computeMonthData = (monthKey: string) => {
      const paymentsTotal = payments
        .filter((payment) => payment.paymentDate.slice(0, 7) === monthKey)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const miscTotal = miscellaneousExpenses
        .filter((expense) => expense.expense_date.slice(0, 7) === monthKey)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const vehicleTotal = (monthlyExpenses || [])
        .filter((expense) => (expense.month_year || "").slice(0, 7) === monthKey)
        .reduce((sum, expense) => sum + Number(expense.allocated_amount || 0), 0);
      return {
        paymentsTotal,
        miscTotal,
        vehicleTotal,
        netTotal: paymentsTotal - miscTotal - vehicleTotal
      };
    };
    const current = computeMonthData(currentMonthKey);
    const previous = computeMonthData(previousMonthKey);
    const delta = current.netTotal - previous.netTotal;
    const deltaPercent = previous.netTotal === 0 ? 100 : (delta / Math.abs(previous.netTotal)) * 100;
    return {
      currentMonthKey,
      previousMonthKey,
      current,
      previous,
      delta,
      deltaPercent
    };
  }, [selectedDate, payments, miscellaneousExpenses, monthlyExpenses]);

  const handleFreezeCash = (freeze: boolean) => {
    if (freeze && !freezeCash) {
      setFrozenCashAmount(stats.totalEspeces);
    }
    setFreezeCash(freeze);
  };

  const handleFreezeChecks = (freeze: boolean) => {
    if (freeze && !freezeChecks) {
      setFrozenChecksAmount(stats.totalCheques);
    }
    setFreezeChecks(freeze);
  };

  const handleDeleteRemainingDebts = async () => {
    const debtsToSettle = contractsWithDebts.filter((contract) => contract.remaining_amount > 0);
    if (debtsToSettle.length === 0) {
      toast({ title: "Aucune dette", description: "Il n'y a aucune créance restante à solder" });
      return;
    }

    const settlementDate = new Date().toISOString();
    for (const contract of debtsToSettle) {
      const paymentMethod = resolveContractPaymentMethod(contract) || "Espèces";
      await paymentsRepository.create({
        contractId: contract.id,
        contractNumber: contract.contract_number,
        customerName: contract.customer_name,
        amount: contract.remaining_amount,
        paymentMethod,
        paymentDate: settlementDate,
        checkDepositStatus: paymentMethod === "Chèque" ? "encaissé" : undefined,
        relanceLevel: "aucune",
        relanceHistory: [],
        auditTrail: []
      });
      await updateContract(contract.id, { status: "completed" });
    }
    
    fetchData();
    refetch();

    appendAuditLog({
      action: "debts_settled",
      details: "Solder toutes les dettes restantes",
      amount: debtsToSettle.reduce((sum, c) => sum + c.remaining_amount, 0)
    });

    toast({ title: "Créances soldées", description: `${debtsToSettle.length} contrat(s) soldé(s) automatiquement` });
  };

  const handlePayment = async (contractId: string, paymentData: PaymentData) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;

      const p: Omit<Payment, "id"> = {
        contractId,
        contractNumber: contract.contract_number,
        customerName: contract.customer_name,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date().toISOString(),
        checkReference: paymentData.checkReference,
        checkName: paymentData.checkName,
        checkDepositDate: paymentData.checkDepositDate,
        checkDirection: paymentData.checkDirection,
        checkDepositStatus: paymentData.checkDepositStatus,
        checkReturnReason: paymentData.checkReturnReason,
        checkReturnDate: paymentData.checkReturnDate,
        partiallyCollectedAmount: paymentData.partiallyCollectedAmount,
        relanceLevel: "aucune",
        relanceHistory: [],
        auditTrail: []
      };

      const createdPayment = await paymentsRepository.create(p);
      setPayments(prev => [createdPayment, ...prev]);
      await fetchData();
      
      appendAuditLog({
        action: "payment_created",
        details: `Paiement enregistré pour ${contract.contract_number}`,
        amount: paymentData.amount,
        reference: paymentData.checkReference
      });

      const allPayments = await paymentsRepository.getAll();
      const additionalPayments = getAdditionalContractPayments(contract, allPayments).reduce((sum, payment) => sum + payment.amount, 0);
      const contractSummary = computeContractSummary(contract, { advanceMode: 'field' });
      const totalPaid = (contract.advance_payment || 0) + additionalPayments;
      const newRemainingAmount = Math.max(0, contractSummary.total - totalPaid);
      
      if (newRemainingAmount <= 0) {
        await updateContract(contractId, { status: 'completed' });
        await refetch();
        toast({ title: "Contrat soldé", description: `Le contrat ${contract.contract_number} est désormais entièrement payé.` });
      } else {
        await refetch();
        toast({ title: "Paiement enregistré", description: `Versement de ${paymentData.amount.toLocaleString()} MAD ajouté au contrat ${contract.contract_number}.` });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'enregistrement du paiement", variant: "destructive" });
    }
  };

  const cashAmount = freezeCash ? frozenCashAmount : stats.totalEspeces;
  const checksAmount = freezeChecks ? frozenChecksAmount : stats.totalCheques;

  return (
    <div className="space-y-7 pb-24 safe-pt safe-pb relative">
      
      {/* 2026 FUTURISTIC TREASURY COMMAND CENTER HERO BANNER */}
      <motion.div 
        className="p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-r from-card via-card/95 to-background border border-border/70 shadow-xl relative overflow-hidden backdrop-blur-2xl"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider">
                ◆ FLEET TREASURY OS 2026 • REAL-TIME CASHFLOW MONITOR
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
              Gestion des <span className="text-accent">Recettes & Trésorerie</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
              Supervision en temps réel des encaissements, solde en caisse, virements bancaires et recouvrement des créances.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-accent/10 text-xs gap-1.5 shadow-xs"
            >
              <History className="w-4 h-4 text-accent" />
              <span>Actualiser</span>
            </Button>

            <PDFExportButton
              type="revenue"
              data={{
                stats,
                contractsWithDebts,
                pieChartData,
                barChartData,
                lineChartData,
                bankTransfers,
                payments,
                miscellaneousExpenses,
                smartAlerts,
                monthlyKpis
              }}
              filename={`recettes-${timeFilter}-${selectedDate}.pdf`}
            />

            <BankTransferDialog
              totalCash={stats.totalEspeces}
              totalChecks={stats.totalCheques}
              bankBalance={stats.bankBalance}
              onTransfer={handleBankTransfer}
            >
              <Button className="rounded-2xl h-11 px-5 font-black bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-xs gap-1.5">
                <Send className="w-4 h-4" />
                <span>Virement Banque</span>
              </Button>
            </BankTransferDialog>
          </div>
        </div>
      </motion.div>

      {/* FILTER CONTROLS BAR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="p-4 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs"
      >
        <ReportFilters
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          showPieChart={showPieChart}
          onShowPieChartChange={setShowPieChart}
          showBarChart={showBarChart}
          onShowBarChartChange={setShowBarChart}
          showLineChart={showLineChart}
          onShowLineChartChange={setShowLineChart}
          freezePieChart={freezePieChart}
          onFreezePieChartChange={setFreezePieChart}
          freezeBarChart={freezeBarChart}
          onFreezeBarChartChange={setFreezeBarChart}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </motion.div>

      {/* 2026 FUTURISTIC ANIMATED TELEMETRY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Encaissé */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-lg shadow-emerald-500/5 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Encaissé</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {stats.totalEncaisse.toLocaleString()} <span className="text-xs font-semibold">MAD</span>
            </p>
            <div className="mt-2 w-full bg-muted/40 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((stats.totalEncaisse / (stats.totalEncaisse + stats.totalDettes || 1)) * 100))}%`
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">
              Recettes perçues ({Math.round((stats.totalEncaisse / (stats.totalEncaisse + stats.totalDettes || 1)) * 100)}% recouvré)
            </p>
          </div>
        </motion.div>

        {/* Card 2: Caisse Espèces */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-lg shadow-emerald-500/5 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Caisse Espèces</span>
            <button
              onClick={() => handleFreezeCash(!freezeCash)}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={freezeCash ? "Dégeler la caisse" : "Figer la caisse"}
            >
              {freezeCash ? <Lock className="w-3.5 h-3.5 text-accent" /> : <Unlock className="w-3.5 h-3.5 opacity-70" />}
            </button>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                {cashAmount.toLocaleString()}
              </p>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">MAD</span>
            </div>
            {cashAmount < cashAlertThreshold && (
              <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 text-[9px] font-bold mt-1 border-red-500/20">
                Seuil bas ({cashAlertThreshold} MAD)
              </Badge>
            )}
            <BankTransferDialog
              totalCash={stats.totalEspeces}
              totalChecks={stats.totalCheques}
              bankBalance={stats.bankBalance}
              onTransfer={handleBankTransfer}
            >
              <Button variant="ghost" size="sm" className="w-full mt-2 h-7 rounded-xl text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 justify-between">
                <span>Dépôt en banque</span>
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </BankTransferDialog>
          </div>
        </motion.div>

        {/* Card 3: Compte Banque */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-blue-500/30 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-lg shadow-blue-500/5 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Compte Banque</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
              {stats.bankBalance.toLocaleString()} <span className="text-xs font-semibold">MAD</span>
            </p>
            <BankTransferDialog
              totalCash={stats.totalEspeces}
              totalChecks={stats.totalCheques}
              bankBalance={stats.bankBalance}
              onTransfer={handleBankTransfer}
            >
              <Button variant="ghost" size="sm" className="w-full mt-2 h-7 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 justify-between">
                <span>Virement / Dépôt</span>
                <Send className="w-3 h-3" />
              </Button>
            </BankTransferDialog>
          </div>
        </motion.div>

        {/* Card 4: Total Chèques */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-amber-500/30 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-lg shadow-amber-500/5 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Total Chèques</span>
            <button
              onClick={() => handleFreezeChecks(!freezeChecks)}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {freezeChecks ? <Lock className="w-3.5 h-3.5 text-accent" /> : <Unlock className="w-3.5 h-3.5 opacity-70" />}
            </button>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono tracking-tight">
              {checksAmount.toLocaleString()} <span className="text-xs font-semibold">MAD</span>
            </p>
            <Link to="/cheques">
              <Button variant="ghost" size="sm" className="w-full mt-2 h-7 rounded-xl text-[10px] font-bold text-amber-500 hover:bg-amber-500/10 justify-between">
                <span>Voir Portefeuille</span>
                <CreditCard className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Card 5: Créances Restantes */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-red-500/40 bg-gradient-to-br from-card via-card to-red-500/5 shadow-lg shadow-red-500/10 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-destructive">
            <span className="text-[10px] font-black uppercase tracking-wider">Créances Restantes</span>
            <div className="p-2 rounded-xl bg-destructive/15 text-destructive group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-destructive font-mono tracking-tight">
              {stats.totalDettes.toLocaleString()} <span className="text-xs font-semibold">MAD</span>
            </p>
            <Button
              onClick={handleDeleteRemainingDebts}
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 rounded-xl text-[10px] font-bold text-destructive hover:bg-destructive/10 justify-between"
            >
              <span>Solder Dettes</span>
              <CheckCircle2 className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>

        {/* Card 6: Charges Déduites */}
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="rounded-[2.2rem] border border-purple-500/30 bg-gradient-to-br from-card via-card to-purple-500/5 shadow-lg shadow-purple-500/5 p-5 flex flex-col justify-between space-y-3 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Charges Déduites</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
              -{(stats.totalDivers + (stats.totalVehiculeExpenses || 0)).toLocaleString()} <span className="text-xs font-semibold">MAD</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* 4 WORKSPACES TABS SYSTEM */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl bg-muted/50 border border-border/40 h-auto">
            <TabsTrigger value="analytics" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Flux & Graphiques Trésorerie
            </TabsTrigger>
            <TabsTrigger value="contracts" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Créances & Règlements ({contractsWithDebts.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <CreditCard className="w-3.5 h-3.5 text-blue-500" />
              Dépenses Diverses
            </TabsTrigger>
            <TabsTrigger value="vehicle_expenses" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="w-3.5 h-3.5 text-purple-500" />
              Dépenses Flotte Véhicules
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: FLUX & GRAPHIQUES TRÉSORERIE */}
          <TabsContent value="analytics" className="space-y-6 animate-in fade-in-50 duration-300">
            
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Pie Chart: Répartition par mode de paiement */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-black">Répartition des Encaissements</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => handleFreezePieChart(!freezePieChart)} className="text-xs font-bold">
                    {freezePieChart ? '🔒 Figé' : '🔓 Dynamique'}
                  </Button>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={6}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value.toLocaleString()} MAD`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} MAD`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar Chart: Montants par mode */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-black">Montants par Mode de Règlement</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => handleFreezeBarChart(!freezeBarChart)} className="text-xs font-bold">
                    {freezeBarChart ? '🔒 Figé' : '🔓 Dynamique'}
                  </Button>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="mode" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: "bold" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} MAD`} />
                      <Bar dataKey="montant" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Line Chart: Historique Mensuel Recettes vs Dettes */}
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
              <CardHeader className="p-5 sm:p-6 pb-2">
                <CardTitle className="text-base font-black">Historique Annuel — Recettes Encaissées vs Créances</CardTitle>
                <CardDescription className="text-xs font-medium">Comparatif des 12 mois de l'année en cours</CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: "bold" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} MAD`} />
                    <Legend />
                    <Line type="monotone" dataKey="recettes" stroke="#10b981" strokeWidth={3} name="Recettes Encaissées (MAD)" />
                    <Line type="monotone" dataKey="dettes" stroke="#ef4444" strokeWidth={3} name="Créances en Attente (MAD)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Smart Alerts & Alert Thresholds */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-500">
                  <BellRing className="w-5 h-5" />
                  <h3 className="font-black text-base text-foreground">Alertes Financières & Risques</h3>
                </div>
                {smartAlerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4">Toutes les métriques de trésorerie sont stables.</p>
                ) : (
                  <div className="space-y-2">
                    {smartAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          alert.level === "critical"
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black">{alert.title}</p>
                          <p className="text-[11px] opacity-80">{alert.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                          {alert.level === "critical" ? "Critique" : "Attention"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Threshold Controls */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 p-5 space-y-3">
                <div className="flex items-center gap-2 text-accent">
                  <TriangleAlert className="w-5 h-5" />
                  <h3 className="font-black text-base text-foreground">Seuils d'Alerte</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Seuil Caisse Espèces (MAD)</label>
                    <Input
                      type="number"
                      value={cashAlertThreshold}
                      onChange={(e) => setCashAlertThreshold(Number(e.target.value))}
                      className="rounded-xl h-9"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Seuil Compte Bancaire (MAD)</label>
                    <Input
                      type="number"
                      value={bankAlertThreshold}
                      onChange={(e) => setBankAlertThreshold(Number(e.target.value))}
                      className="rounded-xl h-9"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Audit Trail Log */}
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-500">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-black text-base text-foreground">Journal d'Audit Financier Certifié</h3>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {auditLogs.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="p-3 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-foreground">{entry.action}</p>
                        <p className="text-[11px] text-muted-foreground">{entry.details}</p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-accent">{entry.amount ? `${entry.amount.toLocaleString()} MAD` : "—"}</span>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

          </TabsContent>

          {/* TAB 2: CRÉANCES & RÈGLEMENTS */}
          <TabsContent value="contracts" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
              <CardHeader className="p-5 sm:p-6 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-black">Grand Livre des Créances & Règlements</CardTitle>
                    <CardDescription className="text-xs font-medium">
                      {sortedContractsWithDebts.length} contrat(s) avec solde à recouvrer
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteRemainingDebts}
                      className="rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Solder Dettes Restantes
                    </Button>

                    <SettledContractsDialog
                      settledContracts={settledContracts}
                      payments={payments}
                    >
                      <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold gap-1">
                        <History className="w-3.5 h-3.5" />
                        Historique Soldé ({settledContracts.length})
                      </Button>
                    </SettledContractsDialog>
                  </div>
                </div>

                {/* Search & View Switcher */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/30">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={contractsSearch}
                      onChange={(e) => setContractsSearch(e.target.value)}
                      placeholder="Rechercher contrat, locataire..."
                      className="pl-9 h-9 rounded-xl text-xs"
                    />
                  </div>

                  {!isMobile && (
                    <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/40 rounded-xl">
                      <Button size="sm" variant={effectiveContractsViewMode === "table" ? "default" : "ghost"} onClick={() => setContractsViewMode("table")} className="h-7 text-xs font-bold">
                        <Table2 className="w-3.5 h-3.5 mr-1" /> Table
                      </Button>
                      <Button size="sm" variant={effectiveContractsViewMode === "cards" ? "default" : "ghost"} onClick={() => setContractsViewMode("cards")} className="h-7 text-xs font-bold">
                        <LayoutGrid className="w-3.5 h-3.5 mr-1" /> Cartes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 pt-0">
                {effectiveContractsViewMode === "table" ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border/60 uppercase text-muted-foreground font-black">
                          <th className="py-3 px-3">
                            <SortableHeader label="Contrat" isActive={contractsSortKey === "contract_number"} direction={contractsSortDirection} onClick={() => toggleContractsSort("contract_number")} />
                          </th>
                          <th className="py-3 px-3">
                            <SortableHeader label="Locataire" isActive={contractsSortKey === "customer_name"} direction={contractsSortDirection} onClick={() => toggleContractsSort("customer_name")} />
                          </th>
                          <th className="py-3 px-3">Prix/Jour</th>
                          <th className="py-3 px-3">Durée</th>
                          <th className="py-3 px-3">Total Contrat</th>
                          <th className="py-3 px-3">Encaissé</th>
                          <th className="py-3 px-3">
                            <SortableHeader label="Reste à Payer" isActive={contractsSortKey === "remaining_amount"} direction={contractsSortDirection} onClick={() => toggleContractsSort("remaining_amount")} />
                          </th>
                          <th className="py-3 px-3">Statut</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 font-medium">
                        {paginatedContractsWithDebts.map((contract) => {
                          const paymentSummary = getContractPaymentSummary(contract.id);
                          const summary = getContractSummaryWithPayments(contract.id, contracts);
                          const duration = summary?.duration || 0;

                          return (
                            <tr key={contract.id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3.5 px-3 font-mono font-bold">{contract.contract_number}</td>
                              <td className="py-3.5 px-3 font-semibold text-foreground">{contract.customer_name}</td>
                              <td className="py-3.5 px-3 font-mono">{(contract.daily_rate || 0).toLocaleString()} MAD</td>
                              <td className="py-3.5 px-3">{duration} jours</td>
                              <td className="py-3.5 px-3 font-bold font-mono">{(summary?.total || 0).toLocaleString()} MAD</td>
                              <td className="py-3.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{paymentSummary.totalPaid.toLocaleString()} MAD</td>
                              <td className="py-3.5 px-3 font-mono text-destructive font-black text-sm">{paymentSummary.remainingAmount.toLocaleString()} MAD</td>
                              <td className="py-3.5 px-3">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${contract.financial_status.color}`}>
                                  {contract.financial_status.label}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {!paymentSummary.isFullyPaid ? (
                                    <PaymentDialog
                                      contractId={contract.id}
                                      contractNumber={contract.contract_number}
                                      customerName={contract.customer_name}
                                      remainingAmount={paymentSummary.remainingAmount}
                                      onPayment={handlePayment}
                                    >
                                      <Button size="sm" className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Régler
                                      </Button>
                                    </PaymentDialog>
                                  ) : (
                                    <Badge className="bg-emerald-500/20 text-emerald-600">Soldé</Badge>
                                  )}

                                  <PaymentHistoryDialog
                                    contractId={contract.id}
                                    contractNumber={contract.contract_number}
                                    customerName={contract.customer_name}
                                    payments={payments}
                                    totalAmount={summary?.total || contract.total_amount}
                                    totalPaid={paymentSummary.totalPaid}
                                    remainingAmount={paymentSummary.remainingAmount}
                                  >
                                    <Button variant="outline" size="sm" className="h-8 px-2.5 rounded-xl text-xs font-bold">
                                      Détails
                                    </Button>
                                  </PaymentHistoryDialog>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {paginatedContractsWithDebts.map((contract) => {
                      const paymentSummary = getContractPaymentSummary(contract.id);
                      const summary = getContractSummaryWithPayments(contract.id, contracts);
                      return (
                        <div key={contract.id} className="p-4 rounded-2xl border border-border/50 bg-muted/10 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono font-bold text-sm">{contract.contract_number}</p>
                              <p className="font-bold text-foreground text-sm">{contract.customer_name}</p>
                            </div>
                            <Badge className={contract.financial_status.color}>{contract.financial_status.label}</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 rounded-xl bg-muted/40">
                              <span className="text-muted-foreground block text-[10px]">Total Contrat</span>
                              <span className="font-bold font-mono">{(summary?.total || 0).toLocaleString()} MAD</span>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-500/10">
                              <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">Encaissé</span>
                              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{paymentSummary.totalPaid.toLocaleString()} MAD</span>
                            </div>
                            <div className="p-2 rounded-xl bg-destructive/10 col-span-2">
                              <span className="text-destructive block text-[10px]">Reste à Payer</span>
                              <span className="font-black font-mono text-destructive text-sm">{paymentSummary.remainingAmount.toLocaleString()} MAD</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                            {!paymentSummary.isFullyPaid && (
                              <PaymentDialog
                                contractId={contract.id}
                                contractNumber={contract.contract_number}
                                customerName={contract.customer_name}
                                remainingAmount={paymentSummary.remainingAmount}
                                onPayment={handlePayment}
                              >
                                <Button size="sm" className="flex-1 rounded-xl bg-emerald-600 text-white font-bold text-xs h-9">
                                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Régler
                                </Button>
                              </PaymentDialog>
                            )}
                            <PaymentHistoryDialog
                              contractId={contract.id}
                              contractNumber={contract.contract_number}
                              customerName={contract.customer_name}
                              payments={payments}
                              totalAmount={summary?.total || contract.total_amount}
                              totalPaid={paymentSummary.totalPaid}
                              remainingAmount={paymentSummary.remainingAmount}
                            >
                              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9">
                                Historique
                              </Button>
                            </PaymentHistoryDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {totalContractsPages > 1 && (
                  <div className="mt-4 border-t border-border/30 pt-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Page {contractsPage} sur {totalContractsPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setContractsPage((p) => Math.max(1, p - 1))} disabled={contractsPage <= 1} className="rounded-xl text-xs">
                        Précédent
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setContractsPage((p) => Math.min(totalContractsPages, p + 1))} disabled={contractsPage >= totalContractsPages} className="rounded-xl text-xs">
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: DÉPENSES DIVERSES */}
          <TabsContent value="expenses" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">Gestion des Dépenses Diverses</h3>
                  <p className="text-xs text-muted-foreground">Charges administratives, loyers, carburant et fournitures</p>
                </div>
                <MiscellaneousExpenseDialog />
              </div>

              {expensesLoading ? (
                <div className="text-center py-10 text-xs text-muted-foreground">Chargement des dépenses...</div>
              ) : (
                <MiscellaneousExpenseTable expenses={miscellaneousExpenses} />
              )}
            </Card>
          </TabsContent>

          {/* TAB 4: DÉPENSES VÉHICULES */}
          <TabsContent value="vehicle_expenses" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-foreground">Dépenses Véhicules par Immatriculation</h3>
                  <p className="text-xs text-muted-foreground">Ventilation mensuelle des charges affectées à la flotte</p>
                </div>
                <Link to="/expenses">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold">
                    Module Dépenses
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
                  <span className="text-[10px] uppercase font-black text-destructive block">Total Dépenses Véhicules</span>
                  <span className="text-2xl font-black font-mono text-destructive mt-0.5 block">
                    -{monthlyVehicleExpensesData.total.toLocaleString()} MAD
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-center">
                  <span className="text-[10px] uppercase font-black text-muted-foreground block">Lignes d'Écritures</span>
                  <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                    {monthlyVehicleExpensesData.rows.length}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 text-center">
                  <span className="text-[10px] uppercase font-black text-muted-foreground block">Mois Analysé</span>
                  <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">
                    {monthlyVehicleExpensesData.monthKey}
                  </span>
                </div>
              </div>

              <ScrollArea className="h-96">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border/60 uppercase font-black text-muted-foreground">
                        <th className="py-3 px-3">Véhicule</th>
                        <th className="py-3 px-3">Type de Dépense</th>
                        <th className="py-3 px-3">Montant</th>
                        <th className="py-3 px-3">Période</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {monthlyVehicleExpensesData.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20">
                          <td className="py-3 px-3 font-bold">{row.vehicleName}</td>
                          <td className="py-3 px-3"><Badge variant="secondary">{row.expenseType}</Badge></td>
                          <td className="py-3 px-3 font-mono font-bold text-destructive">-{row.amount.toLocaleString()} MAD</td>
                          <td className="py-3 px-3 text-muted-foreground">{row.monthYear}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ANDROID FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center font-black active:scale-95 transition-transform"
        aria-label="Opération Trésorerie"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* MOBILE OPERATIONS BOTTOM SHEET */}
      <Dialog open={isMobileDrawerOpen} onOpenChange={setIsMobileDrawerOpen}>
        <DialogContent className="w-full max-w-lg p-0 rounded-t-[2.5rem] rounded-b-none sm:rounded-[2rem] border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl fixed bottom-0 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-auto max-h-[85vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1 sm:hidden" />
          <div className="p-6 pb-4 border-b border-border/40 flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">Actions de Trésorerie</DialogTitle>
              <DialogDescription className="text-xs font-medium">Opérations rapides d'encaissement et de banque</DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsMobileDrawerOpen(false)} className="rounded-full w-8 h-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                setActiveTab("contracts");
              }}
              className="p-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm text-foreground">Encaisser Créance</p>
                <p className="text-[10px] text-muted-foreground">Régler un contrat</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                handleDeleteRemainingDebts();
              }}
              className="p-4 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm text-foreground">Solder Dettes</p>
                <p className="text-[10px] text-muted-foreground">Clôture automatique</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                setActiveTab("expenses");
              }}
              className="p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm text-foreground">Dépense Diverse</p>
                <p className="text-[10px] text-muted-foreground">Frais d'exploitation</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsMobileDrawerOpen(false);
                handleRefresh();
              }}
              className="p-4 rounded-2xl bg-muted/40 hover:bg-muted border border-border/50 text-left transition-all active:scale-95 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center font-black">
                <History className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm text-foreground">Actualiser Flux</p>
                <p className="text-[10px] text-muted-foreground">Synchroniser caisse</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Recette;
