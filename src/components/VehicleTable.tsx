import React from "react";
import { Edit, Trash2, Eye, Car, Fuel, Gauge, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Vehicle } from "@/hooks/useVehicles";

interface VehicleTableProps {
  vehicles: Vehicle[];
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
  onViewDetails: (vehicle: Vehicle) => void;
  getStatusBadge: (status: string) => { label: string; variant: any; color: string };
}

const VehicleTable: React.FC<VehicleTableProps> = ({ vehicles, onEdit, onDelete, onViewDetails, getStatusBadge }) => {
  const isMobile = useIsMobile();

  const getStatusTheme = (status: string) => {
    switch (status) {
      case "disponible":
        return {
          badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
        };
      case "loue":
        return {
          badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
        };
      case "maintenance":
        return {
          badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
        };
      case "horsService":
        return {
          badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
        };
      default:
        return {
          badge: "bg-muted text-muted-foreground border-border/50",
          dot: "bg-muted-foreground"
        };
    }
  };

  if (vehicles.length === 0) {
    return (
      <Card className="border border-dashed border-border/60 rounded-3xl bg-card/50 backdrop-blur-md">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4 border border-border/40">
            <Car className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <p className="text-foreground font-bold text-base">Aucun véhicule trouvé</p>
          <p className="text-muted-foreground text-xs mt-1">Ajustez vos filtres ou ajoutez un nouveau véhicule.</p>
        </CardContent>
      </Card>
    );
  }

  // Mobile Touch Optimized View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {vehicles.map((vehicle) => {
          const marque = vehicle.marque || vehicle.brand || "Véhicule";
          const modele = vehicle.modele || vehicle.model || "Standard";
          const immatriculation = vehicle.immatriculation || vehicle.registration || "—";
          const annee = vehicle.annee || vehicle.year || new Date().getFullYear();
          const etat = vehicle.etat_vehicule || "disponible";
          const statusConfig = getStatusBadge(etat);
          const theme = getStatusTheme(etat);
          const hasGps = Boolean(
            (vehicle as any).has_gps || 
            (vehicle as any).gps_device_id || 
            (vehicle as any).gps_tracker || 
            (Array.isArray(vehicle.documents) && vehicle.documents.some((d) => String(d).toLowerCase().includes("gps")))
          );
          
          return (
            <Card key={vehicle.id} className="border border-border/60 rounded-2xl overflow-hidden bg-card/90 backdrop-blur-md shadow-sm active:scale-[0.99] transition-transform">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-14 bg-muted/60 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-border/40">
                    {vehicle.photos && vehicle.photos.length > 0 ? (
                      <img 
                        src={vehicle.photos[0]} 
                        alt={`${marque} ${modele}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Car className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-black text-sm text-foreground truncate">{marque} {modele}</h4>
                      <span className="text-[10px] font-bold text-muted-foreground">{annee}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-foreground">
                        {immatriculation}
                      </span>
                      {hasGps && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[9px]">
                          <Radio className="w-2.5 h-2.5 animate-pulse" /> GPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${theme.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                    <span>{statusConfig.label}</span>
                  </div>
                  <div className="font-black text-accent text-sm">
                    {vehicle.prix_par_jour || 200} <span className="text-[10px] font-bold text-muted-foreground">DH/j</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-medium">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-accent" />
                      {vehicle.type_carburant || "Essence"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-emerald-500" />
                      {(vehicle.kilometrage || 0).toLocaleString()} km
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onViewDetails(vehicle)} 
                      aria-label="Voir détails"
                      className="h-8 w-8 p-0 rounded-xl hover:bg-accent/10 hover:text-accent"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onEdit(vehicle)} 
                      aria-label="Modifier"
                      className="h-8 w-8 p-0 rounded-xl hover:bg-accent/10 hover:text-accent"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          aria-label="Supprimer"
                          className="h-8 w-8 p-0 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-3xl border border-border/60 backdrop-blur-xl bg-card/95 shadow-2xl p-6">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-xl font-black">Supprimer le véhicule</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground font-medium text-sm pt-2">
                            Êtes-vous certain de vouloir supprimer <span className="text-foreground font-bold">{marque} {modele}</span> ({immatriculation}) ?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2 mt-4">
                          <AlertDialogCancel className="rounded-2xl font-bold border-border/60">Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(vehicle.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl font-bold">
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Desktop Ultra-Modern High-Density Table View
  return (
    <div className="rounded-3xl border border-border/60 overflow-hidden bg-card/70 backdrop-blur-xl shadow-lg">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
              <TableHead className="w-20 py-4 font-black uppercase text-[10px] tracking-wider text-muted-foreground">Véhicule</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Marque & Modèle</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Immatriculation</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Spécifications</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Statut</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Kilométrage</TableHead>
              <TableHead className="font-black uppercase text-[10px] tracking-wider text-muted-foreground">Tarif / Jour</TableHead>
              <TableHead className="text-right py-4 font-black uppercase text-[10px] tracking-wider text-muted-foreground pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => {
              const marque = vehicle.marque || vehicle.brand || "Véhicule";
              const modele = vehicle.modele || vehicle.model || "Standard";
              const immatriculation = vehicle.immatriculation || vehicle.registration || "—";
              const annee = vehicle.annee || vehicle.year || new Date().getFullYear();
              const etat = vehicle.etat_vehicule || "disponible";
              const statusConfig = getStatusBadge(etat);
              const theme = getStatusTheme(etat);
              const hasGps = Boolean(
                (vehicle as any).has_gps || 
                (vehicle as any).gps_device_id || 
                (vehicle as any).gps_tracker || 
                (Array.isArray(vehicle.documents) && vehicle.documents.some((d) => String(d).toLowerCase().includes("gps")))
              );
              
              return (
                <TableRow key={vehicle.id} className="hover:bg-accent/5 border-b border-border/40 transition-colors group">
                  <TableCell className="py-3">
                    <div className="w-16 h-12 bg-muted/50 rounded-2xl flex items-center justify-center overflow-hidden border border-border/40 group-hover:scale-105 transition-transform">
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <img 
                          src={vehicle.photos[0]} 
                          alt={`${marque} ${modele}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Car className="w-5 h-5 text-muted-foreground/40" />
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="font-black text-sm text-foreground group-hover:text-accent transition-colors">
                      {marque} <span className="font-semibold text-muted-foreground">{modele}</span>
                    </div>
                    <div className="text-[11px] font-medium text-muted-foreground/70 mt-0.5">
                      {annee} • {vehicle.couleur || "Standard"}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-foreground">
                      {immatriculation}
                    </span>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded-lg bg-muted/40 border border-border/40 text-[11px] font-bold text-muted-foreground">
                        {vehicle.type_carburant || "Essence"}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-muted/40 border border-border/40 text-[11px] font-bold text-muted-foreground">
                        {vehicle.boite_vitesse || "Manuelle"}
                      </span>
                      {hasGps && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-[10px]">
                          <Radio className="w-3 h-3 animate-pulse text-amber-500" /> GPS
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${theme.badge}`}>
                      <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                      <span>{statusConfig.label}</span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3 font-semibold text-xs text-foreground">
                    {(vehicle.kilometrage || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">km</span>
                  </TableCell>

                  <TableCell className="py-3 font-black text-sm text-accent">
                    {vehicle.prix_par_jour || 200} <span className="text-[10px] font-bold text-muted-foreground">DH</span>
                  </TableCell>

                  <TableCell className="py-3 text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(vehicle)}
                        aria-label="Voir détails"
                        className="h-9 w-9 p-0 rounded-xl hover:bg-foreground hover:text-background transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(vehicle)}
                        aria-label="Modifier"
                        className="h-9 w-9 p-0 rounded-xl hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            aria-label="Supprimer"
                            className="h-9 w-9 p-0 rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border border-border/60 backdrop-blur-xl bg-card/95 shadow-2xl p-6">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-black">Supprimer le véhicule</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground font-medium text-sm pt-2">
                              Êtes-vous certain de vouloir supprimer le véhicule <span className="text-foreground font-bold">{marque} {modele}</span> ({immatriculation}) ? Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 mt-4">
                            <AlertDialogCancel className="rounded-2xl font-bold border-border/60">Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl font-bold"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default VehicleTable;
