import React, { useState } from "react";
import { Edit, Trash2, Eye, Car, Fuel, Gauge, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Vehicle } from "@/hooks/useVehicles";

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  onViewDetails: (vehicle: Vehicle) => void;
  getStatusBadge: (status: string) => { label: string; variant: any; color: string };
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onEdit, onDelete, onViewDetails, getStatusBadge }) => {
  const marque = vehicle.marque || vehicle.brand || "Véhicule";
  const modele = vehicle.modele || vehicle.model || "Standard";
  const immatriculation = vehicle.immatriculation || vehicle.registration || "Non spécifiée";
  const annee = vehicle.annee || vehicle.year || new Date().getFullYear();
  const etat = vehicle.etat_vehicule || "disponible";
  const statusConfig = getStatusBadge(etat);
  const photos = Array.isArray(vehicle.photos) ? vehicle.photos : [];
  
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // Status-specific 2026 glowing theme
  const getStatusTheme = (status: string) => {
    switch (status) {
      case "disponible":
        return {
          glow: "from-emerald-500/20 via-emerald-500/5 to-transparent",
          badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]",
          border: "hover:border-emerald-500/40",
          pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        };
      case "loue":
        return {
          glow: "from-blue-500/20 via-blue-500/5 to-transparent",
          badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          dot: "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]",
          border: "hover:border-blue-500/40",
          pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
        };
      case "maintenance":
        return {
          glow: "from-amber-500/20 via-amber-500/5 to-transparent",
          badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          dot: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]",
          border: "hover:border-amber-500/40",
          pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        };
      case "horsService":
        return {
          glow: "from-rose-500/20 via-rose-500/5 to-transparent",
          badgeBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          dot: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]",
          border: "hover:border-rose-500/40",
          pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        };
      default:
        return {
          glow: "from-slate-500/20 via-slate-500/5 to-transparent",
          badgeBg: "bg-muted text-muted-foreground border-border/50",
          dot: "bg-muted-foreground",
          border: "hover:border-border",
          pill: "bg-muted text-muted-foreground"
        };
    }
  };

  const theme = getStatusTheme(etat);

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length > 1) {
      setCurrentPhotoIdx((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photos.length > 1) {
      setCurrentPhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <Card 
      className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card to-card/95 backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 ${theme.border}`}
    >
      {/* Dynamic Ambient Background Glow on Hover */}
      <div 
        className={`absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${theme.glow} blur-3xl transition-opacity duration-500 pointer-events-none group-hover:opacity-100 opacity-40`} 
      />

      <CardContent className="p-0 flex flex-col justify-between h-full">
        {/* Vehicle Image Banner with Photo Carousel */}
        <div className="relative w-full h-52 bg-gradient-to-tr from-muted/80 via-muted/40 to-background overflow-hidden">
          {photos.length > 0 ? (
            <img 
              src={photos[currentPhotoIdx] || photos[0]} 
              alt={`${marque} ${modele}`}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80 relative">
              <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
              <div className="p-4 rounded-3xl bg-background/50 border border-border/40 backdrop-blur-md shadow-inner mb-2 group-hover:scale-110 transition-transform">
                <Car className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <span className="text-[11px] font-bold tracking-wider text-muted-foreground/60 uppercase">
                Aperçu Véhicule
              </span>
            </div>
          )}

          {/* Photo Carousel Controls (when multiple photos exist) */}
          {photos.length > 1 && (
            <>
              <button 
                onClick={prevPhoto}
                type="button"
                aria-label="Photo précédente"
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/70 hover:bg-background text-foreground backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={nextPhoto}
                type="button"
                aria-label="Photo suivante"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/70 hover:bg-background text-foreground backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 z-10">
                {photos.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentPhotoIdx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`} 
                  />
                ))}
              </div>
            </>
          )}

          {/* Luxury Top Badges: Status & Year */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/85 dark:bg-zinc-900/85 backdrop-blur-md border border-border/60 shadow-md pointer-events-auto">
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-foreground/90">{annee}</span>
            </div>
            
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border shadow-md font-bold text-xs tracking-wide ${theme.badgeBg} pointer-events-auto`}>
              <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
              <span>{statusConfig.label}</span>
            </div>
          </div>
        </div>

        {/* Vehicle Information Content */}
        <div className="p-5 space-y-4">
          {/* Header Info: Model & Daily Price */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
                  {marque}
                </span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                <span className="text-[11px] font-medium text-muted-foreground/60">{vehicle.couleur || "Standard"}</span>
              </div>
              <h3 className="text-xl font-black tracking-tight text-foreground truncate group-hover:text-accent transition-colors">
                {modele}
              </h3>
            </div>

            <div className="text-right shrink-0 bg-accent/5 dark:bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-2xl">
              <div className="text-xl font-black text-accent tracking-tight leading-none">
                {vehicle.prix_par_jour || 200}
                <span className="text-xs font-bold text-accent/80 ml-1">DH</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mt-0.5">par jour</span>
            </div>
          </div>

          {/* Embossed License Plate Representation */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-muted/40 border border-border/60 hover:bg-muted/60 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Matricule</span>
            </div>
            <div className="font-mono text-xs font-black tracking-widest px-2.5 py-0.5 rounded-lg bg-background border border-border/80 shadow-xs text-foreground">
              {immatriculation}
            </div>
          </div>

          {/* Telemetry Grid Specs */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/20 border border-border/40 text-center">
              <Fuel className="w-3.5 h-3.5 text-accent mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Carburant</span>
              <span className="font-bold text-foreground text-[11px] truncate max-w-full">
                {vehicle.type_carburant || "Essence"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/20 border border-border/40 text-center">
              <Zap className="w-3.5 h-3.5 text-blue-500 mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Boîte</span>
              <span className="font-bold text-foreground text-[11px] truncate max-w-full">
                {vehicle.boite_vitesse || "Manuelle"}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-muted/20 border border-border/40 text-center">
              <Gauge className="w-3.5 h-3.5 text-emerald-500 mb-1" />
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Compteur</span>
              <span className="font-bold text-foreground text-[11px] truncate max-w-full">
                {(vehicle.kilometrage || 0).toLocaleString()} <span className="text-[9px] text-muted-foreground">km</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="px-5 pb-5 pt-0 flex items-center gap-2 border-t border-border/40 mt-1 pt-3">
          <Button
            variant="default"
            size="sm"
            onClick={() => onViewDetails(vehicle)}
            className="flex-1 font-bold bg-foreground text-background hover:bg-foreground/90 rounded-2xl h-10 shadow-sm transition-transform active:scale-95"
          >
            <Eye className="w-4 h-4 mr-1.5 text-accent" />
            Consulter
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(vehicle)}
            aria-label="Modifier le véhicule"
            className="h-10 w-10 p-0 rounded-2xl border-border/60 hover:bg-accent/10 hover:text-accent hover:border-accent/40 transition-transform active:scale-95 shrink-0"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                aria-label="Supprimer le véhicule"
                className="h-10 w-10 p-0 rounded-2xl border-border/60 text-destructive/80 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-transform active:scale-95 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border border-border/60 backdrop-blur-xl bg-card/95 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black text-foreground">
                  Confirmer la suppression
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-medium text-sm pt-2">
                  Êtes-vous certain de vouloir supprimer le véhicule <span className="text-foreground font-bold">{marque} {modele}</span> immatriculé <span className="font-mono font-bold text-accent">{immatriculation}</span> ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 mt-4">
                <AlertDialogCancel className="rounded-2xl font-bold border-border/60 h-11">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => onDelete(vehicle.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl font-bold h-11"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleCard;
