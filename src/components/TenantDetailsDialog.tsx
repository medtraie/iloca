
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Phone, MapPin, CreditCard, Car, Globe, Calendar, FileText } from "lucide-react";
import { Tenant } from "@/pages/Customers";
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

interface TenantDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
}

const TenantDetailsDialog = ({ isOpen, onClose, tenant }: TenantDetailsDialogProps) => {
  const [contracts] = useLocalStorage<Contract[]>("contracts", []);

  if (!tenant) return null;

  // Find contracts associated with this tenant
  const tenantContracts = contracts.filter(contract => 
    contract.customerNationalId === tenant.cin ||
    contract.customerName === `${tenant.prenom} ${tenant.nom}` ||
    contract.customerPhone === tenant.telephone
  );

  const getStatusBadge = (status: string, statusColor: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    let bgColor = "";
    
    switch (status) {
      case "Actif":
        bgColor = "bg-green-100";
        break;
      case "Terminé":
        bgColor = "bg-blue-100";
        break;
      case "À venir":
        bgColor = "bg-orange-100";
        break;
      default:
        bgColor = "bg-gray-100";
    }
    
    return (
      <span className={`${baseClasses} ${bgColor} ${statusColor}`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Détails du locataire - {tenant.prenom} {tenant.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Nom complet</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{tenant.prenom} {tenant.nom}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{tenant.telephone}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date de naissance</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(tenant.dateNaissance).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Adresse</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{tenant.adresse}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nationalité</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span>{tenant.nationalite}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Documents d'identité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CIN</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    <span>{tenant.cin}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date CIN</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(tenant.dateCin).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Permis de conduire</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span>{tenant.permis}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date Permis</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(tenant.datePermis).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                {tenant.passeport && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Passeport</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                      <CreditCard className="h-4 w-4 text-gray-500" />
                      <span>{tenant.passeport}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations additionnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Type de locataire</Label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.type === "Locataire Principal" 
                        ? "bg-blue-100 text-blue-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {tenant.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date d'ajout</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(tenant.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dernière mise à jour</Label>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>{new Date(tenant.updatedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Associated Contracts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contrats associés ({tenantContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenantContracts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Contrat</TableHead>
                        <TableHead>Véhicule</TableHead>
                        <TableHead>Date début</TableHead>
                        <TableHead>Date fin</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.id}</TableCell>
                          <TableCell>{contract.vehicle}</TableCell>
                          <TableCell>{new Date(contract.startDate).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>{new Date(contract.endDate).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell className="font-medium">{contract.totalAmount}</TableCell>
                          <TableCell>
                            {getStatusBadge(contract.status, contract.statusColor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun contrat associé à ce locataire</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for labels
const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-medium text-gray-700">
    {children}
  </label>
);

export default TenantDetailsDialog;
