
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Plus, RotateCcw, Search } from "lucide-react";

interface RepairFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterDateRange: string;
  setFilterDateRange: (range: string) => void;
  filterFinancialStatus: string;
  setFilterFinancialStatus: (status: string) => void;
  filterOperationalStatus: string;
  setFilterOperationalStatus: (status: string) => void;
  filterDelayBucket: string;
  setFilterDelayBucket: (status: string) => void;
  activeSavedView: string;
  onApplySavedView: (viewId: string) => void;
  onAddRepair: () => void;
}

const RepairFilters = ({
  searchTerm,
  setSearchTerm,
  filterType,
  setFilterType,
  filterDateRange,
  setFilterDateRange,
  filterFinancialStatus,
  setFilterFinancialStatus,
  filterOperationalStatus,
  setFilterOperationalStatus,
  filterDelayBucket,
  setFilterDelayBucket,
  activeSavedView,
  onApplySavedView,
  onAddRepair
}: RepairFiltersProps) => {
  const activeFilters = [
    searchTerm.trim().length > 0,
    filterType !== "all",
    filterDateRange !== "all",
    filterFinancialStatus !== "all",
    filterOperationalStatus !== "all",
    filterDelayBucket !== "all"
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterDateRange("all");
    setFilterFinancialStatus("all");
    setFilterOperationalStatus("all");
    setFilterDelayBucket("all");
    onApplySavedView("custom");
  };

  return (
    <Card className="mb-6 border-primary/15 bg-card/90 shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Filtres des réparations</p>
              <p className="text-xs text-muted-foreground">
                {activeFilters > 0
                  ? `${activeFilters} filtre${activeFilters > 1 ? "s" : ""} actif${activeFilters > 1 ? "s" : ""}`
                  : "Aucun filtre actif"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={onAddRepair} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une réparation
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un véhicule, une note, une plaque..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  onApplySavedView("custom");
                }}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Select value={filterType} onValueChange={(value) => {
              setFilterType(value);
              onApplySavedView("custom");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Type de réparation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Mécanique">Mécanique</SelectItem>
                <SelectItem value="Électrique">Électrique</SelectItem>
                <SelectItem value="Garage">Garage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterDateRange} onValueChange={(value) => {
              setFilterDateRange(value);
              onApplySavedView("custom");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les périodes</SelectItem>
                <SelectItem value="thisWeek">Cette semaine</SelectItem>
                <SelectItem value="thisMonth">Ce mois</SelectItem>
                <SelectItem value="lastMonth">Le mois dernier</SelectItem>
                <SelectItem value="last90Days">90 derniers jours</SelectItem>
                <SelectItem value="thisYear">Cette année</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3 mt-3">
          <div>
            <Select value={filterFinancialStatus} onValueChange={(value) => {
              setFilterFinancialStatus(value);
              onApplySavedView("custom");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Statut financier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts financiers</SelectItem>
                <SelectItem value="settled">Soldé</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="unpaid">Non payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterOperationalStatus} onValueChange={(value) => {
              setFilterOperationalStatus(value);
              onApplySavedView("custom");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Statut opérationnel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts opérationnels</SelectItem>
                <SelectItem value="en_maintenance">En maintenance</SelectItem>
                <SelectItem value="pret_pour_retour">Prêt pour retour</SelectItem>
                <SelectItem value="immobilise_long">Immobilisé long</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={filterDelayBucket} onValueChange={(value) => {
              setFilterDelayBucket(value);
              onApplySavedView("custom");
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Niveau de retard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux de retard</SelectItem>
                <SelectItem value="onTime">À jour</SelectItem>
                <SelectItem value="lt15">Retard 1-15 jours</SelectItem>
                <SelectItem value="btw16_30">Retard 16-30 jours</SelectItem>
                <SelectItem value="gt30">Retard &gt; 30 jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={activeSavedView === "retard30" ? "default" : "outline"}
              onClick={() => onApplySavedView("retard30")}
            >
              Retards &gt; 30j
            </Button>
            <Button
              size="sm"
              variant={activeSavedView === "detteHaute" ? "default" : "outline"}
              onClick={() => onApplySavedView("detteHaute")}
            >
              Dette élevée
            </Button>
            <Button
              size="sm"
              variant={activeSavedView === "ceMois" ? "default" : "outline"}
              onClick={() => onApplySavedView("ceMois")}
            >
              Ce mois
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepairFilters;
