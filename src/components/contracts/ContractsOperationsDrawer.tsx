import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Car,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  RefreshCcw,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface ContractsOperationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewContract: () => void;
  onFilterChange: (status: "all" | "ouvert" | "ferme") => void;
  onQuickSearchFocus: () => void;
  stats: {
    total: number;
    active: number;
    overdue: number;
    returningToday: number;
  };
}

export const ContractsOperationsDrawer: React.FC<ContractsOperationsDrawerProps> = ({
  open,
  onOpenChange,
  onNewContract,
  onFilterChange,
  onQuickSearchFocus,
  stats,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md fixed bottom-0 top-auto translate-y-0 rounded-t-[2.5rem] rounded-b-none border-t border-border/80 bg-background/98 backdrop-blur-xl p-6 shadow-2xl safe-pb">
        <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-4" />
        
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Opérations Flotte 2026
            </span>
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            Centre d'Actions Rapides
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Lancez un nouveau contrat ou filtrez les flux prioritaires en un geste.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {/* Main Action: New Contract */}
          <Button
            onClick={() => {
              onOpenChange(false);
              onNewContract();
            }}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/20 flex items-center justify-between px-5 hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="font-black text-sm">Nouveau Contrat</p>
                <p className="text-[10px] font-normal opacity-80">Créer une nouvelle location de flotte</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 opacity-80" />
          </Button>

          {/* Quick Filter Shortcuts */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={() => {
                onFilterChange("ouvert");
                onOpenChange(false);
              }}
              className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 text-left transition-all flex flex-col justify-between h-20 shadow-xs"
            >
              <div className="flex items-center justify-between w-full">
                <Car className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600">
                  {stats.active}
                </span>
              </div>
              <span className="font-bold text-xs text-foreground">Flotte en cours</span>
            </button>

            <button
              onClick={() => {
                onFilterChange("ouvert");
                onOpenChange(false);
              }}
              className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-red-500/40 text-left transition-all flex flex-col justify-between h-20 shadow-xs"
            >
              <div className="flex items-center justify-between w-full">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-600">
                  {stats.overdue}
                </span>
              </div>
              <span className="font-bold text-xs text-foreground">Retards & Relances</span>
            </button>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onQuickSearchFocus();
            }}
            className="w-full h-11 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground mt-1"
          >
            <Search className="h-3.5 w-3.5 mr-2" />
            Rechercher un contrat ou client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
