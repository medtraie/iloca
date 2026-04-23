
import { Calendar, Car, User, FileText, Settings, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
}

interface Contract {
  id: string;
  customerName: string;
}

interface ReportsFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  vehicles: Vehicle[];
  contracts: Contract[];
}

const ReportsFilters = ({ filters, onFiltersChange, vehicles, contracts }: ReportsFiltersProps) => {
  const uniqueTenants = [...new Set(contracts.map(c => c.customerName))];

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      periode: { start: "", end: "" },
      vehicleId: "all",
      tenantName: "all",
      contractStatus: "all",
      vehicleStatus: "all",
      expenseType: "all"
    });
  };

  return (
    <div className="space-y-4">
      {/* Période */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date de début
          </Label>
          <Input
            type="date"
            value={filters.periode.start}
            onChange={(e) => handleFilterChange('periode', { ...filters.periode, start: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date de fin
          </Label>
          <Input
            type="date"
            value={filters.periode.end}
            onChange={(e) => handleFilterChange('periode', { ...filters.periode, end: e.target.value })}
          />
        </div>
      </div>

      {/* Vehicle and Tenant Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Véhicule
          </Label>
          <Select value={filters.vehicleId || "all"} onValueChange={(value) => handleFilterChange('vehicleId', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les véhicules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les véhicules</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.marque} {vehicle.modele} ({vehicle.immatriculation})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Locataire
          </Label>
          <Select value={filters.tenantName || "all"} onValueChange={(value) => handleFilterChange('tenantName', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les locataires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les locataires</SelectItem>
              {uniqueTenants.map((tenant) => (
                <SelectItem key={tenant} value={tenant}>
                  {tenant}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Status Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            État du Contrat
          </Label>
          <Select value={filters.contractStatus || "all"} onValueChange={(value) => handleFilterChange('contractStatus', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les états" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              <SelectItem value="نشط">Actif</SelectItem>
              <SelectItem value="مكتمل">Terminé</SelectItem>
              <SelectItem value="قادم">À venir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            État du Véhicule
          </Label>
          <Select value={filters.vehicleStatus || "all"} onValueChange={(value) => handleFilterChange('vehicleStatus', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les états" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les états</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="louée">Louée</SelectItem>
              <SelectItem value="maintenance">En maintenance</SelectItem>
              <SelectItem value="hors_service">Hors service</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Type de Charge
          </Label>
          <Select value={filters.expenseType || "all"} onValueChange={(value) => handleFilterChange('expenseType', value === "all" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="vignette">Vignette</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="visite_technique">Visite technique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button onClick={resetFilters} variant="outline">
          Réinitialiser
        </Button>
        <Button>
          Appliquer les filtres
        </Button>
      </div>
    </div>
  );
};

export default ReportsFilters;
