import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CreditCard, Coins, Banknote, CheckCircle, Clock, Send, Building2, History, Search, LayoutGrid, Table2, ChevronUp, ChevronDown, BellRing, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useContracts } from "@/hooks/useContracts";
import { useMiscellaneousExpenses } from "@/hooks/useMiscellaneousExpenses";
import { getContractFinancialStatusWithPayments, recalculateContractFinancials } from "@/utils/contractFinancialStatus";
import type { Contract } from "@/services/localStorageService";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths, type Interval } from "date-fns";
import { fr } from "date-fns/locale";
import { computeContractSummary, getContractSummaryWithPayments, migrateAllContracts } from "@/utils/contractMath";
import { BankTransferDialog } from "@/components/BankTransferDialog";
import { ReportFilters, type TimeFilter } from "@/components/ReportFilters";
import { PDFExportButton } from "@/components/PDFExportButton";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { PaymentDialog, type PaymentData } from "@/components/PaymentDialog";
import { ContractMigrationButton } from "@/components/ContractMigrationButton";
import MiscellaneousExpenseDialog from "@/components/MiscellaneousExpenseDialog";
import MiscellaneousExpenseTable from "@/components/MiscellaneousExpenseTable";
import MiscellaneousExpenseChart from "@/components/MiscellaneousExpenseChart";
import type { Payment, PaymentSummary } from "@/types/payment";
import { PaymentHistoryDialog } from "@/components/PaymentHistoryDialog";
import { SettledContractsDialog } from "@/components/SettledContractsDialog";
import { localStorageService } from "@/services/localStorageService";
import { useExpenses } from "@/hooks/useExpenses";
import { useVehicles } from "@/hooks/useVehicles";
import { motion } from "framer-motion";
import type { MonthlyExpense } from "@/types/expense";

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

interface PieChartItem {
  name: string;
  value: number;
  color: string;
}

interface BarChartItem {
  mode: string;
  montant: number;
}

interface RepairPaymentMovement {
  id: string;
  amount: number;
  paymentMethod: "Espèces" | "Virement" | "Chèque";
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
  <Button variant="ghost" size="sm" className="px-0 font-semibold" onClick={onClick}>
    {label}
    {isActive ? (direction === "asc" ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />) : null}
  </Button>
);

