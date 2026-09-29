
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
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
        bgColor = "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300";
        break;
      case "Terminé":
        bgColor = "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300";
        break;
      case "À venir":
        bgColor = "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300";
        break;
      default:
        bgColor = "bg-muted text-muted-foreground";
    }
    
    return (
      <span className={`${baseClasses} ${bgColor} ${statusColor}`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <User className="h-5 w-5 text-primary" />
            Détails du locataire - {tenant.prenom} {tenant.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Personal Information */}
          <Card className="border-primary/15 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nom complet</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-semibold">
                    <User className="h-4 w-4 text-primary" />
                    <span>{tenant.prenom} {tenant.nom}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Téléphone</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-semibold">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{tenant.telephone}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Date de naissance</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{tenant.dateNaissance ? new Date(tenant.dateNaissance).toLocaleDateString('fr-FR') : "Non renseignée"}</span>
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Adresse</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{tenant.adresse || "Non renseignée"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Nationalité</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-medium">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{tenant.nationalite}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identity Documents */}
          <Card className="border-primary/15 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary" />
                Documents d'identité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">CIN</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-mono font-bold">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>{tenant.cin}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Date CIN</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{tenant.dateCin ? new Date(tenant.dateCin).toLocaleDateString('fr-FR') : "Non renseignée"}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Permis de conduire</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-mono font-bold">
                    <Car className="h-4 w-4 text-primary" />
                    <span>{tenant.permis}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Date Permis</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{tenant.datePermis ? new Date(tenant.datePermis).toLocaleDateString('fr-FR') : "Non renseignée"}</span>
                  </div>
                </div>

                {tenant.passeport && (
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Passeport</Label>
                    <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm font-mono">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>{tenant.passeport}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="border-primary/15 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Informations additionnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Type de locataire</Label>
                  <div className="p-2.5 bg-muted/40 border border-border/50 rounded-lg">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      tenant.type === "Locataire Principal" 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {tenant.type}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Date d'ajout</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{new Date(tenant.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Dernière mise à jour</Label>
                  <div className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border/50 rounded-lg text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>{new Date(tenant.updatedAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Associated Contracts */}
          <Card className="border-primary/15 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Contrats associés ({tenantContracts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tenantContracts.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
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
                <div className="text-center py-6 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucun contrat associé à ce locataire</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="px-6 font-semibold">
              Fermer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantDetailsDialog;

