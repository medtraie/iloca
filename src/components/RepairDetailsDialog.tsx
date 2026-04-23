
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Edit, FileDown, Wrench, Zap, Car, Calendar, DollarSign, FileText, Clock3, CircleDot } from "lucide-react";
import { Repair } from "@/types/repair";

interface RepairDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair: Repair | null;
  onEdit: (repair: Repair) => void;
}

const RepairDetailsDialog = ({ open, onOpenChange, repair, onEdit }: RepairDetailsDialogProps) => {
  if (!repair) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DH`;
  };

  const timelineItems = [
    { id: `created-${repair.id}`, date: repair.created_at, label: "Création du dossier" },
    ...(repair.updates || []).map((item) => ({ id: item.id, date: item.date, label: item.label })),
    ...(repair.payments || []).map((payment) => ({
      id: payment.id,
      date: payment.date,
      label: `Paiement ${formatCurrency(payment.amount)} - ${payment.method}${payment.note ? ` (${payment.note})` : ""}`
    })),
    ...(repair.pieceJointe ? [{ id: "attachment", date: repair.updated_at, label: `Pièce jointe ajoutée: ${repair.pieceJointe.fileName}` }] : [])
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const getTypeIcon = (type: string) => {
    return type === "Mécanique" ? 
      <Wrench className="h-5 w-5" /> : 
      <Zap className="h-5 w-5" />;
  };

  const getTypeBadge = (type: string) => {
    const isElectric = type === "Électrique";
    return (
      <Badge 
        variant={isElectric ? "secondary" : "default"}
        className={`flex items-center gap-2 text-base px-3 py-1 ${
          isElectric ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        {getTypeIcon(type)}
        {type}
      </Badge>
    );
  };

  const handleDownloadFile = () => {
    if (repair.pieceJointe) {
      const link = document.createElement('a');
      link.href = repair.pieceJointe.fileUrl;
      link.download = repair.pieceJointe.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getTypeIcon(repair.typeReparation)}
            Détails de la Réparation
          </DialogTitle>
          <DialogDescription>
            Informations détaillées sur l'opération de réparation sélectionnée
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTypeBadge(repair.typeReparation)}
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(repair.cout)}
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="text-green-600">Payé: {formatCurrency(repair.paye)}</span>
                  {repair.dette > 0 && (
                    <span className="text-red-600">Dette: {formatCurrency(repair.dette)}</span>
                  )}
                  {repair.dette <= 0 && <span className="text-emerald-700">Dossier soldé</span>}
                </div>
              </div>
            </div>
            <Button onClick={() => onEdit(repair)} className="bg-orange-600 hover:bg-orange-700">
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          </div>

          <Separator />

          {/* Vehicle Information */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-lg">Informations du Véhicule</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Marque</p>
                  <p className="font-medium">{repair.vehicleInfo.marque}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Modèle</p>
                  <p className="font-medium">{repair.vehicleInfo.modele}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Immatriculation</p>
                  <p className="font-medium">{repair.vehicleInfo.immatriculation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Repair Information */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">Date de Réparation</h4>
                  </div>
                  <p className="text-foreground">{formatDate(repair.dateReparation)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">Coût Total</h4>
                  </div>
                  <p className="text-foreground text-lg font-medium">{formatCurrency(repair.cout)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">Montant Payé</h4>
                  </div>
                  <p className="text-green-600 text-lg font-medium">{formatCurrency(repair.paye)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold">Dette</h4>
                  </div>
                  <p className={`text-lg font-medium ${repair.dette > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {formatCurrency(repair.dette)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-indigo-600" />
                    <h4 className="font-semibold">Date d'échéance</h4>
                  </div>
                  <p className="text-foreground">
                    {repair.dueDate ? new Date(repair.dueDate).toLocaleDateString("fr-FR") : "Non définie"}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock3 className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold">SLA cible</h4>
                  </div>
                  <p className="text-foreground">{repair.slaTargetDays || 0} jours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3">Informations de Paiement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Mode de Paiement</p>
                  <p className="font-medium text-foreground">
                    {repair.paymentMethod === 'Espèces' && '💵 Espèces'}
                    {repair.paymentMethod === 'Virement' && '🏦 Virement'}
                    {repair.paymentMethod === 'Chèque' && '🧾 Chèque'}
                  </p>
                </div>
                {repair.paymentMethod === 'Chèque' && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Nom Complet</p>
                      <p className="font-medium text-foreground">{repair.checkName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Référence du Chèque</p>
                      <p className="font-medium text-foreground">{repair.checkReference || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date du Chèque</p>
                      <p className="font-medium text-foreground">
                        {repair.checkDate ? new Date(repair.checkDate).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date d'Encaissement</p>
                      <p className="font-medium text-foreground">
                        {repair.checkDepositDate ? new Date(repair.checkDepositDate).toLocaleDateString('fr-FR') : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {(repair.payments || []).length > 0 && (
                <div className="mt-4 rounded-lg border border-border/40">
                  <div className="px-3 py-2 bg-muted/30 text-sm font-semibold">Historique des paiements</div>
                  <div className="divide-y divide-border/30">
                    {(repair.payments || []).map((payment) => (
                      <div key={payment.id} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span>{new Date(payment.date).toLocaleDateString("fr-FR")} · {payment.method}</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(payment.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-lg">Remarques</h3>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-gray-700 leading-relaxed">{repair.note}</p>
              </div>
            </CardContent>
          </Card>

          {/* Attached Files */}
          {repair.pieceJointe && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileDown className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-lg">Pièces Jointes</h3>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded">
                      <FileDown className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium">{repair.pieceJointe.fileName}</p>
                      <p className="text-sm text-gray-500">{repair.pieceJointe.fileType}</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownloadFile}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CircleDot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Timeline de réparation</h3>
              </div>
              <div className="space-y-3">
                {timelineItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3">Informations Complémentaires</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Date de création</p>
                  <p>{new Date(repair.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dernière modification</p>
                  <p>{new Date(repair.updated_at).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RepairDetailsDialog;
