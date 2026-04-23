
import { Edit, Trash2, Eye, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const VehicleTable = ({ vehicles, onEdit, onDelete, onViewDetails, getStatusBadge }: VehicleTableProps) => {
  const getStatusDotClass = (status: string) => {
    switch (status) {
      case "disponible":
        return "bg-success";
      case "loue":
        return "bg-blue-500";
      case "maintenance":
        return "bg-warning";
      case "horsService":
        return "bg-destructive";
      default:
        return "bg-muted-foreground";
    }
  };

  if (vehicles.length === 0) {
    return (
      <Card className="border border-border/40 rounded-2xl">
        <CardContent className="p-8 text-center">
          <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun véhicule trouvé</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 rounded-2xl overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/10 hover:bg-muted/10">
              <TableHead>Image</TableHead>
              <TableHead>Marque</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Année</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Kilométrage</TableHead>
              <TableHead>Prix / jour</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => {
              const marque = vehicle.marque || vehicle.brand || "";
              const modele = vehicle.modele || vehicle.model || "";
              const immatriculation = vehicle.immatriculation || vehicle.registration || "";
              const annee = vehicle.annee || vehicle.year || new Date().getFullYear();
              const etat = vehicle.etat_vehicule || "disponible";
              const statusConfig = getStatusBadge(etat);
              
              return (
                <TableRow key={vehicle.id} className="hover:bg-accent/5">
                  <TableCell>
                    <div className="w-16 h-12 bg-muted/40 rounded-lg flex items-center justify-center overflow-hidden">
                      {vehicle.photos && vehicle.photos.length > 0 ? (
                        <img 
                          src={vehicle.photos[0]} 
                          alt={`${marque} ${modele}`}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Car className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{marque}</TableCell>
                  <TableCell>{modele}</TableCell>
                  <TableCell>
                    <code className="bg-muted/50 px-2 py-1 rounded text-sm">
                      {immatriculation}
                    </code>
                  </TableCell>
                  <TableCell>{annee}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(etat)}`} />
                      <Badge variant={statusConfig.variant} className="text-xs">
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{(vehicle.kilometrage || 0).toLocaleString()} km</TableCell>
                  <TableCell className="font-semibold text-card-green">
                    {vehicle.prix_par_jour || 200} DH
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(vehicle)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(vehicle)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف المركبة</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من رغبتك في حذف المركبة {marque} {modele} ({immatriculation})؟
                              هذا الإجراء لا يمكن التراجع عنه.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => onDelete(vehicle.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              حذف
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
      </CardContent>
    </Card>
  );
};

export default VehicleTable;
