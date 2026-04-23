import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Car, Plus } from "lucide-react";
import VehicleFormDialog from "@/components/VehicleFormDialog";
import { useVehicles } from "@/hooks/useVehicles";
import type { Vehicle } from "@/pages/Reports";

interface AllVehiclesSectionProps {
  vehicles: Vehicle[];
  onRefresh: () => void;
}

const AllVehiclesSection = ({ vehicles, onRefresh }: AllVehiclesSectionProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { addVehicle } = useVehicles();

  const handleSaveVehicle = async (vehicleData: any) => {
    await addVehicle(vehicleData);
    setIsAddDialogOpen(false);
    onRefresh();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'disponible':
        return <Badge className="bg-success text-success-foreground">Disponible</Badge>;
      case 'loue':
        return <Badge className="bg-primary text-primary-foreground">Loué</Badge>;
      case 'maintenance':
        return <Badge className="bg-warning text-warning-foreground">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Non défini</Badge>;
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Tous les véhicules
            </CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau véhicule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Marque</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Immatriculation</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun véhicule enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="h-12 w-16 bg-muted rounded flex items-center justify-center overflow-hidden">
                          <Car className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{vehicle.marque}</TableCell>
                      <TableCell>{vehicle.modele}</TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {vehicle.immatriculation}
                        </code>
                      </TableCell>
                      <TableCell>{vehicle.annee || '-'}</TableCell>
                      <TableCell>{getStatusBadge(vehicle.etat_vehicule)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <VehicleFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveVehicle}
      />
    </>
  );
};

export default AllVehiclesSection;
