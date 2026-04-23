import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, TrendingUp, TrendingDown, Trash2, Layers3, List } from "lucide-react";
import type { TreasuryMovement } from "@/pages/Tresorerie";
import { endOfDay, endOfMonth, endOfWeek, endOfYear, format, isWithinInterval, startOfDay, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCompanyDisplayName, getCompanyContactLines, getCompanySlug, getCompanyLogoImage } from "@/utils/companyInfo";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface TreasuryMovementsProps {
  movements: TreasuryMovement[];
  timeFilter: 'day' | 'week' | 'month' | 'year';
  onTimeFilterChange: (filter: 'day' | 'week' | 'month' | 'year') => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onDelete?: (movementId: string, movementType: string) => void;
}

interface SavedMovementView {
  id: string;
  name: string;
  timeFilter: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  typeFilter: string;
  paymentMethodFilter: string;
  searchTerm: string;
  tableMode: "flat" | "grouped";
}

interface PendingTreasuryCommand {
  viewId?: string;
  filters?: {
    timeFilter?: 'day' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
    typeFilter?: string;
    paymentMethodFilter?: string;
    searchTerm?: string;
    tableMode?: "flat" | "grouped";
  };
}

export const TreasuryMovements = ({
  movements,
  timeFilter,
  onTimeFilterChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onDelete
}: TreasuryMovementsProps) => {
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [tableMode, setTableMode] = useState<"flat" | "grouped">("flat");
  const [savedViews, setSavedViews] = useLocalStorage<SavedMovementView[]>("treasury:movement-views", []);
  const [viewName, setViewName] = useState("");

  const selectedTimeRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === "day") {
      return { start: startOfDay(now), end: endOfDay(now) };
    }
    if (timeFilter === "week") {
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    }
    if (timeFilter === "year") {
      return { start: startOfYear(now), end: endOfYear(now) };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [timeFilter]);

  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    if (startDate && endDate) {
      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));
      filtered = filtered.filter(m => {
        const date = new Date(m.date);
        return isWithinInterval(date, { start, end });
      });
    } else {
      filtered = filtered.filter(m => {
        const date = new Date(m.date);
        return isWithinInterval(date, selectedTimeRange);
      });
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(m => m.paymentMethod === paymentMethodFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(m => m.type === typeFilter);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter((m) => {
        const haystack = `${m.reference} ${m.description || ""} ${m.type} ${m.paymentMethod}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let balance = 0;
    return [...filtered].reverse().map(m => {
      balance += m.amount;
      return { ...m, balance };
    }).reverse();
  }, [movements, startDate, endDate, paymentMethodFilter, typeFilter, searchTerm, selectedTimeRange]);

  const summary = useMemo(() => {
    const entries = filteredMovements.filter((movement) => movement.amount > 0).reduce((sum, movement) => sum + movement.amount, 0);
    const exits = Math.abs(filteredMovements.filter((movement) => movement.amount < 0).reduce((sum, movement) => sum + movement.amount, 0));
    return {
      entries,
      exits,
      net: entries - exits
    };
  }, [filteredMovements]);

  const groupedMovements = useMemo(() => {
    const groups = filteredMovements.reduce<Record<string, { label: string; items: typeof filteredMovements; total: number }>>((acc, movement) => {
      const key = format(new Date(movement.date), "yyyy-MM-dd");
      if (!acc[key]) {
        acc[key] = {
          label: format(new Date(movement.date), "dd/MM/yyyy"),
          items: [],
          total: 0
        };
      }
      acc[key].items.push(movement);
      acc[key].total += movement.amount;
      return acc;
    }, {});

    return Object.entries(groups).map(([key, value]) => ({
      key,
      ...value
    }));
  }, [filteredMovements]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    const logoInfo = getCompanyLogoImage();
    if (logoInfo) {
      try {
        doc.addImage(logoInfo.data, logoInfo.format, 14, 6, 18, 18);
      } catch {}
    }
    doc.setFontSize(18);
    const companyName = getCompanyDisplayName();
    doc.text(`Journal de Trésorerie - ${companyName}`, 14, 20);
    doc.setFontSize(9);
    const { addressLine, phoneFaxLine, gsmLine, emailLine } = getCompanyContactLines();
    doc.text(addressLine, 14, 26);
    let y = 32;
    if (phoneFaxLine) {
      doc.text(phoneFaxLine, 14, y);
      y += 6;
    }
    if (gsmLine) {
      doc.text(gsmLine, 14, y);
      y += 6;
    }
    if (emailLine) {
      doc.text(emailLine, 14, y);
      y += 6;
    }
    
    doc.setFontSize(10);
    doc.text(`Date d'export: ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 14, y);
    if (startDate && endDate) {
      doc.text(`Période: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, y + 6);
    }

    // Table
    const tableData = filteredMovements.map(m => [
      format(new Date(m.date), 'dd/MM/yyyy'),
      m.type.charAt(0).toUpperCase() + m.type.slice(1),
      m.paymentMethod,
      m.amount >= 0 ? `+${m.amount.toLocaleString()} DH` : `${m.amount.toLocaleString()} DH`,
      m.reference,
      m.balance ? `${m.balance.toLocaleString()} DH` : '-'
    ]);

    autoTable(doc, {
      startY: startDate && endDate ? 40 : 35,
      head: [['Date', 'Type', 'Moyen', 'Montant', 'Référence', 'Solde']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`${getCompanySlug()}-tresorerie-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const saveCurrentView = () => {
    const normalizedName = viewName.trim() || `Vue ${savedViews.length + 1}`;
    const newView: SavedMovementView = {
      id: crypto.randomUUID(),
      name: normalizedName,
      timeFilter,
      startDate,
      endDate,
      typeFilter,
      paymentMethodFilter,
      searchTerm,
      tableMode
    };
    setSavedViews((prev) => [newView, ...prev].slice(0, 10));
    setViewName("");
  };

  const applySavedView = useCallback((viewId: string) => {
    const selectedView = savedViews.find((view) => view.id === viewId);
    if (!selectedView) return;
    onTimeFilterChange(selectedView.timeFilter);
    onStartDateChange(selectedView.startDate);
    onEndDateChange(selectedView.endDate);
    setTypeFilter(selectedView.typeFilter);
    setPaymentMethodFilter(selectedView.paymentMethodFilter);
    setSearchTerm(selectedView.searchTerm);
    setTableMode(selectedView.tableMode);
  }, [savedViews, onTimeFilterChange, onStartDateChange, onEndDateChange]);

  const deleteSavedView = (viewId: string) => {
    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
  };

  useEffect(() => {
    const raw = localStorage.getItem("treasury:apply-view");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as PendingTreasuryCommand;
      if (parsed?.viewId) {
        applySavedView(parsed.viewId);
      } else if (parsed?.filters) {
        if (parsed.filters.timeFilter !== undefined) onTimeFilterChange(parsed.filters.timeFilter);
        if (parsed.filters.startDate !== undefined) onStartDateChange(parsed.filters.startDate);
        if (parsed.filters.endDate !== undefined) onEndDateChange(parsed.filters.endDate);
        if (parsed.filters.typeFilter !== undefined) setTypeFilter(parsed.filters.typeFilter);
        if (parsed.filters.paymentMethodFilter !== undefined) setPaymentMethodFilter(parsed.filters.paymentMethodFilter);
        if (parsed.filters.searchTerm !== undefined) setSearchTerm(parsed.filters.searchTerm);
        if (parsed.filters.tableMode !== undefined) setTableMode(parsed.filters.tableMode);
      }
    } catch {}

    localStorage.removeItem("treasury:apply-view");
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'recette': return 'bg-green-100 text-green-800';
      case 'depense': return 'bg-red-100 text-red-800';
      case 'divers': return 'bg-orange-100 text-orange-800';
      case 'transfert': return 'bg-blue-100 text-blue-800';
      case 'reparation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Espèces': return 'bg-emerald-100 text-emerald-800';
      case 'Chèque': return 'bg-violet-100 text-violet-800';
      case 'Virement': return 'bg-sky-100 text-sky-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Journal des Opérations
          </CardTitle>
          <Button onClick={exportToPDF} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-emerald-50 p-3">
            <p className="text-xs text-muted-foreground">Entrées</p>
            <p className="text-lg font-semibold text-emerald-700">+{summary.entries.toLocaleString()} DH</p>
          </div>
          <div className="rounded-lg border bg-red-50 p-3">
            <p className="text-xs text-muted-foreground">Sorties</p>
            <p className="text-lg font-semibold text-red-700">-{summary.exits.toLocaleString()} DH</p>
          </div>
          <div className={`rounded-lg border p-3 ${summary.net >= 0 ? "bg-blue-50" : "bg-amber-50"}`}>
            <p className="text-xs text-muted-foreground">Net</p>
            <p className={`text-lg font-semibold ${summary.net >= 0 ? "text-blue-700" : "text-amber-700"}`}>
              {summary.net >= 0 ? "+" : ""}{summary.net.toLocaleString()} DH
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-2">
          <Button variant={timeFilter === "day" ? "default" : "ghost"} size="sm" onClick={() => onTimeFilterChange("day")}>Jour</Button>
          <Button variant={timeFilter === "week" ? "default" : "ghost"} size="sm" onClick={() => onTimeFilterChange("week")}>Semaine</Button>
          <Button variant={timeFilter === "month" ? "default" : "ghost"} size="sm" onClick={() => onTimeFilterChange("month")}>Mois</Button>
          <Button variant={timeFilter === "year" ? "default" : "ghost"} size="sm" onClick={() => onTimeFilterChange("year")}>Année</Button>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-2">
          <Button
            variant={tableMode === "flat" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTableMode("flat")}
            className="transition-all hover:scale-[1.02]"
          >
            <List className="mr-2 h-4 w-4" />
            Vue liste
          </Button>
          <Button
            variant={tableMode === "grouped" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTableMode("grouped")}
            className="transition-all hover:scale-[1.02]"
          >
            <Layers3 className="mr-2 h-4 w-4" />
            Vue groupée
          </Button>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">Saved Views</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Nom de la vue"
            />
            <Button onClick={saveCurrentView} variant="outline">
              Sauvegarder la vue actuelle
            </Button>
            <Select onValueChange={applySavedView}>
              <SelectTrigger>
                <SelectValue placeholder="Appliquer une vue sauvegardée" />
              </SelectTrigger>
              <SelectContent>
                {savedViews.length === 0 ? (
                  <SelectItem value="no-view" disabled>Aucune vue sauvegardée</SelectItem>
                ) : (
                  savedViews.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                      {view.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {savedViews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {savedViews.map((view) => (
                <Badge key={view.id} variant="outline" className="flex items-center gap-2">
                  {view.name}
                  <button
                    type="button"
                    onClick={() => deleteSavedView(view.id)}
                    className="text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Date Début</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Date Fin</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="recette">Recette</SelectItem>
                <SelectItem value="depense">Dépense</SelectItem>
                <SelectItem value="divers">Divers</SelectItem>
                <SelectItem value="transfert">Transfert</SelectItem>
                <SelectItem value="reparation">Réparation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Moyen</label>
            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="Espèces">Espèces</SelectItem>
                <SelectItem value="Chèque">Chèque</SelectItem>
                <SelectItem value="Virement">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Recherche</label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Référence, description..."
            />
          </div>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Moyen</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                  {onDelete && <TableHead className="text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={onDelete ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      Aucune opération trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  tableMode === "flat" ? (
                    filteredMovements.map((movement) => (
                      <TableRow key={movement.id} className="transition-all hover:bg-muted/40">
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(movement.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(movement.type)} variant="secondary">
                            {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentMethodColor(movement.paymentMethod)} variant="secondary">
                            {movement.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${movement.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.amount >= 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingUp className="w-4 h-4" />
                              +{movement.amount.toLocaleString()} DH
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-1">
                              <TrendingDown className="w-4 h-4" />
                              {movement.amount.toLocaleString()} DH
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{movement.reference}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {movement.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {movement.balance ? `${movement.balance.toLocaleString()} DH` : '-'}
                        </TableCell>
                        {onDelete && (
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(movement.id, movement.type)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    groupedMovements.flatMap((group) => ([
                      <TableRow key={`group-${group.key}`} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={onDelete ? 8 : 7} className="py-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Date: {group.label}</span>
                            <span className={`font-semibold ${group.total >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                              {group.total >= 0 ? "+" : ""}{group.total.toLocaleString()} DH
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>,
                      ...group.items.map((movement) => (
                        <TableRow key={movement.id} className="transition-all hover:bg-muted/40">
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(movement.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(movement.type)} variant="secondary">
                              {movement.type.charAt(0).toUpperCase() + movement.type.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPaymentMethodColor(movement.paymentMethod)} variant="secondary">
                              {movement.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-semibold ${movement.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {movement.amount >= 0 ? (
                              <span className="flex items-center justify-end gap-1">
                                <TrendingUp className="w-4 h-4" />
                                +{movement.amount.toLocaleString()} DH
                              </span>
                            ) : (
                              <span className="flex items-center justify-end gap-1">
                                <TrendingDown className="w-4 h-4" />
                                {movement.amount.toLocaleString()} DH
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{movement.reference}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {movement.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {movement.balance ? `${movement.balance.toLocaleString()} DH` : '-'}
                          </TableCell>
                          {onDelete && (
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(movement.id, movement.type)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ]))
                  )
                )}
              </TableBody>
              {filteredMovements.length > 0 && (
                <TableFooter className="sticky bottom-0 z-10 bg-background/95 backdrop-blur">
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">Résumé</TableCell>
                    <TableCell className={`text-right font-semibold ${summary.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {summary.net >= 0 ? "+" : ""}{summary.net.toLocaleString()} DH
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">Entrées: {summary.entries.toLocaleString()} DH</TableCell>
                    <TableCell className="text-sm text-muted-foreground">Sorties: {summary.exits.toLocaleString()} DH</TableCell>
                    <TableCell className="text-right font-semibold">
                      {filteredMovements[0]?.balance ? `${filteredMovements[0].balance.toLocaleString()} DH` : "-"}
                    </TableCell>
                    {onDelete && <TableCell />}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </ScrollArea>

        <div className="text-sm text-muted-foreground">
          Total: {filteredMovements.length} opération(s)
        </div>
      </CardContent>
    </Card>
  );
};
