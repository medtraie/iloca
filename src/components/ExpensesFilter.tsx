
import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter, RotateCcw, Search, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Vehicle } from "@/hooks/useVehicles";
import { Expense } from "@/types/expense";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Props = {
  vehicles: Vehicle[];
  expenses: Expense[];
  filters: {
    type: string;
    vehicleId: string;
    fromDate: Date | null;
    toDate: Date | null;
    search: string;
  };
  onChange: (filters: Props["filters"]) => void;
};

const expenseTypes = [
  { value: "vignette", label: "Vignette" },
  { value: "assurance", label: "Assurance" },
  { value: "visite_technique", label: "Visite technique" },
  { value: "gps", label: "GPS" },
  { value: "credit", label: "Crédit" },
  { value: "reparation", label: "Réparation" },
];

const ExpensesFilter = ({ vehicles, expenses, filters, onChange }: Props) => {
  const typeValue = filters.type === "" ? "all" : filters.type;
  const vehicleValue = filters.vehicleId === "" ? "all" : filters.vehicleId;
  const activeFiltersCount = [
    Boolean(filters.type),
    Boolean(filters.vehicleId),
    Boolean(filters.fromDate),
    Boolean(filters.toDate),
    Boolean(filters.search.trim())
  ].filter(Boolean).length;

  return (
    <div className="mb-6 rounded-3xl border border-border/60 bg-card/80 p-4 sm:p-5 shadow-sm backdrop-blur-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Filter className="h-4 w-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight text-foreground">Commandes & Filtres de Dépenses</p>
            <p className="text-xs text-muted-foreground font-medium">
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}` : "Aucun filtre actif"}
            </p>
          </div>
        </div>
        {activeFiltersCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({ type: '', vehicleId: '', fromDate: null, toDate: null, search: '' })}
            className="rounded-2xl h-9 font-bold text-xs text-accent hover:bg-accent/10"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Réinitialiser tout
          </Button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onChange({ ...filters, type: '' })}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap border ${
            filters.type === ''
              ? 'bg-foreground text-background border-foreground shadow-xs'
              : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60'
          }`}
        >
          Tous les types ({expenses.length})
        </button>

        {expenseTypes.map(t => {
          const count = expenses.filter(e => e.type === t.value).length;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onChange({ ...filters, type: filters.type === t.value ? '' : t.value })}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
                filters.type === t.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-black'
                  : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {/* Search Input */}
        <div className="relative group">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            type="text"
            placeholder="Rechercher par note, type, montant..."
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            className="pl-10 pr-9 h-11 rounded-2xl border-border/50 bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary text-xs font-medium"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Vehicle Selector */}
        <div>
          <Select
            value={vehicleValue}
            onValueChange={vehicleId => onChange({ ...filters, vehicleId: vehicleId === "all" ? "" : vehicleId })}
          >
            <SelectTrigger className="h-11 rounded-2xl border-border/50 bg-muted/30 text-xs font-bold">
              <SelectValue placeholder="Tous les véhicules" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/60">
              <SelectItem value="all">Tous les véhicules</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} ({vehicle.registration || vehicle.immatriculation || vehicle.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-2xl border-border/50 bg-muted/30 justify-between text-xs font-bold">
                {filters.fromDate ? format(filters.fromDate, 'dd/MM/yyyy', { locale: fr }) : "Date début"}
                <CalendarIcon className="ml-2 h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <Calendar
                mode="single"
                selected={filters.fromDate ?? undefined}
                onSelect={date => onChange({ ...filters, fromDate: date ?? null })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-11 rounded-2xl border-border/50 bg-muted/30 justify-between text-xs font-bold">
                {filters.toDate ? format(filters.toDate, 'dd/MM/yyyy', { locale: fr }) : "Date fin"}
                <CalendarIcon className="ml-2 h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <Calendar
                mode="single"
                selected={filters.toDate ?? undefined}
                onSelect={date => onChange({ ...filters, toDate: date ?? null })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default ExpensesFilter;
