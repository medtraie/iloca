
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Filter, RotateCcw, Search } from "lucide-react";
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

const ExpensesFilter = ({ vehicles, filters, onChange }: Props) => {
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
    <div className="mb-6 rounded-[var(--radius)] border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Filtres des dépenses</p>
            <p className="text-xs text-muted-foreground">
              {activeFiltersCount > 0 ? `${activeFiltersCount} filtre${activeFiltersCount > 1 ? "s" : ""} actif${activeFiltersCount > 1 ? "s" : ""}` : "Aucun filtre actif"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ type: '', vehicleId: '', fromDate: null, toDate: null, search: '' })}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Type de charge</Label>
          <Select
            value={typeValue}
            onValueChange={type => onChange({ ...filters, type: type === "all" ? "" : type })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir le type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {expenseTypes.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Véhicule</Label>
          <Select
            value={vehicleValue}
            onValueChange={vehicleId => onChange({ ...filters, vehicleId: vehicleId === "all" ? "" : vehicleId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous les véhicules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les véhicules</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.brand} {vehicle.model} {vehicle.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Du</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {filters.fromDate ? format(filters.fromDate, 'dd/MM/yyyy', { locale: fr }) : "Choisir la date"}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.fromDate ?? undefined}
                onSelect={date => onChange({ ...filters, fromDate: date ?? null })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Au</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {filters.toDate ? format(filters.toDate, 'dd/MM/yyyy', { locale: fr }) : "Choisir la date"}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.toDate ?? undefined}
                onSelect={date => onChange({ ...filters, toDate: date ?? null })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Recherche</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Type, note, coût..."
              value={filters.search}
              onChange={e => onChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpensesFilter;
