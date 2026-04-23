import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Car, Fuel, Settings, Palette, Calendar, MapPin, FileText, Image as ImageIcon } from "lucide-react";
import { Vehicle } from "@/hooks/useVehicles";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface Contract {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate?: number;
  totalAmount: string;
  status: string;
  statusColor: string;
  notes?: string;
}

interface VehicleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onEdit: (vehicle: Vehicle) => void;
  onDelete?: (id: string) => Promise<boolean>;
}

const VehicleDetailsDialog = ({ open, onOpenChange, vehicle, onEdit, onDelete }: VehicleDetailsDialogProps) => {
  const [contracts] = useLocalStorage<Contract[]>("contracts", []);
  
  if (!vehicle) return null;

  // Find contracts associated with this vehicle
  const vehicleContracts = contracts.filter(contract => 
    contract.vehicle?.toLowerCase().includes(vehicle.marque?.toLowerCase() || vehicle.brand?.toLowerCase() || '') ||
    contract.vehicle?.toLowerCase().includes(vehicle.modele?.toLowerCase() || vehicle.model?.toLowerCase() || '') ||
    contract.vehicle?.toLowerCase().includes(vehicle.immatriculation?.toLowerCase() || vehicle.registration?.toLowerCase() || '')
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      disponible: { label: "Disponible", variant: "default" as const, color: "🟢" },
      loue: { label: "Loué", variant: "secondary" as const, color: "🔴" },
      maintenance: { label: "Maintenance", variant: "outline" as const, color: "🟡" },
      horsService: { label: "Hors Service", variant: "destructive" as const, color: "⚫" },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.disponible;
  };

  const statusConfig = getStatusBadge(vehicle.etat_vehicule || "disponible");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Car className="w-6 h-6 text-blue-600" />
              {vehicle.marque || vehicle.brand} {vehicle.modele || vehicle.model} ({vehicle.annee || vehicle.year})
            </DialogTitle>
            <Button 
              onClick={() => {
                onEdit(vehicle);
                onOpenChange(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            {/* Main Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Informations Principales</span>
                  <div className="flex items-center gap-2">
                    <span>{statusConfig.color}</span>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Marque</label>
                    <p className="text-lg font-semibold">{vehicle.marque || vehicle.brand}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Modèle</label>
                    <p className="text-lg font-semibold">{vehicle.modele || vehicle.model}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Immatriculation</label>
                    <p className="text-lg font-mono bg-gray-100 px-3 py-1 rounded inline-block">
                      {vehicle.immatriculation || vehicle.registration}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Année</label>
                    <p className="text-lg">{vehicle.annee || vehicle.year}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Couleur</label>
                    <p className="text-lg flex items-center gap-2">
                      <Palette className="w-4 h-4 text-gray-500" />
                      {vehicle.couleur}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Type de Carburant</label>
                    <p className="text-lg flex items-center gap-2">
                      <Fuel className="w-4 h-4 text-gray-500" />
                      {vehicle.type_carburant}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Boîte de Vitesse</label>
                    <p className="text-lg flex items-center gap-2">
                      <Settings className="w-4 h-4 text-gray-500" />
                      {vehicle.boite_vitesse}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Kilométrage Actuel</label>
                    <p className="text-lg font-semibold text-blue-600">
                      📈 {vehicle.kilometrage?.toLocaleString()} km
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">KM de Départ</label>
                    <p className="text-lg">{vehicle.km_depart?.toLocaleString()} km</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Prix par Jour</label>
                    <p className="text-xl font-bold text-green-600">
                      💰 {vehicle.prix_par_jour} DH
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Dates Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Date d'Ajout</label>
                  <p className="text-lg">
                    {new Date(vehicle.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Dernière Modification</label>
                  <p className="text-lg">
                    {new Date(vehicle.updated_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Photos du Véhicule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.photos && vehicle.photos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicle.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        {/* *** Thumbnails now linked to full image *** */}
                        <a href={photo} target="_blank" rel="noopener noreferrer">
                          <img
                            src={photo}
                            alt={`Photo ${index + 1} - ${vehicle.marque || vehicle.brand} ${vehicle.modele || vehicle.model}`}
                            className="w-full h-48 object-cover rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                          />
                        </a>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune photo disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicle.documents && vehicle.documents.length > 0 ? (
                  <div className="space-y-3">
                    {vehicle.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">Document {index + 1}</p>
                            <p className="text-sm text-gray-500">
                              Ajouté le {new Date(vehicle.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc, '_blank')}
                        >
                          Ouvrir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun document disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historique" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Historique des Contrats ({vehicleContracts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vehicleContracts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Contrat</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Date début</TableHead>
                          <TableHead>Date fin</TableHead>
                          <TableHead>Tarif/jour</TableHead>
                          <TableHead>Montant total</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicleContracts.map((contract) => (
                          <TableRow key={contract.id}>
                            <TableCell className="font-medium">{contract.id}</TableCell>
                            <TableCell>{contract.customerName}</TableCell>
                            <TableCell>{new Date(contract.startDate).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell>{new Date(contract.endDate).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell>{contract.dailyRate ? `${contract.dailyRate} DH` : '-'}</TableCell>
                            <TableCell className="font-medium">{contract.totalAmount}</TableCell>
                            <TableCell>
                              <Badge variant={
                                contract.status === 'Actif' ? 'default' :
                                contract.status === 'Terminé' ? 'secondary' :
                                contract.status === 'À venir' ? 'outline' : 'destructive'
                              }>
                                {contract.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun contrat associé à ce véhicule</p>
                    <p className="text-sm text-gray-400 mt-2">
                      L'historique des contrats apparaîtra ici une fois qu'ils seront créés
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailsDialog;
