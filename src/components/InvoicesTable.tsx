import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Trash2,
  Eye,
  Filter,
  ArrowUpDown,
  CreditCard,
  Calendar,
  DollarSign,
  LayoutGrid,
  Table2,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  FileText,
  Building2,
  Receipt,
  X
} from "lucide-react";
import { useInvoices, Invoice } from "@/hooks/useInvoices";
import { useInvoicePDF } from "@/hooks/useInvoicePDF";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type SortKey = "date" | "amount" | "customer" | "status";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "kanban";
type InvoiceRole = "Comptable" | "Manager";
type SavedViewId =
  | "comptable_all"
  | "comptable_pending"
  | "comptable_overdue"
  | "comptable_paid"
  | "manager_overdue"
  | "manager_amount"
  | "manager_cashflow";

interface SavedViewPreset {
  id: SavedViewId;
  label: string;
  statusFilter: string;
  paymentFilter: string;
  sortPrimary: SortKey;
  sortSecondary: SortKey;
  sortDirection: SortDirection;
}

const statusLabels: Record<Invoice["status"], string> = {
  paid: "Payée",
  pending: "En attente",
  overdue: "En retard"
};

const getStatusBadge = (status: Invoice["status"]) => {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Payée
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1.5 shrink-0">
          <Clock3 className="w-3.5 h-3.5" />
          En attente
        </Badge>
      );
    case "overdue":
      return (
        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1.5 shrink-0 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          En retard
        </Badge>
      );
  }
};

const roleSavedViews: Record<InvoiceRole, SavedViewPreset[]> = {
  Comptable: [
    {
      id: "comptable_all",
      label: "Toutes les Factures",
      statusFilter: "all",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "desc"
    },
    {
      id: "comptable_pending",
      label: "À Encaisser",
      statusFilter: "pending",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "asc"
    },
    {
      id: "comptable_overdue",
      label: "Créances En Retard",
      statusFilter: "overdue",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "asc"
    },
    {
      id: "comptable_paid",
      label: "Règlements Payés",
      statusFilter: "paid",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "customer",
      sortDirection: "desc"
    }
  ],
  Manager: [
    {
      id: "manager_overdue",
      label: "Priorité Retards",
      statusFilter: "overdue",
      paymentFilter: "all",
      sortPrimary: "amount",
      sortSecondary: "date",
      sortDirection: "desc"
    },
    {
      id: "manager_amount",
      label: "Top Montants TTC",
      statusFilter: "all",
      paymentFilter: "all",
      sortPrimary: "amount",
      sortSecondary: "date",
      sortDirection: "desc"
    },
    {
      id: "manager_cashflow",
      label: "Cashflow à venir",
      statusFilter: "pending",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "asc"
    }
  ]
};

interface InvoicesTableProps {
  userRole?: InvoiceRole;
}

