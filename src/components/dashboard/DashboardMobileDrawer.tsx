import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, Users, Car, Receipt, Wrench, Fuel, 
  MapPin, AlertTriangle, Plus, X, ArrowRight, ShieldCheck 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DashboardMobileDrawer: React.FC<DashboardMobileDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  const actions = [
    {
      title: "Nouveau Contrat",
      desc: "Créer une location",
      icon: FileText,
      path: "/contracts",
      color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    {
      title: "Nouveau Client",
      desc: "Fiche CRM & CIN",
      icon: Users,
      path: "/customers",
      color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Nouveau Véhicule",
      desc: "Ajouter au parc",
      icon: Car,
      path: "/vehicles",
      color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    },
    {
      title: "Nouvelle Facture",
      desc: "Facturation & ICE",
      icon: Receipt,
      path: "/factures",
      color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    },
    {
      title: "Déclarer Réparation",
      desc: "Atelier & Garage",
      icon: Wrench,
      path: "/repairs",
      color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    },
    {
      title: "Géolocalisation Live",
      desc: "Carte GPS de la flotte",
      icon: MapPin,
      path: "/map",
      color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg p-0 rounded-t-[2.5rem] rounded-b-none sm:rounded-[2rem] border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl fixed bottom-0 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-auto max-h-[85vh] overflow-y-auto">
        
        {/* Grab Handle for touch */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        <div className="p-6 pb-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-accent/20 text-accent flex items-center justify-center font-black">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black tracking-tight">Actions Rapides Flotte</DialogTitle>
              <DialogDescription className="text-xs font-medium">Lanceur d'opérations directes</DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-2 gap-3">
          {actions.map((act) => (
            <button
              key={act.title}
              onClick={() => handleAction(act.path)}
              className="p-4 rounded-2xl bg-muted/30 hover:bg-accent/10 border border-border/50 text-left transition-all active:scale-95 space-y-2 group"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black ${act.color} transition-transform group-hover:scale-105`}>
                <act.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-xs sm:text-sm text-foreground group-hover:text-accent transition-colors">
                  {act.title}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">
                  {act.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 bg-muted/20 border-t border-border/40 text-center">
          <p className="text-[11px] text-muted-foreground font-medium">
            Fleet Management System 2026 • SFTLOCATION
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default DashboardMobileDrawer;
