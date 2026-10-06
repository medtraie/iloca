import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Search, Filter, Columns3, RotateCcw, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChequesFilterProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  filterDate: Date | undefined;
  onFilterDateChange: (date: Date | undefined) => void;
  startDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  directionFilter: string;
  onDirectionChange: (val: string) => void;
  statusFilter: string;
  onStatusChange: (val: string) => void;
  sourceFilter: string;
  onSourceChange: (val: string) => void;
  delayFilter: string;
  onDelayChange: (val: string) => void;
  sortPrimary: string;
  onSortPrimaryChange: (val: any) => void;
  sortSecondary: string;
  onSortSecondaryChange: (val: any) => void;
  visibleColumns: string[];
  onToggleColumn: (col: string) => void;
  activeSavedView: string;
  onApplySavedView: (viewId: any) => void;
  roleViews: Array<{ id: string; label: string }>;
  allColumns: Array<{ key: string; label: string }>;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export const ChequesFilter: React.FC<ChequesFilterProps> = ({
  searchTerm,
  onSearchChange,
  filterDate,
  onFilterDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  directionFilter,
  onDirectionChange,
  statusFilter,
  onStatusChange,
  sourceFilter,
  onSourceChange,
  delayFilter,
  onDelayChange,
  sortPrimary,
  onSortPrimaryChange,
  sortSecondary,
  onSortSecondaryChange,
  visibleColumns,
  onToggleColumn,
  activeSavedView,
  onApplySavedView,
  roleViews,
  allColumns,
  activeFilterCount,
  onResetFilters
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* Category Pills Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" /> Vues Rapides:
        </span>
        {roleViews.map((view) => (
          <Button
            key={view.id}
            variant={activeSavedView === view.id ? "default" : "outline"}
            size="sm"
            onClick={() => onApplySavedView(view.id)}
            className={`rounded-full h-8 px-3.5 text-xs font-bold shrink-0 transition-all ${
              activeSavedView === view.id
                ? "bg-primary text-primary-foreground shadow-xs scale-[1.02]"
                : "border-border/60 hover:bg-muted/60"
            }`}
          >
            {view.label}
          </Button>
        ))}
      </div>

      {/* Main Filter Box */}
      <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {/* Search Input */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-bold text-muted-foreground">Rechercher un chèque</Label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nom, n° chèque, contrat, client..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9 h-10 rounded-2xl border-border/60 bg-background/50 font-medium text-xs shadow-xs focus:ring-primary"
                />
              </div>
            </div>

            {/* Date Jour */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Date précise</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-semibold text-xs h-10 rounded-2xl border-border/60 bg-background/50">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                    {filterDate ? format(filterDate, "dd/MM/yyyy", { locale: fr }) : "Tous"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={filterDate}
                    onSelect={(date) => {
                      onFilterDateChange(date);
                      onStartDateChange(undefined);
                      onEndDateChange(undefined);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Période Début */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Du</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-semibold text-xs h-10 rounded-2xl border-border/60 bg-background/50">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      onStartDateChange(date);
                      onFilterDateChange(undefined);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Période Fin */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Au</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-semibold text-xs h-10 rounded-2xl border-border/60 bg-background/50">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      onEndDateChange(date);
                      onFilterDateChange(undefined);
                    }}
                    disabled={(date) => (startDate ? date < startDate : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Direction</Label>
              <Select value={directionFilter} onValueChange={onDirectionChange}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/50 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="reçu">Reçu (Entrée)</SelectItem>
                  <SelectItem value="envoyé">Envoyé (Sortie)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Statut */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Statut</Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/50 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="encaissé">Encaissé</SelectItem>
                  <SelectItem value="non encaissé">Non encaissé</SelectItem>
                  <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                  <SelectItem value="retourné">Retourné</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origine */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Origine</Label>
              <Select value={sourceFilter} onValueChange={onSourceChange}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/50 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="contrat">Contrats</SelectItem>
                  <SelectItem value="reparation">Réparations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3 pt-2 border-t border-border/40">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Tri principal</Label>
              <Select value={sortPrimary} onValueChange={onSortPrimaryChange}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/50 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="priority">Priorité</SelectItem>
                  <SelectItem value="depositDate">Date d'encaissement</SelectItem>
                  <SelectItem value="amount">Montant (DH)</SelectItem>
                  <SelectItem value="risk">Score de risque</SelectItem>
                  <SelectItem value="delay">Retard</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Tri secondaire</Label>
              <Select value={sortSecondary} onValueChange={onSortSecondaryChange}>
                <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/50 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="priority">Priorité</SelectItem>
                  <SelectItem value="depositDate">Date d'encaissement</SelectItem>
                  <SelectItem value="amount">Montant (DH)</SelectItem>
                  <SelectItem value="risk">Score de risque</SelectItem>
                  <SelectItem value="delay">Retard</SelectItem>
                  <SelectItem value="status">Statut</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Columns3 className="h-3.5 w-3.5 text-primary" /> Colonnes personnalisées
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-10 rounded-2xl border-border/60 bg-background/50 font-bold text-xs">
                    <span>{visibleColumns.length} colonnes visibles</span>
                    <Columns3 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 rounded-2xl border-border/60 shadow-xl max-h-60 overflow-y-auto space-y-1.5" align="end">
                  <p className="text-[11px] font-black uppercase text-muted-foreground mb-2">Choisir les colonnes</p>
                  {allColumns.map((column) => (
                    <div className="flex items-center gap-2 py-0.5 hover:bg-muted/40 rounded px-1" key={column.key}>
                      <Checkbox
                        id={`col-${column.key}`}
                        checked={visibleColumns.includes(column.key)}
                        onCheckedChange={() => onToggleColumn(column.key)}
                      />
                      <label htmlFor={`col-${column.key}`} className="text-xs font-medium cursor-pointer">
                        {column.label}
                      </label>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-muted-foreground">
              {activeFilterCount} filtre{activeFilterCount > 1 ? "s" : ""} actif{activeFilterCount > 1 ? "s" : ""}
            </span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-8 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Réinitialiser les filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChequesFilter;