const InvoicesTable = ({ userRole = "Comptable" }: InvoicesTableProps) => {
  const { invoices, loading, deleteInvoice, updateInvoice } = useInvoices();
  const { generateInvoicePDF } = useInvoicePDF();
  const [savedViewByRole, setSavedViewByRole] = useLocalStorage<Record<InvoiceRole, SavedViewId>>("invoices:saved-view-by-role", {
    Comptable: "comptable_all",
    Manager: "manager_overdue"
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortPrimary, setSortPrimary] = useState<SortKey>("date");
  const [sortSecondary, setSortSecondary] = useState<SortKey>("amount");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedInvoiceForPreview, setSelectedInvoiceForPreview] = useState<Invoice | null>(null);
  const [bulkStatus, setBulkStatus] = useState<Invoice["status"]>("pending");
  const [activeSavedView, setActiveSavedView] = useState<SavedViewId>("comptable_all");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const paymentMethods = useMemo(() => {
    return Array.from(new Set(invoices.map((invoice) => invoice.paymentMethod))).filter(Boolean);
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const toValue = (invoice: Invoice, key: SortKey): number | string => {
      if (key === "date") return new Date(invoice.invoiceDate).getTime();
      if (key === "amount") return invoice.totalTTC;
      if (key === "customer") return invoice.customerName.toLowerCase();
      return invoice.status;
    };

    const searched = invoices.filter((invoice) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        term.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.customerName.toLowerCase().includes(term) ||
        (invoice.customerICE && invoice.customerICE.toLowerCase().includes(term)) ||
        (invoice.description && invoice.description.toLowerCase().includes(term));
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || invoice.paymentMethod === paymentFilter;
      const invoiceDate = new Date(invoice.invoiceDate);
      const matchesStart = !startDate || invoiceDate >= new Date(startDate);
      const matchesEnd = !endDate || invoiceDate <= new Date(endDate);
      return matchesSearch && matchesStatus && matchesPayment && matchesStart && matchesEnd;
    });

    return searched.sort((a, b) => {
      const primaryA = toValue(a, sortPrimary);
      const primaryB = toValue(b, sortPrimary);
      if (primaryA !== primaryB) {
        const direction = sortDirection === "asc" ? 1 : -1;
        return (primaryA > primaryB ? 1 : -1) * direction;
      }
      const secondaryA = toValue(a, sortSecondary);
      const secondaryB = toValue(b, sortSecondary);
      return secondaryA > secondaryB ? 1 : -1;
    });
  }, [endDate, invoices, paymentFilter, searchTerm, sortDirection, sortPrimary, sortSecondary, startDate, statusFilter]);

  const kanbanColumns = useMemo(() => {
    return [
      {
        key: "pending",
        title: "En attente",
        items: filteredInvoices.filter((invoice) => invoice.status === "pending"),
        color: "border-amber-500/40 bg-amber-500/5 text-amber-600 dark:text-amber-400"
      },
      {
        key: "overdue",
        title: "En retard (Échus)",
        items: filteredInvoices.filter((invoice) => invoice.status === "overdue"),
        color: "border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400"
      },
      {
        key: "paid",
        title: "Payées & Encaissées",
        items: filteredInvoices.filter((invoice) => invoice.status === "paid"),
        color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
      }
    ] as const;
  }, [filteredInvoices]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedInvoices(checked ? filteredInvoices.map((inv) => inv.id) : []);
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvoices((prev) => [...prev, invoiceId]);
      return;
    }
    setSelectedInvoices((prev) => prev.filter((id) => id !== invoiceId));
  };

  const handleDeleteSelected = async () => {
    if (!selectedInvoices.length) return;
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedInvoices.length} facture(s) ?`)) {
      for (const id of selectedInvoices) {
        await deleteInvoice(id);
      }
      setSelectedInvoices([]);
    }
  };

  const handleBulkStatus = async () => {
    if (!selectedInvoices.length) return;
    for (const id of selectedInvoices) {
      await updateInvoice(id, { status: bulkStatus });
    }
    setSelectedInvoices([]);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    await generateInvoicePDF({
      companyName: "BONA TOURS SARL",
      invoiceType: "FACTURE",
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerNumber: "",
      beneficiaryName: invoice.customerName,
      beneficiaryICE: invoice.customerICE || "",
      quantity: "1",
      unit: "J",
      description: invoice.description || "PRESTATION LOCATION DE VEHICULE",
      unitPrice: (invoice.totalHT || 0).toString(),
      totalHT: (invoice.totalHT || 0).toString(),
      tva: (invoice.tva || 0).toString(),
      totalTTC: (invoice.totalTTC || 0).toString(),
      totalWords: "",
      paymentMethod: invoice.paymentMethod || "CHEQUE"
    });
  };

  const handleDownloadSelected = async () => {
    const selected = invoices.filter((invoice) => selectedInvoices.includes(invoice.id));
    for (const invoice of selected) {
      await handleDownloadInvoice(invoice);
    }
  };

  const applySavedView = (viewId: SavedViewId, persist = true) => {
    const preset = roleSavedViews[userRole].find((view) => view.id === viewId);
    if (!preset) return;
    setActiveSavedView(preset.id);
    setStatusFilter(preset.statusFilter);
    setPaymentFilter(preset.paymentFilter);
    setSortPrimary(preset.sortPrimary);
    setSortSecondary(preset.sortSecondary);
    setSortDirection(preset.sortDirection);
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    if (persist) {
      setSavedViewByRole((prev) => ({ ...prev, [userRole]: preset.id }));
    }
  };

  useEffect(() => {
    const roleViews = roleSavedViews[userRole];
    const preferred = savedViewByRole[userRole];
    const fallback = roleViews[0].id;
    const initialId = roleViews.some((view) => view.id === preferred) ? preferred : fallback;
    const initialPreset = roleViews.find((view) => view.id === initialId);
    if (!initialPreset) return;
    setActiveSavedView(initialPreset.id);
    setStatusFilter(initialPreset.statusFilter);
    setPaymentFilter(initialPreset.paymentFilter);
    setSortPrimary(initialPreset.sortPrimary);
    setSortSecondary(initialPreset.sortSecondary);
    setSortDirection(initialPreset.sortDirection);
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  }, [savedViewByRole, userRole]);

  if (loading) {
    return <div className="text-center py-12 font-bold text-muted-foreground">Chargement des factures...</div>;
  }

  return (
    <div className="space-y-6">
      {/* View Presets & Mode Toggles Bar */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-border/60 shadow-xs"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {roleSavedViews[userRole].map((view) => (
            <Button
              key={view.id}
              size="sm"
              variant={activeSavedView === view.id ? "default" : "outline"}
              onClick={() => applySavedView(view.id)}
              className={`shrink-0 rounded-2xl font-bold text-xs h-9 px-4 transition-all ${
                activeSavedView === view.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border-border/60 hover:bg-muted"
              }`}
            >
              {view.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-2xl font-bold text-xs h-9 px-3"
          >
            <Table2 className="h-4 w-4 mr-1.5" />
            Tableau
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="rounded-2xl font-bold text-xs h-9 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Kanban
          </Button>
        </div>
      </motion.div>

      {/* Filter Cockpit */}
      <Card className="rounded-3xl border border-border/60 bg-card shadow-xs">
        <CardHeader className="pb-3 pt-5 px-5 sm:px-6">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filtres et Recherche Avancée
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5 xl:col-span-2">
              <Label className="text-xs font-bold text-muted-foreground">Recherche Globale</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="N° Facture, Client, ICE, Description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-border/60 font-semibold text-xs bg-muted/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 font-semibold text-xs bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/60">
                  <SelectItem value="all" className="font-semibold text-xs">Tous les statuts</SelectItem>
                  <SelectItem value="paid" className="font-semibold text-xs">Payée</SelectItem>
                  <SelectItem value="pending" className="font-semibold text-xs">En attente</SelectItem>
                  <SelectItem value="overdue" className="font-semibold text-xs">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Mode de Règlement</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 font-semibold text-xs bg-muted/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/60">
                  <SelectItem value="all" className="font-semibold text-xs">Tous les modes</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method} className="font-semibold text-xs">
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Date Début</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-2xl border-border/60 font-semibold text-xs bg-muted/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Date Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-2xl border-border/60 font-semibold text-xs bg-muted/20"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Tri Principal</Label>
              <Select value={sortPrimary} onValueChange={(value: SortKey) => setSortPrimary(value)}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="date">Date Facture</SelectItem>
                  <SelectItem value="amount">Montant Total TTC</SelectItem>
                  <SelectItem value="customer">Nom Client</SelectItem>
                  <SelectItem value="status">Statut Règlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Tri Secondaire</Label>
              <Select value={sortSecondary} onValueChange={(value: SortKey) => setSortSecondary(value)}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 font-semibold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="date">Date Facture</SelectItem>
                  <SelectItem value="amount">Montant Total TTC</SelectItem>
                  <SelectItem value="customer">Nom Client</SelectItem>
                  <SelectItem value="status">Statut Règlement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Ordre de Tri</Label>
              <Button
                variant="outline"
                className="w-full h-9 rounded-xl border-border/60 font-bold text-xs"
                onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}
              >
                <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                {sortDirection === "asc" ? "Croissant (A-Z / Ancien)" : "Décroissant (Z-A / Récent)"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions Bar */}
      {selectedInvoices.length > 0 && (
        <motion.div
          className="flex flex-wrap items-center justify-between gap-3 p-4 bg-primary/10 border border-primary/30 rounded-3xl backdrop-blur-md shadow-xs"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-black px-3 py-1 rounded-full text-xs">
              {selectedInvoices.length} sélectionnée{selectedInvoices.length > 1 ? "s" : ""}
            </Badge>
            <span className="text-xs font-bold text-foreground">Actions disponibles :</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSelected}
              className="rounded-xl h-9 px-3 font-bold border-border/60 bg-card"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Télécharger les PDF
            </Button>
            <div className="w-[160px]">
              <Select value={bulkStatus} onValueChange={(value: Invoice["status"]) => setBulkStatus(value)}>
                <SelectTrigger className="h-9 rounded-xl border-border/60 bg-card font-bold text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/60">
                  <SelectItem value="pending" className="font-bold text-xs">En attente</SelectItem>
                  <SelectItem value="paid" className="font-bold text-xs">Payée</SelectItem>
                  <SelectItem value="overdue" className="font-bold text-xs">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleBulkStatus} className="rounded-xl h-9 px-3 font-bold">
              Changer Statut
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              className="rounded-xl h-9 px-3 font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Supprimer
            </Button>
          </div>
        </motion.div>
      )}

      {/* Main Content Workspace (Table vs Kanban) */}
      <Card className="rounded-3xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          {viewMode === "kanban" ? (
            <motion.div
              className="grid gap-4 lg:grid-cols-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {kanbanColumns.map((column) => (
                <div key={column.key} className="space-y-3">
                  <div className={`p-3.5 rounded-2xl border ${column.color} flex items-center justify-between`}>
                    <h3 className="font-black text-sm">{column.title}</h3>
                    <Badge variant="outline" className="font-bold rounded-xl px-2.5 py-0.5 text-xs bg-card">
                      {column.items.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {column.items.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs font-semibold text-muted-foreground bg-muted/10">
                        Aucune facture dans ce statut.
                      </div>
                    ) : (
                      column.items.map((invoice) => (
                        <Card
                          key={invoice.id}
                          className="rounded-2xl border border-border/60 bg-card hover:shadow-md transition-shadow p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-black text-sm text-foreground block">{invoice.invoiceNumber}</span>
                              <span className="text-xs font-bold text-muted-foreground block line-clamp-1">
                                {invoice.customerName}
                              </span>
                            </div>
                            {getStatusBadge(invoice.status)}
                          </div>

                          {invoice.customerICE && (
                            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              ICE: <span className="font-bold text-foreground">{invoice.customerICE}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 text-xs border border-border/40">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">HT</span>
                              <span className="font-bold text-foreground">
                                {(invoice.totalHT || 0).toLocaleString("fr-FR")} MAD
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-muted-foreground block">TTC</span>
                              <span className="font-black text-primary">
                                {(invoice.totalTTC || 0).toLocaleString("fr-FR")} MAD
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3.5 w-3.5" />
                              {invoice.paymentMethod || "CHEQUE"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl h-8 text-xs font-bold"
                              onClick={() => setSelectedInvoiceForPreview(invoice)}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Aperçu
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 rounded-xl h-8 text-xs font-bold"
                              onClick={() => handleDownloadInvoice(invoice)}
                            >
                              <Download className="h-3.5 w-3.5 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <>
              {/* Desktop Responsive Table */}
              <motion.div
                className="hidden md:block overflow-x-auto"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length}
                          onCheckedChange={(value) => handleSelectAll(value === true)}
                        />
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        N° Facture
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Client & ICE
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Date Facture
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Montant HT
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        TVA (20%)
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Total TTC
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Statut
                      </TableHead>
                      <TableHead className="font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Règlement
                      </TableHead>
                      <TableHead className="text-right font-black text-xs uppercase tracking-wider text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="border-border/50 hover:bg-muted/30 py-3">
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                          />
                        </TableCell>
                        <TableCell className="font-black text-sm text-foreground">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-bold text-sm text-foreground block">{invoice.customerName}</span>
                            {invoice.customerICE && (
                              <span className="text-[11px] font-semibold text-muted-foreground block">
                                ICE: {invoice.customerICE}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-bold text-xs text-foreground whitespace-nowrap">
                          {(invoice.totalHT || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                        </TableCell>
                        <TableCell className="font-bold text-xs text-muted-foreground whitespace-nowrap">
                          {(invoice.tva || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                        </TableCell>
                        <TableCell className="font-black text-sm text-primary whitespace-nowrap">
                          {(invoice.totalTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-xs rounded-xl px-2.5 py-1 border-border/60">
                            {invoice.paymentMethod || "CHEQUE"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedInvoiceForPreview(invoice)}
                              title="Aperçu & Détails"
                              className="rounded-xl h-8 w-8 p-0 border-border/60 hover:bg-muted"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadInvoice(invoice)}
                              title="Télécharger PDF"
                              className="rounded-xl h-8 w-8 p-0 border-border/60 hover:bg-muted"
                            >
                              <Download className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
                                  deleteInvoice(invoice.id);
                                }
                              }}
                              title="Supprimer"
                              className="rounded-xl h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>

              {/* Mobile Glass Card Layout */}
              <motion.div
                className="md:hidden space-y-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-sm text-foreground block">{invoice.invoiceNumber}</span>
                        <span className="text-xs font-bold text-muted-foreground block">{invoice.customerName}</span>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>

                    {invoice.customerICE && (
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        ICE: <span className="font-bold text-foreground">{invoice.customerICE}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/30 text-xs border border-border/40">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">HT</span>
                        <span className="font-bold text-foreground">
                          {(invoice.totalHT || 0).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">TVA</span>
                        <span className="font-bold text-muted-foreground">
                          {(invoice.tva || 0).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground block">TTC</span>
                        <span className="font-black text-primary">
                          {(invoice.totalTTC || 0).toLocaleString("fr-FR")} MAD
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-1">
                      <span>Date: {new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}</span>
                      <span>Mode: {invoice.paymentMethod || "CHEQUE"}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                        className="mr-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl h-9 font-bold text-xs"
                        onClick={() => setSelectedInvoiceForPreview(invoice)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Détails
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl h-9 font-bold text-xs"
                        onClick={() => handleDownloadInvoice(invoice)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ?")) {
                            deleteInvoice(invoice.id);
                          }
                        }}
                        className="h-9 w-9 p-0 rounded-xl shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </motion.div>
            </>
          )}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="font-black text-base">Aucune facture ne correspond au filtre</p>
              <p className="text-xs">Essayez de réinitialiser la recherche ou de changer les dates.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern Invoice Preview Modal */}
      {selectedInvoiceForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative"
          >
            <button
              onClick={() => setSelectedInvoiceForPreview(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                <Receipt className="h-3.5 w-3.5" />
                Fiche Facture Officielle
              </div>
              <h3 className="text-xl font-black text-foreground">
                Facture N° {selectedInvoiceForPreview.invoiceNumber}
              </h3>
              <p className="text-xs text-muted-foreground font-semibold">
                Date d'émission : {new Date(selectedInvoiceForPreview.invoiceDate).toLocaleDateString("fr-FR")}
              </p>
            </div>

            <div className="space-y-3 text-xs bg-muted/20 p-4 rounded-2xl border border-border/40">
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-semibold text-muted-foreground">Client Bénéficiaire :</span>
                <span className="font-black text-foreground">{selectedInvoiceForPreview.customerName}</span>
              </div>
              {selectedInvoiceForPreview.customerICE && (
                <div className="flex justify-between py-1 border-b border-border/30">
                  <span className="font-semibold text-muted-foreground">Identifiant ICE :</span>
                  <span className="font-bold text-foreground">{selectedInvoiceForPreview.customerICE}</span>
                </div>
              )}
              {selectedInvoiceForPreview.description && (
                <div className="py-1 border-b border-border/30">
                  <span className="font-semibold text-muted-foreground block mb-1">Désignation & Prestation :</span>
                  <p className="font-medium text-foreground bg-card p-2 rounded-xl border border-border/40 whitespace-pre-line">
                    {selectedInvoiceForPreview.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-semibold text-muted-foreground">Mode de Règlement :</span>
                <span className="font-bold text-foreground">{selectedInvoiceForPreview.paymentMethod || "CHEQUE"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="font-semibold text-muted-foreground">Statut Encaissement :</span>
                {getStatusBadge(selectedInvoiceForPreview.status)}
              </div>
            </div>

            {/* Financial Totals Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>Total HT :</span>
                <span className="font-bold text-foreground">
                  {(selectedInvoiceForPreview.totalHT || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                </span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                <span>TVA (20%) :</span>
                <span className="font-bold text-foreground">
                  {(selectedInvoiceForPreview.tva || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                </span>
              </div>
              <div className="flex justify-between text-sm font-black text-foreground pt-2 border-t border-primary/20">
                <span>Total TTC :</span>
                <span className="text-primary text-base">
                  {(selectedInvoiceForPreview.totalTTC || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => handleDownloadInvoice(selectedInvoiceForPreview)}
                className="flex-1 rounded-2xl h-11 font-black bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedInvoiceForPreview(null)}
                className="rounded-2xl h-11 font-bold border-border/60"
              >
                Fermer
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InvoicesTable;
