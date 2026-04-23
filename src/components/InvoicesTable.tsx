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
import { Search, Download, Trash2, Eye, Filter, ArrowUpDown, CreditCard, Calendar, Euro, LayoutGrid, Table2 } from "lucide-react";
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

const statusVariants: Record<Invoice["status"], "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  overdue: "destructive"
};

const roleSavedViews: Record<InvoiceRole, SavedViewPreset[]> = {
  Comptable: [
    {
      id: "comptable_all",
      label: "Toutes",
      statusFilter: "all",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "desc"
    },
    {
      id: "comptable_pending",
      label: "À encaisser",
      statusFilter: "pending",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "asc"
    },
    {
      id: "comptable_overdue",
      label: "En retard",
      statusFilter: "overdue",
      paymentFilter: "all",
      sortPrimary: "date",
      sortSecondary: "amount",
      sortDirection: "asc"
    },
    {
      id: "comptable_paid",
      label: "Payées",
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
      label: "Priorité retard",
      statusFilter: "overdue",
      paymentFilter: "all",
      sortPrimary: "amount",
      sortSecondary: "date",
      sortDirection: "desc"
    },
    {
      id: "manager_amount",
      label: "Top montants",
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
        invoice.description.toLowerCase().includes(term);
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

  const stats = useMemo(() => {
    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.totalTTC, 0);
    const paidAmount = filteredInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((sum, invoice) => sum + invoice.totalTTC, 0);
    const pendingAmount = filteredInvoices
      .filter((invoice) => invoice.status !== "paid")
      .reduce((sum, invoice) => sum + invoice.totalTTC, 0);
    const overdueCount = filteredInvoices.filter((invoice) => invoice.status === "overdue").length;
    return {
      count: filteredInvoices.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueCount
    };
  }, [filteredInvoices]);

  const kanbanColumns = useMemo(() => {
    return [
      {
        key: "pending",
        title: "En attente",
        items: filteredInvoices.filter((invoice) => invoice.status === "pending")
      },
      {
        key: "overdue",
        title: "En retard",
        items: filteredInvoices.filter((invoice) => invoice.status === "overdue")
      },
      {
        key: "paid",
        title: "Payées",
        items: filteredInvoices.filter((invoice) => invoice.status === "paid")
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
      beneficiaryICE: invoice.customerICE,
      quantity: "1",
      unit: "J",
      description: invoice.description,
      unitPrice: invoice.totalHT.toString(),
      totalHT: invoice.totalHT.toString(),
      tva: invoice.tva.toString(),
      totalTTC: invoice.totalTTC.toString(),
      totalWords: "",
      paymentMethod: invoice.paymentMethod
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
    return <div className="text-center py-8">Chargement des factures...</div>;
  }

  return (
    <div className="space-y-4">
      <motion.div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Factures visibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.count}</div>
            <p className="text-xs text-muted-foreground mt-1">après filtres appliqués</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stats.totalAmount.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground mt-1">TTC cumulé</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant encaissé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-700">{stats.paidAmount.toFixed(2)} DH</div>
            <p className="text-xs text-muted-foreground mt-1">factures payées</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Retard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-700">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">factures en retard</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.03 }}
      >
        {roleSavedViews[userRole].map((view) => (
          <Button
            key={view.id}
            size="sm"
            variant={activeSavedView === view.id ? "default" : "outline"}
            onClick={() => applySavedView(view.id)}
          >
            {view.label}
          </Button>
        ))}
      </motion.div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={viewMode === "table" ? "default" : "outline"} size="sm" onClick={() => setViewMode("table")}>
          <Table2 className="h-4 w-4 mr-1" />
          Tableau
        </Button>
        <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}>
          <LayoutGrid className="h-4 w-4 mr-1" />
          Kanban
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres et tri
          </CardTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label>Recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="N° facture, client, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="overdue">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paiement</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date début</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date fin</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3 mt-3">
            <div className="space-y-2">
              <Label>Tri primaire</Label>
              <Select value={sortPrimary} onValueChange={(value: SortKey) => setSortPrimary(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Montant</SelectItem>
                  <SelectItem value="customer">Client</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tri secondaire</Label>
              <Select value={sortSecondary} onValueChange={(value: SortKey) => setSortSecondary(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="amount">Montant</SelectItem>
                  <SelectItem value="customer">Client</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ordre</Label>
              <Button variant="outline" className="w-full" onClick={() => setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortDirection === "asc" ? "Croissant" : "Décroissant"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Actions groupées ({selectedInvoices.length})
          </CardTitle>
          {selectedInvoices.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadSelected}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
              <div className="w-[180px]">
                <Select value={bulkStatus} onValueChange={(value: Invoice["status"]) => setBulkStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="paid">Payée</SelectItem>
                    <SelectItem value="overdue">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleBulkStatus}>Mettre à jour statut</Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {viewMode === "kanban" ? (
            <motion.div
              className="grid gap-4 lg:grid-cols-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {kanbanColumns.map((column) => (
                <Card key={column.key} className="bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {column.title} ({column.items.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {column.items.length === 0 ? (
                      <div className="rounded border border-dashed p-3 text-sm text-muted-foreground">
                        Aucune facture dans cette colonne.
                      </div>
                    ) : (
                      column.items.map((invoice) => (
                        <div key={invoice.id} className="rounded border bg-card p-3 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold">{invoice.invoiceNumber}</p>
                              <p className="text-xs text-muted-foreground">{invoice.customerName}</p>
                            </div>
                            <Badge variant={statusVariants[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" />{new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}</p>
                            <p className="flex items-center gap-2"><Euro className="h-3.5 w-3.5" />{invoice.totalTTC.toFixed(2)} DH</p>
                            <p className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" />{invoice.paymentMethod}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedInvoices.includes(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                            />
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedInvoiceForPreview(invoice)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Aperçu
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownloadInvoice(invoice)}>
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : (
            <>
              <motion.div
                className="hidden md:block"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length}
                          onCheckedChange={(value) => handleSelectAll(value === true)}
                        />
                      </TableHead>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoices.includes(invoice.id)}
                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{invoice.totalTTC.toFixed(2)} DH</TableCell>
                        <TableCell>
                          <Badge variant={statusVariants[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                        </TableCell>
                        <TableCell>{invoice.paymentMethod}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedInvoiceForPreview(invoice)} title="Aperçu">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDownloadInvoice(invoice)} title="Télécharger PDF">
                              <Download className="w-4 h-4" />
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

              <motion.div
                className="md:hidden space-y-3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.02 }}
              >
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                        </div>
                        <Badge variant={statusVariants[invoice.status]}>{statusLabels[invoice.status]}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(invoice.invoiceDate).toLocaleDateString("fr-FR")}</p>
                        <p className="flex items-center gap-2"><Euro className="h-4 w-4" />{invoice.totalTTC.toFixed(2)} DH</p>
                        <p className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{invoice.paymentMethod}</p>
                      </div>
                      <div className="flex gap-2">
                        <Checkbox
                          checked={selectedInvoices.includes(invoice.id)}
                          onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked === true)}
                        />
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelectedInvoiceForPreview(invoice)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Aperçu
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleDownloadInvoice(invoice)}>
                          <Download className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            </>
          )}

          {filteredInvoices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune facture ne correspond aux critères de recherche.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceForPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Aperçu de la facture</h3>
            <div className="space-y-2 text-sm">
              <p><strong>N° Facture:</strong> {selectedInvoiceForPreview.invoiceNumber}</p>
              <p><strong>Client:</strong> {selectedInvoiceForPreview.customerName}</p>
              <p><strong>Date:</strong> {new Date(selectedInvoiceForPreview.invoiceDate).toLocaleDateString("fr-FR")}</p>
              <p><strong>Montant HT:</strong> {selectedInvoiceForPreview.totalHT.toFixed(2)} DH</p>
              <p><strong>TVA:</strong> {selectedInvoiceForPreview.tva.toFixed(2)} DH</p>
              <p><strong>Montant TTC:</strong> {selectedInvoiceForPreview.totalTTC.toFixed(2)} DH</p>
              <p><strong>Statut:</strong> {statusLabels[selectedInvoiceForPreview.status]}</p>
              <p><strong>Mode de paiement:</strong> {selectedInvoiceForPreview.paymentMethod}</p>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={() => handleDownloadInvoice(selectedInvoiceForPreview)} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
              <Button variant="outline" onClick={() => setSelectedInvoiceForPreview(null)} className="flex-1">
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesTable;
