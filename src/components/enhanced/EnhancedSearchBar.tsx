import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface ActiveFilter {
  key: string;
  value: string;
  label: string;
}

interface EnhancedSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
  filters?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onFilterChange?: (key: string, value: string) => void;
  onFilterRemove?: (key: string) => void;
  onClearAllFilters?: () => void;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
  className?: string;
}

export function EnhancedSearchBar({
  searchTerm,
  onSearchChange,
  placeholder = "Rechercher...",
  filters = [],
  activeFilters = [],
  onFilterChange,
  onFilterRemove,
  onClearAllFilters,
  primaryAction,
  className = ""
}: EnhancedSearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={cn(
        "mb-8 overflow-hidden border-none shadow-card bg-card/50 backdrop-blur-sm rounded-[var(--radius)]",
        className
      )}>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Ligne principale: recherche + bouton principal */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              {/* Barre de recherche */}
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-12 h-14 text-base bg-background/50 border-2 border-transparent focus:border-primary/50 focus:bg-background transition-all duration-300 rounded-2xl shadow-inner"
                />
                <AnimatePresence>
                  {searchTerm && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSearchChange("")}
                        className="h-8 w-8 p-0 hover:bg-muted rounded-xl"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Boutons filtres et action */}
              <div className="flex gap-3">
                {filters.length > 0 && (
                  <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-14 px-6 relative border-2 border-muted hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 rounded-2xl font-bold uppercase tracking-wider text-xs"
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Filtres
                        <AnimatePresence>
                          {activeFilters.length > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                            >
                              <Badge 
                                variant="secondary" 
                                className="ml-2 px-2 py-0.5 text-[10px] font-black h-5 min-w-[20px] bg-primary text-primary-foreground rounded-full"
                              >
                                {activeFilters.length}
                              </Badge>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-card" align="end">
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm uppercase tracking-widest">Filtres</h4>
                          {activeFilters.length > 0 && onClearAllFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onClearAllFilters}
                              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                            >
                              Tout effacer
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-6">
                        {filters.map((filter) => (
                          <div key={filter.key} className="space-y-3">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">{filter.label}</label>
                            <div className="flex flex-wrap gap-2">
                              {filter.options.map((option) => {
                                const isActive = activeFilters.some(
                                  f => f.key === filter.key && f.value === option.value
                                );
                                return (
                                  <Button
                                    key={option.value}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => {
                                      if (onFilterChange) {
                                        if (isActive && onFilterRemove) {
                                          onFilterRemove(filter.key);
                                        } else {
                                          onFilterChange(filter.key, option.value);
                                        }
                                      }
                                    }}
                                    className={cn(
                                      "text-xs h-9 px-4 rounded-xl font-medium transition-all duration-200",
                                      isActive ? "shadow-md scale-105" : "hover:border-primary/30"
                                    )}
                                  >
                                    {option.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {primaryAction && (
                  <Button 
                    onClick={primaryAction.onClick}
                    className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 rounded-2xl"
                  >
                    {primaryAction.icon || <Plus className="h-5 w-5 mr-2" />}
                    {primaryAction.label}
                  </Button>
                )}
              </div>
            </div>

            {/* Filtres actifs */}
            <AnimatePresence>
              {activeFilters.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-4 border-t-2 border-muted/30">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-center mr-2">Filtres actifs:</span>
                    {activeFilters.map((filter) => (
                      <motion.div
                        key={`${filter.key}-${filter.value}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                      >
                        <Badge 
                          variant="secondary" 
                          className="pl-3 pr-1.5 py-1.5 bg-primary/10 text-primary border-2 border-primary/20 rounded-xl font-bold text-[11px] group hover:bg-primary/20 transition-colors"
                        >
                          {filter.label}
                          {onFilterRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onFilterRemove(filter.key)}
                              className="ml-2 h-5 w-5 p-0 hover:bg-primary/30 rounded-lg transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}