const Recette = () => {
  const { contracts: allContracts, updateContract, refetch } = useContracts();
  const {
    expenses: miscellaneousExpenses,
    loading: expensesLoading,
    deleteExpense: deleteMiscellaneousExpense,
    refetch: refetchMiscellaneousExpenses
  } = useMiscellaneousExpenses();
  const { toast } = useToast();

  // Vehicle expenses
  const { monthlyExpenses } = useExpenses();
  const { vehicles } = useVehicles();
  
  // State for filters and charts visibility
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPieChart, setShowPieChart] = useState(true);
  const [activeTab, setActiveTab] = useLocalStorage<'analytics' | 'contracts' | 'expenses' | 'vehicle_expenses'>("recette:active-tab", "analytics");
  const [contractsViewMode, setContractsViewMode] = useLocalStorage<'table' | 'cards'>("recette:contracts-view-mode", "table");
  const [contractsSearch, setContractsSearch] = useState("");
  const [contractsSortKey, setContractsSortKey] = useLocalStorage<ContractsSortKey>("recette:contracts-sort-key", "remaining_amount");
  const [contractsSortDirection, setContractsSortDirection] = useLocalStorage<SortDirection>("recette:contracts-sort-direction", "desc");
  const [contractsPage, setContractsPage] = useState(1);
  
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
  const [bankTransfers, setBankTransfers] = useLocalStorage<BankTransfer[]>("bankTransfers", []);
  const [bankBalance, setBankBalance] = useLocalStorage<number>("bankBalance", 0);
  
  // Payments tracking
  const [payments, setPayments] = useLocalStorage<Payment[]>("payments", []);
  const [cashBalance, setCashBalance] = useLocalStorage<number>("cashBalance", 0);
  const [bankAccount, setBankAccount] = useLocalStorage<number>("bankAccount", 0);
  const [auditLogs, setAuditLogs] = useLocalStorage<AuditLogEntry[]>("recette:audit-logs", []);
  const [cashAlertThreshold, setCashAlertThreshold] = useLocalStorage<number>("recette:cash-alert-threshold", 2000);
  const [bankAlertThreshold, setBankAlertThreshold] = useLocalStorage<number>("recette:bank-alert-threshold", 5000);
  const contractsPerPage = 10;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const appendAuditLog = (entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
    const newLog: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 300));
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Actualisé",
      description: "Les données ont été actualisées",
      variant: "default"
    });
  };

  const getContractPaymentSummary = (contractId: string): PaymentSummary => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      return {
        totalPaid: 0,
        remainingAmount: 0,
        isFullyPaid: false,
        payments: []
      };
    }

    const contractSummary = computeContractSummary(contract, { advanceMode: 'field' });
    const contractPayments = payments.filter(p => p.contractId === contractId);
    const additionalPayments = contractPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPaid = contractSummary.avance + additionalPayments;
    const remainingAmount = Math.max(0, contractSummary.total - totalPaid);
    
    return {
      totalPaid,
      remainingAmount,
      isFullyPaid: remainingAmount <= 0,
      payments: contractPayments
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

  useEffect(() => {
    if (allContracts.length > 0) {
      const migrationDone = localStorage.getItem('contractMath_migration_done');
      if (!migrationDone) {
        migrateAllContracts();
        localStorage.setItem('contractMath_migration_done', 'true');
      }
    }
  }, [allContracts.length]);

  // Handle bank transfers
  const handleBankTransfer = (transfer: BankTransfer) => {
    setBankTransfers(prev => [...prev, transfer]);

    if (transfer.type === 'cash') {
      // Espèces -> Banque
      setCashBalance(prev => Math.max(0, prev - transfer.amount));
      setBankBalance(prev => prev + transfer.netAmount);
    } else if (transfer.type === 'check') {
      // Chèque -> Banque
      setBankBalance(prev => prev + transfer.netAmount);
    } else if (transfer.type === 'bank_to_cash') {
      setBankBalance(prev => Math.max(0, prev - transfer.amount));
      setCashBalance(prev => prev + transfer.netAmount);
    }

    appendAuditLog({
      action: "bank_transfer_created",
      details: `Transfert ${transfer.type}`,
      amount: transfer.amount,
      reference: transfer.reference
    });
  };

  // Handle bank transfer deletion
  const handleDeleteBankTransfer = (transferId: string) => {
    const transfer = bankTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    setBankTransfers(prev => prev.filter(t => t.id !== transferId));

    if (transfer.type === 'cash') {
      // Undo Espèces -> Banque
      setCashBalance(prev => prev + transfer.amount);
      setBankBalance(prev => Math.max(0, prev - transfer.netAmount));
    } else if (transfer.type === 'check') {
      // Undo Chèque -> Banque
      setBankBalance(prev => Math.max(0, prev - transfer.netAmount));
    } else if (transfer.type === 'bank_to_cash') {
      // Undo Banque -> Espèces
      setBankBalance(prev => prev + transfer.amount);
      setCashBalance(prev => Math.max(0, prev - transfer.netAmount));
    }

    toast({
      title: "Transfert supprimé",
      description: `Le transfert de ${transfer.amount.toLocaleString()} MAD a été supprimé`,
      variant: "default"
    });

    appendAuditLog({
      action: "bank_transfer_deleted",
      details: `Suppression transfert ${transfer.type}`,
      amount: transfer.amount,
      reference: transfer.reference
    });
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
      
      totalEncaisse += paymentSummary.totalPaid;
      
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

    const repairPayments = localStorageService.getAll<RepairPaymentMovement>('repairPayments');
    let repairsEspeces = 0;
    let repairsVirements = 0;
    let repairsCheques = 0;
    repairPayments.forEach((p) => {
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
      .filter((e) => e.month_year === currentMonthKey)
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

  // Calculate analytics statistics using filtered contracts for financial analysis
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
      
      totalEncaisse += paymentSummary.totalPaid;
      
      if (paymentSummary.isFullyPaid) {
        totalSolde += total;
      } else if (paymentSummary.remainingAmount > 0) {
        totalDettes += paymentSummary.remainingAmount;
      }

      if (advance > 0) {
        const paymentMethod = contract.payment_method;
        if (paymentMethod === 'Espèces') {
          totalEspeces += advance;
        } else if (paymentMethod === 'Chèque') {
          totalCheques += advance;
        } else if (paymentMethod === 'Virement') {
          totalVirements += advance;
        }
      }
    });

    // Add filtered payments
    payments.filter(payment => 
      analyticsFilteredContracts.some(contract => contract.id === payment.contractId)
    ).forEach(payment => {
      if (payment.paymentMethod === 'Espèces') {
        totalEspeces += payment.amount;
      } else if (payment.paymentMethod === 'Virement') {
        totalVirements += payment.amount;
      } else if (payment.paymentMethod === 'Chèque') {
        totalCheques += payment.amount;
      }
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

  // Data for pie chart (répartition des paiements)
  const pieChartData = useMemo(() => {
    const currentData = [
      { name: "Espèces", value: analyticsStats.totalEspeces, color: "#10b981" },
      { name: "Chèques", value: analyticsStats.totalCheques, color: "#3b82f6" },
      { name: "Virements", value: analyticsStats.totalVirements, color: "#f59e0b" }
    ].filter(item => item.value > 0);
    
    // Store frozen data when chart gets frozen
    if (freezePieChart && frozenPieData.length === 0) {
      setFrozenPieData(currentData);
      return currentData;
    }
    
    return freezePieChart ? frozenPieData : currentData;
  }, [analyticsStats, freezePieChart, frozenPieData]);

  // Data for bar chart (montants par mode de paiement)
  const barChartData = useMemo(() => {
    const currentData = [
      { mode: "Espèces", montant: analyticsStats.totalEspeces },
      { mode: "Chèques", montant: analyticsStats.totalCheques },
      { mode: "Virements", montant: analyticsStats.totalVirements }
    ];
    
    // Store frozen data when chart gets frozen
    if (freezeBarChart && frozenBarData.length === 0) {
      setFrozenBarData(currentData);
      return currentData;
    }
    
    return freezeBarChart ? frozenBarData : currentData;
  }, [analyticsStats, freezeBarChart, frozenBarData]);

  // Data for line chart (historique mensuel)
  const lineChartData = useMemo(() => {
    const months = [
      "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
      "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
    ];

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

  // Filter contracts in waiting and in progress (both open and closed with remaining amounts)  
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
          { status: "paye", label: "Payé", color: "bg-green-100 text-green-800", description: "Contrat entièrement soldé" } :
          financialStatus,
        payment_summary: paymentSummary
      };
    }).sort((a, b) => b.remaining_amount - a.remaining_amount);
  }, [contracts, payments]);

  // Filter settled contracts (contracts with no remaining amount)
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
        title: "Contrats en retard",
        description: `${overdueContracts.length} contrat(s) avec échéance dépassée`,
        level: "critical"
      });
    }
    if (nonDepositedChecks.length > 0) {
      const totalChecks = nonDepositedChecks.reduce((sum, item) => sum + item.amount, 0);
      alerts.push({
        id: "checks_not_deposited",
        title: "Chèques non encaissés",
        description: `${nonDepositedChecks.length} chèque(s) pour ${totalChecks.toLocaleString()} MAD`,
        level: "warning"
      });
    }
    if (stats.totalEspeces < cashAlertThreshold) {
      alerts.push({
        id: "low_cash",
        title: "Caisse faible",
        description: `Caisse ${stats.totalEspeces.toLocaleString()} MAD sous seuil ${cashAlertThreshold.toLocaleString()} MAD`,
        level: "warning"
      });
    }
    if (stats.bankBalance < bankAlertThreshold) {
      alerts.push({
        id: "low_bank_balance",
        title: "Solde banque faible",
        description: `Banque ${stats.bankBalance.toLocaleString()} MAD sous seuil ${bankAlertThreshold.toLocaleString()} MAD`,
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
        .filter((expense) => expense.month_year === monthKey)
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

  // Reset frozen data when unfreezing
  const handleFreezePieChart = (freeze: boolean) => {
    setFreezePieChart(freeze);
    if (!freeze) {
      setFrozenPieData([]);
    }
  };
  
  const handleFreezeBarChart = (freeze: boolean) => {
    setFreezeBarChart(freeze);
    if (!freeze) {
      setFrozenBarData([]);
    }
  };

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

  // Handle delete functions
  const handleDeleteTotalEncaisse = () => {
    setPayments([]);
    setCashBalance(0);
    setBankAccount(0);
    appendAuditLog({
      action: "payments_reset",
      details: "Réinitialisation de tous les paiements"
    });
    toast({
      title: "Total Encaissé réinitialisé",
      description: "Tous les paiements ont été supprimés",
      variant: "default"
    });
  };

  const handleDeleteTotalEspeces = () => {
    setCashBalance(0);
    const updatedPayments = payments.filter(p => p.paymentMethod !== 'Espèces');
    setPayments(updatedPayments);
    appendAuditLog({
      action: "cash_payments_deleted",
      details: "Suppression des paiements espèces"
    });
    toast({
      title: "Total Espèces supprimé",
      description: "Le solde espèces a été remis à zéro",
      variant: "default"
    });
  };

  const handleDeleteBankAccount = () => {
    setBankAccount(0);
    setBankBalance(0);
    const updatedPayments = payments.filter(p => p.paymentMethod !== 'Virement');
    setPayments(updatedPayments);
    appendAuditLog({
      action: "bank_payments_deleted",
      details: "Suppression des paiements virement"
    });
    toast({
      title: "Compte Banque supprimé",
      description: "Le solde banque a été remis à zéro",
      variant: "default"
    });
  };

  const handleDeleteTotalChecks = () => {
    const updatedPayments = payments.filter(p => p.paymentMethod !== 'Chèque');
    setPayments(updatedPayments);
    appendAuditLog({
      action: "checks_deleted",
      details: "Suppression des paiements chèques"
    });
    toast({
      title: "Total Chèques supprimé",
      description: "Tous les paiements par chèque ont été supprimés",
      variant: "default"
    });
  };

  const handleDeleteMiscExpenses = async () => {
    if (miscellaneousExpenses.length === 0) {
      toast({
        title: "Aucune dépense",
        description: "Il n'y a aucune dépense diverse à supprimer",
        variant: "default"
      });
      return;
    }
    await Promise.all(miscellaneousExpenses.map((expense) => Promise.resolve(deleteMiscellaneousExpense(expense.id))));
    refetchMiscellaneousExpenses();
    appendAuditLog({
      action: "misc_expenses_deleted",
      details: "Suppression des dépenses diverses",
      amount: miscellaneousExpenses.reduce((sum, expense) => sum + expense.amount, 0)
    });
    toast({
      title: "Dépenses supprimées",
      description: "Toutes les dépenses diverses ont été supprimées",
      variant: "default"
    });
  };

  const handleDeleteRemainingDebts = async () => {
    const debtsToSettle = contractsWithDebts.filter((contract) => contract.remaining_amount > 0);
    if (debtsToSettle.length === 0) {
      toast({
        title: "Aucune dette",
        description: "Il n'y a aucune dette restante à solder",
        variant: "default"
      });
      return;
    }

    const settlementDate = new Date().toISOString();
    const settlementPayments: Payment[] = debtsToSettle.map((contract) => ({
      id: crypto.randomUUID(),
      contractId: contract.id,
      contractNumber: contract.contract_number,
      customerName: contract.customer_name,
      amount: contract.remaining_amount,
      paymentMethod: contract.payment_method || "Espèces",
      paymentDate: settlementDate,
      createdAt: settlementDate,
      checkDepositStatus: contract.payment_method === "Chèque" ? "encaissé" : undefined
    }));

    setPayments((prev) => [...prev, ...settlementPayments]);
    await Promise.all(debtsToSettle.map((contract) => updateContract(contract.id, { status: "completed" })));
    await refetch();

    appendAuditLog({
      action: "debts_settled",
      details: "Solder les dettes restantes automatiquement",
      amount: settlementPayments.reduce((sum, payment) => sum + payment.amount, 0)
    });

    toast({
      title: "Dettes soldées",
      description: `${debtsToSettle.length} contrat(s) soldé(s) automatiquement`,
      variant: "default"
    });
  };

  const handlePayment = async (contractId: string, paymentData: PaymentData) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      contractId,
      contractNumber: contract.contract_number,
      customerName: contract.customer_name,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      paymentDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
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

    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    appendAuditLog({
      action: "payment_created",
      details: `Paiement enregistré pour ${contract.contract_number}`,
      amount: paymentData.amount,
      reference: paymentData.checkReference
    });

    // Get updated payment summary after adding the new payment
    const contractPayments = newPayments.filter(p => p.contractId === contractId);
    const additionalPayments = contractPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const contractSummary = computeContractSummary(contract, { advanceMode: 'field' });
    const totalPaid = contractSummary.avance + additionalPayments;
    const newRemainingAmount = Math.max(0, contractSummary.total - totalPaid);
    
    if (newRemainingAmount <= 0) {
      await updateContract(contractId, {
        status: 'completed'
      });
      await refetch();
      
      toast({
        title: "✅ Contrat soldé",
        description: `Le contrat ${contract.contract_number} est maintenant entièrement payé`,
        variant: "default"
      });
    } else {
      await refetch();
      
      toast({
        title: "✅ Paiement enregistré",
        description: `Paiement de ${paymentData.amount.toLocaleString()} MAD enregistré. Reste: ${newRemainingAmount.toLocaleString()} MAD`,
        variant: "default"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Tableau des Recettes
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-1">
              Gestion des <span className="text-primary">Recettes</span>
            </h1>
            <p className="text-muted-foreground font-medium">
              Vue d'ensemble financière, suivi des encaissements et équilibre caisse / banque.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2 rounded-[var(--radius)]"
            >
              <History className="w-4 h-4" />
              Actualiser
            </Button>
            <ContractMigrationButton />
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
              <Button className="flex items-center gap-2 rounded-[var(--radius)]">
                <Send className="w-4 h-4" />
                Transfert Banque
              </Button>
            </BankTransferDialog>
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2 rounded-[var(--radius)]">
                <ArrowLeft className="w-4 h-4" />
                Retour à l'Accueil
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Report Filters */}
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
          onFreezePieChartChange={handleFreezePieChart}
          freezeBarChart={freezeBarChart}
          onFreezeBarChartChange={handleFreezeBarChart}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {/* Tableau récapitulatif avec dépenses diverses */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Encaissé</CardTitle>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteTotalEncaisse}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {stats.totalEncaisse.toLocaleString()} MAD
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Espèces</CardTitle>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-green-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteTotalEspeces}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {(freezeCash ? frozenCashAmount : stats.totalEspeces).toLocaleString()} MAD
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFreezeCash(!freezeCash)}
                className="mt-1"
              >
                {freezeCash ? '🔒 Figé' : '🔓 Actuel'}
              </Button>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compte Banque</CardTitle>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteBankAccount}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">
                {stats.bankBalance.toLocaleString()} MAD
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Chèques</CardTitle>
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-yellow-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteTotalChecks}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-600">
                {(freezeChecks ? frozenChecksAmount : stats.totalCheques).toLocaleString()} MAD
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleFreezeChecks(!freezeChecks)}
                className="mt-1"
              >
                {freezeChecks ? '🔒 Figé' : '🔓 Actuel'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dépenses Diverses</CardTitle>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteMiscExpenses}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                -{stats.totalDivers.toLocaleString()} MAD
              </div>
            </CardContent>
          </Card>

          {/* NEW: Vehicle Expenses card */}
          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dépenses Véhicules</CardTitle>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                -{(stats.totalVehiculeExpenses || 0).toLocaleString()} MAD
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-red-500/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dettes Restantes</CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteRemainingDebts}
                  className="text-red-500 hover:text-red-700 p-1 h-auto"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {stats.totalDettes.toLocaleString()} MAD
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BellRing className="h-4 w-4 text-amber-600" />
                Alertes intelligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {smartAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune alerte active.</p>
              ) : (
                smartAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-3 ${alert.level === "critical" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
                  >
                    <p className={`text-sm font-semibold ${alert.level === "critical" ? "text-red-700" : "text-amber-700"}`}>
                      {alert.title}
                    </p>
                    <p className={`text-sm ${alert.level === "critical" ? "text-red-600" : "text-amber-600"}`}>
                      {alert.description}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-primary" />
                Seuils d'alerte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Seuil caisse (MAD)</label>
                <Input
                  type="number"
                  min={0}
                  value={cashAlertThreshold}
                  onChange={(e) => setCashAlertThreshold(Math.max(0, Number(e.target.value || 0)))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Seuil banque (MAD)</label>
                <Input
                  type="number"
                  min={0}
                  value={bankAlertThreshold}
                  onChange={(e) => setBankAlertThreshold(Math.max(0, Number(e.target.value || 0)))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">KPI Mensuel Comparatif</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Mois courant</p>
              <p className="font-semibold">{monthlyKpis.currentMonthKey}</p>
              <p className="text-sm text-green-600">{monthlyKpis.current.paymentsTotal.toLocaleString()} MAD encaissés</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Mois précédent</p>
              <p className="font-semibold">{monthlyKpis.previousMonthKey}</p>
              <p className="text-sm text-green-600">{monthlyKpis.previous.paymentsTotal.toLocaleString()} MAD encaissés</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Net courant</p>
              <p className={`font-semibold ${monthlyKpis.current.netTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                {monthlyKpis.current.netTotal.toLocaleString()} MAD
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Variation vs précédent</p>
              <p className={`font-semibold ${monthlyKpis.delta >= 0 ? "text-green-600" : "text-red-600"}`}>
                {monthlyKpis.delta.toLocaleString()} MAD ({monthlyKpis.deltaPercent.toFixed(1)}%)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audit Trail Financier</CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune opération enregistrée.</p>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {auditLogs.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/50 p-3">
                      <p className="text-sm font-semibold">{entry.action}</p>
                      <p className="text-xs text-muted-foreground">{entry.details}</p>
                      <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                        <span>{format(parseISO(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: fr })}</span>
                        <span>{entry.amount ? `${entry.amount.toLocaleString()} MAD` : "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'analytics' | 'contracts' | 'expenses' | 'vehicle_expenses')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics">📊 Analyses & Graphiques</TabsTrigger>
            <TabsTrigger value="contracts">💰 Contrats & Paiements</TabsTrigger>
            <TabsTrigger value="expenses">📋 Dépenses Diverses</TabsTrigger>
            <TabsTrigger value="vehicle_expenses">🚗 Dépenses Véhicules</TabsTrigger>
          </TabsList>
          
          <TabsContent value="contracts" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Liste des contrats avec dettes */}
              <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>Contrats en Attente et en cours de Paiement</CardTitle>
                <Badge variant="secondary">{sortedContractsWithDebts.length} contrat{sortedContractsWithDebts.length > 1 ? "s" : ""}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={contractsSearch}
                      onChange={(e) => setContractsSearch(e.target.value)}
                      placeholder="Rechercher contrat, locataire ou statut..."
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant={contractsViewMode === "table" ? "default" : "outline"} onClick={() => setContractsViewMode("table")}>
                      <Table2 className="w-4 h-4 mr-1.5" />
                      Table
                    </Button>
                    <Button size="sm" variant={contractsViewMode === "cards" ? "default" : "outline"} onClick={() => setContractsViewMode("cards")}>
                      <LayoutGrid className="w-4 h-4 mr-1.5" />
                      Cards
                    </Button>
                  </div>
                </div>
                {contractsViewMode === "table" ? (
                <ScrollArea className="h-[600px]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10 bg-background">
                        <tr className="border-b">
                          <th className="text-left p-2">
                            <SortableHeader
                              label="Contrat"
                              isActive={contractsSortKey === "contract_number"}
                              direction={contractsSortDirection}
                              onClick={() => toggleContractsSort("contract_number")}
                            />
                          </th>
                          <th className="text-left p-2">
                            <SortableHeader
                              label="Locataire"
                              isActive={contractsSortKey === "customer_name"}
                              direction={contractsSortDirection}
                              onClick={() => toggleContractsSort("customer_name")}
                            />
                          </th>
                          <th className="text-left p-2">
                            <SortableHeader
                              label="Prix/Jour"
                              isActive={contractsSortKey === "daily_rate"}
                              direction={contractsSortDirection}
                              onClick={() => toggleContractsSort("daily_rate")}
                            />
                          </th>
                          <th className="text-left p-2">
                            <SortableHeader
                              label="Durée"
                              isActive={contractsSortKey === "duration"}
                              direction={contractsSortDirection}
                              onClick={() => toggleContractsSort("duration")}
                            />
                          </th>
                          <th className="text-left p-2">Total</th>
                          <th className="text-left p-2">Avance</th>
                          <th className="text-left p-2">
                            <SortableHeader
                              label="Reste à Payer"
                              isActive={contractsSortKey === "remaining_amount"}
                              direction={contractsSortDirection}
                              onClick={() => toggleContractsSort("remaining_amount")}
                            />
                          </th>
                          <th className="text-left p-2">Statut</th>
                          <th className="text-left p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedContractsWithDebts.map((contract) => {
                          const startDate = contract.start_date ? parseISO(contract.start_date) : null;
                          const endDate = contract.end_date ? parseISO(contract.end_date) : null;
                          const summary = getContractSummaryWithPayments(contract.id, contracts);
                          const duration = summary?.duration || 0;

                          return (
                            <tr key={contract.id} className="border-b hover:bg-accent/50">
                              <td className="p-2 font-medium">
                                <div className="flex flex-col">
                                  <span>{contract.contract_number}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} - {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2">{contract.customer_name}</td>
                              <td className="p-2">{(contract.daily_rate || 0).toLocaleString()} MAD</td>
                              <td className="p-2">{duration} jours</td>
                              <td className="p-2 font-semibold">{(summary?.total || 0).toLocaleString()} MAD</td>
                              <td className="p-2 text-green-600">{(summary?.avance || 0).toLocaleString()} MAD</td>
                              <td className="p-2 text-red-600 font-semibold">
                                {(summary?.reste || 0).toLocaleString()} MAD
                              </td>
                              <td className="p-2">
                                <Badge className={contract.financial_status.color}>
                                  {contract.financial_status.label}
                                </Badge>
                                <div className="text-xs text-gray-500 mt-1">
                                  {contract.financial_status.description}
                                </div>
                              </td>
                               <td className="p-2">
                                 <div className="flex items-center gap-2">
                                   {contract.remaining_amount > 0 ? (
                                     <PaymentDialog
                                       contractId={contract.id}
                                       contractNumber={contract.contract_number}
                                       customerName={contract.customer_name}
                                       remainingAmount={contract.remaining_amount}
                                       onPayment={handlePayment}
                                     >
                                       <Button
                                         size="sm"
                                         className="bg-green-600 hover:bg-green-700 text-white"
                                       >
                                         <CheckCircle className="w-4 h-4 mr-1" />
                                         Régler
                                       </Button>
                                     </PaymentDialog>
                                   ) : (
                                     <Badge className="bg-green-100 text-green-800">
                                       Soldé
                                     </Badge>
                                   )}
                                     
                                      <PaymentHistoryDialog
                                        contractId={contract.id}
                                        contractNumber={contract.contract_number}
                                        customerName={contract.customer_name}
                                        payments={payments}
                                        totalAmount={summary?.total || contract.total_amount}
                                        totalPaid={summary?.avance || 0}
                                        remainingAmount={summary?.reste || contract.remaining_amount}
                                      >
                                        <Button variant="outline" size="sm">
                                          👁️ Détails
                                        </Button>
                                      </PaymentHistoryDialog>
                                 </div>
                               </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    
                    {sortedContractsWithDebts.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Aucun contrat en attente ou en cours de paiement
                      </div>
                    )}
                  </div>
                </ScrollArea>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {sortedContractsWithDebts.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-gray-500">
                        Aucun contrat en attente ou en cours de paiement
                      </div>
                    ) : (
                      paginatedContractsWithDebts.map((contract, index) => {
                        const startDate = contract.start_date ? parseISO(contract.start_date) : null;
                        const endDate = contract.end_date ? parseISO(contract.end_date) : null;
                        const summary = getContractSummaryWithPayments(contract.id, contracts);
                        return (
                          <motion.div
                            key={contract.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            <Card className="h-full border border-border/50">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <CardTitle className="text-base">{contract.contract_number}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{contract.customer_name}</p>
                                  </div>
                                  <Badge className={contract.financial_status.color}>{contract.financial_status.label}</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  {startDate ? format(startDate, 'dd/MM/yyyy', { locale: fr }) : 'N/A'} - {endDate ? format(endDate, 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="rounded-lg bg-muted/40 p-2">
                                    <p className="text-xs text-muted-foreground">Total</p>
                                    <p className="font-semibold">{(summary?.total || 0).toLocaleString()} MAD</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 p-2">
                                    <p className="text-xs text-muted-foreground">Avance</p>
                                    <p className="font-semibold text-green-600">{(summary?.avance || 0).toLocaleString()} MAD</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 p-2 col-span-2">
                                    <p className="text-xs text-muted-foreground">Reste à payer</p>
                                    <p className="font-semibold text-red-600">{(summary?.reste || 0).toLocaleString()} MAD</p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {contract.remaining_amount > 0 ? (
                                    <PaymentDialog
                                      contractId={contract.id}
                                      contractNumber={contract.contract_number}
                                      customerName={contract.customer_name}
                                      remainingAmount={contract.remaining_amount}
                                      onPayment={handlePayment}
                                    >
                                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Régler
                                      </Button>
                                    </PaymentDialog>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800">Soldé</Badge>
                                  )}
                                  <PaymentHistoryDialog
                                    contractId={contract.id}
                                    contractNumber={contract.contract_number}
                                    customerName={contract.customer_name}
                                    payments={payments}
                                    totalAmount={summary?.total || contract.total_amount}
                                    totalPaid={summary?.avance || 0}
                                    remainingAmount={summary?.reste || contract.remaining_amount}
                                  >
                                    <Button variant="outline" size="sm">👁️ Détails</Button>
                                  </PaymentHistoryDialog>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}

                {totalContractsPages > 1 && (
                  <div className="mt-4 border-t pt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Page {contractsPage} / {totalContractsPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setContractsPage((prev) => Math.max(1, prev - 1))}
                        disabled={contractsPage <= 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setContractsPage((prev) => Math.min(totalContractsPages, prev + 1))}
                        disabled={contractsPage >= totalContractsPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Bank Transfer Action */}
                <div className="mt-4 pt-4 border-t flex justify-center">
                  <BankTransferDialog
                    totalCash={stats.totalEspeces}
                    totalChecks={stats.totalCheques}
                    bankBalance={stats.bankBalance}
                    onTransfer={handleBankTransfer}
                  >
                    <Button className="flex items-center gap-2" size="lg">
                      <Send className="w-4 h-4" />
                      Transfert Banque
                    </Button>
                  </BankTransferDialog>
                </div>
                
                {/* Settled Contracts History Button */}
                <div className="mt-4 pt-4 border-t flex justify-center">
                  <SettledContractsDialog
                    settledContracts={settledContracts}
                    payments={payments}
                  >
                    <Button variant="outline" className="flex items-center gap-2" size="lg">
                      <History className="w-4 h-4" />
                      Historique Soldé ({settledContracts.length})
                    </Button>
                  </SettledContractsDialog>
                </div>
              </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Gestion des Dépenses Diverses</h3>
                  <p className="text-sm text-gray-600">Gérez vos charges et dépenses opérationnelles</p>
                </div>
                <MiscellaneousExpenseDialog />
              </div>
              
              {expensesLoading ? (
                <div className="text-center py-8">Chargement des dépenses...</div>
              ) : (
                <MiscellaneousExpenseTable expenses={miscellaneousExpenses} />
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-card p-6 rounded-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Analyses Financières & Graphiques</h2>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPieChart(!showPieChart)}
                  >
                    {showPieChart ? '🥧 Masquer Pie Chart' : '🥧 Pie Chart'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBarChart(!showBarChart)}
                  >
                    {showBarChart ? '📊 Masquer Bar Chart' : '📊 Bar Chart'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowLineChart(!showLineChart)}
                  >
                    {showLineChart ? '📈 Masquer Line Chart' : '📈 Line Chart'}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-muted p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium mb-4">Filtres</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Locataire</label>
                    <Input
                      type="text"
                      placeholder="Nom du locataire..."
                      value={tenantFilter}
                      onChange={(e) => setTenantFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">N° Contrat</label>
                    <Input
                      type="text"
                      placeholder="Numéro de contrat..."
                      value={contractNumberFilter}
                      onChange={(e) => setContractNumberFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Date</label>
                    <Input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid gap-6">
                {/* Charts - Graphiques de répartition */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pie Chart - Répartition par mode de paiement */}
                  {showPieChart && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Répartition par Mode de Paiement
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowPieChart(false)}
                            className="text-red-500 hover:text-red-700"
                          >
                            👁️‍🗨️ Masquer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFreezePieChart(!freezePieChart)}
                          >
                            {freezePieChart ? '🔒 Figé' : '🔓 Actuel'}
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
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
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!showPieChart && (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-12">
                      <Button
                        variant="outline"
                        onClick={() => setShowPieChart(true)}
                        className="flex items-center gap-2"
                      >
                        👁️ Afficher Pie Chart
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Bar Chart - Montants par mode de paiement */}
                {showBarChart && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Montants par Mode de Paiement
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowBarChart(false)}
                            className="text-red-500 hover:text-red-700"
                          >
                            👁️‍🗨️ Masquer
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFreezeBarChart(!freezeBarChart)}
                          >
                            {freezeBarChart ? '🔒 Figé' : '🔓 Actuel'}
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="mode" />
                            <YAxis tickFormatter={(value) => `${value} MAD`} />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString()} MAD`} />
                            <Bar dataKey="montant" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!showBarChart && (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-12">
                      <Button
                        variant="outline"
                        onClick={() => setShowBarChart(true)}
                        className="flex items-center gap-2"
                      >
                        👁️ Afficher Bar Chart
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Line Chart - Historique mensuel */}
              {showLineChart && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Historique Mensuel - Recettes vs Dettes
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowLineChart(false)}
                        className="text-red-500 hover:text-red-700"
                      >
                        👁️‍🗨️ Masquer
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `${value} MAD`} />
                          <Tooltip formatter={(value: number) => `${value.toLocaleString()} MAD`} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="recettes" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Recettes Encaissées"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="dettes" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            name="Dettes en Cours"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dépenses diverses analytics */}
              {!expensesLoading && miscellaneousExpenses.length > 0 && (
                <MiscellaneousExpenseChart expenses={miscellaneousExpenses} />
              )}
              
              {miscellaneousExpenses.length === 0 && !expensesLoading && (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-gray-500 mb-4">Aucune dépense diverse pour afficher les analyses</p>
                    <MiscellaneousExpenseDialog trigger={
                      <Button>Ajouter votre première dépense</Button>
                    } />
                  </CardContent>
                </Card>
              )}
              </div>
            </motion.div>
          </TabsContent>

          {/* NEW: Vehicle expenses tab */}
          <TabsContent value="vehicle_expenses" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Dépenses Véhicules (mensuelles)</h3>
                  <p className="text-sm text-gray-600">Répartition mensuelle par véhicule pour {monthlyVehicleExpensesData.monthKey}</p>
                </div>
                <Link to="/depenses">
                  <Button variant="outline" size="sm">Ouvrir Gestion des Dépenses</Button>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total dépenses</p>
                    <p className="text-2xl font-black text-red-600">-{monthlyVehicleExpensesData.total.toLocaleString()} MAD</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Lignes</p>
                    <p className="text-2xl font-black">{monthlyVehicleExpensesData.rows.length}</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Mois sélectionné</p>
                    <p className="text-2xl font-black">{monthlyVehicleExpensesData.monthKey}</p>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-[500px]">
                {monthlyVehicleExpensesData.rows.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Aucune dépense véhicule pour ce mois</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
                    <table className="w-full">
                      <thead className="bg-muted/30">
                        <tr className="border-b">
                          <th className="text-left p-3">Véhicule</th>
                          <th className="text-left p-3">Type</th>
                          <th className="text-left p-3">Montant</th>
                          <th className="text-left p-3">Mois</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyVehicleExpensesData.rows.map((row, index) => (
                          <motion.tr
                            key={row.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="border-b hover:bg-accent/30"
                          >
                            <td className="p-3 font-medium">{row.vehicleName}</td>
                            <td className="p-3">
                              <Badge variant="secondary">{row.expenseType}</Badge>
                            </td>
                            <td className="p-3 text-red-600 font-semibold">-{row.amount.toLocaleString()} MAD</td>
                            <td className="p-3">{row.monthYear}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Recette;
