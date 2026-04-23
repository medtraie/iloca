
import { Edit, Trash2, Eye, Car, Fuel, Settings, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

const VehicleCard = ({ vehicle, onEdit, onDelete, onViewDetails, getStatusBadge }: VehicleCardProps) => {
  const marque = vehicle.marque || vehicle.brand || "";
  const modele = vehicle.modele || vehicle.model || "";
  const immatriculation = vehicle.immatriculation || vehicle.registration || "";
  const annee = vehicle.annee || vehicle.year || new Date().getFullYear();
  const etat = vehicle.etat_vehicule || "disponible";
  const statusConfig = getStatusBadge(etat);

  return (
    <Card className="group hover:shadow-card transition-all duration-300 border-none bg-card overflow-hidden rounded-[2rem]">
      <CardContent className="p-0">
        {/* Vehicle Image */}
        <div className="w-full h-48 bg-muted relative overflow-hidden">
          {vehicle.photos && vehicle.photos.length > 0 ? (
            <img 
              src={vehicle.photos[0]} 
              alt={`${marque} ${modele}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/50">
              <Car className="w-16 h-16 text-muted-foreground/20" />
            </div>
          )}
          <div className="absolute top-4 right-4">
            <Badge className="font-bold shadow-lg" variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Vehicle Info */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                {marque} <span className="text-accent">{modele}</span>
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{annee}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-foreground">{vehicle.prix_par_jour || 200} <span className="text-[10px] font-bold uppercase text-muted-foreground">DH / Jour</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50">
              <Fuel className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold truncate">{vehicle.type_carburant || "Essence"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50">
              <Settings className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold truncate">{vehicle.boite_vitesse || "Manuel"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50">
              <Palette className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-bold truncate">{vehicle.couleur || "Blanc"}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 border border-border/50">
              <div className="text-[10px] font-black text-accent">KM</div>
              <span className="text-xs font-bold truncate">{(vehicle.kilometrage || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
            <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">IMMATRICULATION:</span>
            <span className="text-xs font-mono font-bold">{immatriculation}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-6 pb-6 pt-0 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(vehicle)}
          className="flex-1 font-bold border-border/50 hover:bg-accent hover:text-accent-foreground rounded-xl"
        >
          <Eye className="w-4 h-4 mr-2" />
          Détails
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(vehicle)}
          className="border-border/50 hover:bg-accent hover:text-accent-foreground rounded-xl"
        >
          <Edit className="w-4 h-4" />
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-border/50 rounded-xl">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2rem] border-none">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black">Supprimer le véhicule</AlertDialogTitle>
              <AlertDialogDescription className="font-medium">
                Êtes-vous sûr de vouloir supprimer le véhicule <span className="text-foreground font-bold">{marque} {modele}</span> ({immatriculation})? 
                Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="rounded-xl font-bold">Annuler</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(vehicle.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};

export default VehicleCard;
