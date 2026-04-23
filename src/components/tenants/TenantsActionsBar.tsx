
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  searchTerm: string;
  onSearchTermChange: (v: string) => void;
  nationalityFilter: string;
  nationalities: string[];
  onNationalityChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
  filteredCount: number;
  totalCount: number;
  onResetFilters: () => void;
  onAddTenant: () => void;
}

export default function TenantsActionsBar({
  searchTerm,
  onSearchTermChange,
  nationalityFilter,
  nationalities,
  onNationalityChange,
  typeFilter,
  onTypeChange,
  filteredCount,
  totalCount,
  onResetFilters,
  onAddTenant
}: Props) {
  const hasActiveFilters = nationalityFilter !== "all" || typeFilter !== "all" || searchTerm.trim().length > 0;

  return (
    <div className="space-y-4 w-full">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Filtres intelligents</p>
          <Badge variant="secondary" className="font-bold">
            {filteredCount}/{totalCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              onClick={onResetFilters}
              className="h-10 rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
          )}
          <Button
            onClick={onAddTenant}
            className="h-10 px-5 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl font-bold shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Ajouter Locataire
          </Button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between w-full">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-focus-within:text-accent transition-colors" />
          <Input
            placeholder="Rechercher par nom, CIN, permis, téléphone..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-12 h-12 bg-background/50 border-border/50 rounded-xl focus-visible:ring-accent transition-all"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full xl:w-auto">
          <Select value={nationalityFilter} onValueChange={onNationalityChange}>
            <SelectTrigger className="w-full md:w-64 h-12 bg-background/50 border-border/50 rounded-xl focus:ring-accent">
              <SelectValue placeholder="Filtrer par nationalité" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all">Toutes nationalités</SelectItem>
              {nationalities.map((nationality) => (
                <SelectItem key={nationality} value={nationality}>
                  {nationality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={onTypeChange}>
            <SelectTrigger className="w-full md:w-64 h-12 bg-background/50 border-border/50 rounded-xl focus:ring-accent">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="Locataire Principal">Locataire Principal</SelectItem>
              <SelectItem value="Chauffeur secondaire">Chauffeur secondaire</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
