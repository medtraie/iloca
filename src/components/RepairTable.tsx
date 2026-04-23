
import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Eye, FileDown, Wrench, Zap, Car, Calendar, DollarSign, CircleAlert, ReceiptText, CheckCircle2, ExternalLink } from "lucide-react";
import { Repair } from "@/types/repair";
import { EnhancedTable } from "@/components/enhanced/EnhancedTable";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface RepairTableProps {
  filteredRepairs: Repair[];
  onViewDetails: (repair: Repair) => void;
  onEditRepair: (repair: Repair) => void;
  onDeleteRepair: (repair: Repair) => void;
  onReactivateVehicle: (repair: Repair) => void;
  onAddPayment: (repair: Repair) => void;
  onMarkAsSettled: (repair: Repair) => void;
}

const RepairTable = ({ 
  filteredRepairs, 
  onViewDetails, 
  onEditRepair, 
  onDeleteRepair,
  onReactivateVehicle,
  onAddPayment,
  onMarkAsSettled
}: RepairTableProps) => {
  const [groupBy, setGroupBy] = useState<"none" | "vehicle" | "type" | "month">("none");

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Mécanique": return <Wrench className="h-4 w-4" />;
      case "Électrique": return <Zap className="h-4 w-4" />;
      case "Garage": return <Car className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    let colorClass = "";
    switch (type) {
      case "Électrique":
        colorClass = "bg-blue-100 text-blue-700 border-blue-200";
        break;
      case "Garage":
        colorClass = "bg-purple-100 text-purple-700 border-purple-200";
        break;
      default: // Mécanique
        colorClass = "bg-orange-100 text-orange-700 border-orange-200";
        break;
    }
    
    return (
      <Badge className={`flex items-center gap-1 font-medium ${colorClass}`}>
        {getTypeIcon(type)}
        {type}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number | undefined) => {
    return `${(amount || 0).toLocaleString()} DH`;
  };

  const getPaymentStatus = (repair: Repair) => {
    const debt = repair.dette || 0;
    if (debt <= 0) return "Soldé";
    if ((repair.paye || 0) > 0) return "Partiel";
    return "Non payé";
  };

  const getDelayDays = (repair: Repair) => {
    if ((repair.dette || 0) <= 0) return 0;
    const baseDate = repair.dueDate ? new Date(repair.dueDate) : new Date(repair.dateReparation);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const totalDebt = filteredRepairs.reduce((sum, repair) => sum + (repair.dette || 0), 0);
  const overdueRepairs = filteredRepairs.filter((repair) => getDelayDays(repair) > 30).length;

  const getDelayBadge = (repair: Repair) => {
    if ((repair.dette || 0) <= 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">0 j</Badge>;
    }
    const diffDays = getDelayDays(repair);
    if (diffDays <= 15) {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">{diffDays} j</Badge>;
    }
    if (diffDays <= 30) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{diffDays} j</Badge>;
    }
    if (diffDays > 60) {
      return (
        <Badge className="bg-red-200 text-red-800 border-red-300 gap-1">
          <CircleAlert className="h-3 w-3" />
          Très en retard {diffDays} j
        </Badge>
      );
    }
    return <Badge className="bg-red-100 text-red-700 border-red-200">{diffDays} j</Badge>;
  };

  const getOperationalBadge = (repair: Repair) => {
    if (repair.operationalStatus === "pret_pour_retour") {
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Prêt retour</Badge>;
    }
    if (repair.operationalStatus === "immobilise_long") {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Immobilisé long</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Maintenance</Badge>;
  };

  const columns = [
    {
      key: 'dateReparation',
      label: 'Date',
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{formatDate(repair.dateReparation)}</span>
        </div>
      )
    },
    {
      key: 'vehicleInfo',
      label: 'Véhicule',
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">
              {repair.vehicleInfo.marque} {repair.vehicleInfo.modele}
            </p>
            <p className="text-sm text-muted-foreground font-mono">
              {repair.vehicleInfo.immatriculation}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'typeReparation',
      label: 'Type',
      sortable: true,
      render: (repair: Repair) => getTypeBadge(repair.typeReparation)
    },
    {
      key: 'cout',
      label: 'Coût Total',
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-foreground" />
          <span className="font-semibold text-foreground">
            {formatCurrency(repair.cout)}
          </span>
        </div>
      )
    },
    {
      key: 'paye',
      label: 'Payé',
      sortable: true,
      render: (repair: Repair) => (
        <span className="font-medium text-green-600">
          {formatCurrency(repair.paye || 0)}
        </span>
      )
    },
    {
      key: 'dette',
      label: 'Dette',
      sortable: true,
      render: (repair: Repair) => (
        <span className={`font-semibold ${(repair.dette || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
          {formatCurrency(repair.dette || 0)}
        </span>
      )
    },
    {
      key: 'delai',
      label: 'Délai',
      sortable: false,
      render: (repair: Repair) => getDelayBadge(repair)
    },
    {
      key: 'statut',
      label: 'Statut',
      sortable: false,
      render: (repair: Repair) => getPaymentStatus(repair) === "Soldé"
        ? <Badge className="bg-green-100 text-green-700 border-green-200">Soldé</Badge>
        : getPaymentStatus(repair) === "Partiel"
          ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">Partiel</Badge>
          : <Badge className="bg-red-100 text-red-700 border-red-200">Non payé</Badge>
    },
    {
      key: 'operationalStatus',
      label: 'Atelier',
      sortable: false,
      render: (repair: Repair) => getOperationalBadge(repair)
    },
    {
      key: 'paymentMethod',
      label: 'Mode de paiement',
      sortable: true,
      render: (repair: Repair) => (
        <Badge variant="outline">
          {repair.paymentMethod === 'Espèces' && '💵'}
          {repair.paymentMethod === 'Virement' && '🏦'}
          {repair.paymentMethod === 'Chèque' && '🧾'}
          {' '}{repair.paymentMethod || 'Non spécifié'}
        </Badge>
      )
    },
    {
      key: 'note',
      label: 'Remarque',
      sortable: false,
      render: (repair: Repair) => (
        <div className="max-w-xs">
          <span className="text-sm text-foreground truncate block" title={repair.note}>
            {repair.note}
          </span>
        </div>
      )
    },
    {
      key: 'pieceJointe',
      label: 'Pièce jointe',
      sortable: false,
      render: (repair: Repair) => (
        repair.pieceJointe ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(repair.pieceJointe.fileUrl, '_blank')}
            title="Télécharger la pièce jointe"
            className="h-8 hover:bg-blue-50 hover:text-blue-700"
          >
            <FileDown className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">Aucune</span>
        )
      )
    }
  ];

  const renderActions = (repair: Repair) => (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="sm" 
        title="Voir les détails"
        onClick={() => onViewDetails(repair)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        title="Modifier"
        onClick={() => onEditRepair(repair)}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-700"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Enregistrer un paiement"
        onClick={() => onAddPayment(repair)}
        className="h-8 px-2 hover:bg-emerald-50 hover:text-emerald-700"
      >
        <ReceiptText className="h-4 w-4 mr-1" />
        Paiement
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Marquer comme soldé"
        onClick={() => onMarkAsSettled(repair)}
        className="h-8 px-2 hover:bg-green-50 hover:text-green-700"
      >
        <CheckCircle2 className="h-4 w-4 mr-1" />
        Compléter
      </Button>
      <Button
        variant="ghost"
        size="sm"
        title="Ouvrir la pièce jointe"
        onClick={() => repair.pieceJointe && window.open(repair.pieceJointe.fileUrl, "_blank")}
        disabled={!repair.pieceJointe}
        className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-700"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        title="Réactiver le véhicule"
        onClick={() => onReactivateVehicle(repair)}
        className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-700"
      >
        <Car className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette réparation ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteRepair(repair)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const groupedRepairs = useMemo(() => {
    if (groupBy === "none") return [];
    const grouped = new Map<string, Repair[]>();
    filteredRepairs.forEach((repair) => {
      const key = groupBy === "vehicle"
        ? `${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele} - ${repair.vehicleInfo.immatriculation}`
        : groupBy === "type"
          ? repair.typeReparation
          : new Date(repair.dateReparation).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      const current = grouped.get(key) || [];
      grouped.set(key, [...current, repair]);
    });
    return Array.from(grouped.entries());
  }, [filteredRepairs, groupBy]);

  const exportCsv = () => {
    const headers = ["Date", "Véhicule", "Type", "Coût", "Payé", "Dette", "Statut", "Échéance"];
    const rows = filteredRepairs.map((repair) => [
      formatDate(repair.dateReparation),
      `${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele} (${repair.vehicleInfo.immatriculation})`,
      repair.typeReparation,
      (repair.cout || 0).toString(),
      (repair.paye || 0).toString(),
      (repair.dette || 0).toString(),
      getPaymentStatus(repair),
      repair.dueDate ? formatDate(repair.dueDate) : "-"
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${(cell || "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "reparations-filtrees.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Rapport des réparations filtrées", 14, 16);
    doc.setFontSize(10);
    doc.text(`Nombre de dossiers: ${filteredRepairs.length}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Véhicule", "Type", "Coût", "Payé", "Dette", "Statut"]],
      body: filteredRepairs.map((repair) => [
        formatDate(repair.dateReparation),
        `${repair.vehicleInfo.marque} ${repair.vehicleInfo.modele}`,
        repair.typeReparation,
        formatCurrency(repair.cout),
        formatCurrency(repair.paye),
        formatCurrency(repair.dette),
        getPaymentStatus(repair)
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255] }
    });
    doc.save("reparations-filtrees.pdf");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="w-full md:max-w-xs">
          <Select value={groupBy} onValueChange={(value: "none" | "vehicle" | "type" | "month") => setGroupBy(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sans groupe</SelectItem>
              <SelectItem value="vehicle">Par véhicule</SelectItem>
              <SelectItem value="type">Par type de réparation</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv}>Exporter CSV</Button>
          <Button variant="outline" onClick={exportPdf}>Exporter PDF</Button>
        </div>
      </div>

      {groupBy === "none" ? (
        <EnhancedTable
          data={filteredRepairs}
          columns={columns}
          title="Liste des réparations"
          description={`${filteredRepairs.length} réparation${filteredRepairs.length > 1 ? 's' : ''} trouvée${filteredRepairs.length > 1 ? 's' : ''} • Dette visible ${formatCurrency(totalDebt)} • Retards > 30 jours ${overdueRepairs}`}
          searchPlaceholder="Rechercher par véhicule, type, remarque..."
          actions={renderActions}
          emptyMessage="Aucune réparation ne correspond à la recherche."
          defaultItemsPerPage={25}
          itemsPerPageOptions={[10, 25, 50]}
        />
      ) : (
        <Card className="border border-border/40 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead>Date</TableHead>
                    <TableHead>Véhicule</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Coût</TableHead>
                    <TableHead>Payé</TableHead>
                    <TableHead>Dette</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead>Atelier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRepairs.map(([groupKey, repairs]) => {
                    const subtotalCost = repairs.reduce((sum, repair) => sum + (repair.cout || 0), 0);
                    const subtotalPaid = repairs.reduce((sum, repair) => sum + (repair.paye || 0), 0);
                    const subtotalDebt = repairs.reduce((sum, repair) => sum + (repair.dette || 0), 0);
                    return (
                      <Fragment key={`group-${groupKey}`}>
                        <TableRow key={`head-${groupKey}`} className="bg-primary/5 hover:bg-primary/5">
                          <TableCell colSpan={9} className="font-semibold text-primary">{groupKey}</TableCell>
                        </TableRow>
                        {repairs.map((repair) => (
                          <TableRow key={repair.id} className="hover:bg-accent/5">
                            <TableCell>{formatDate(repair.dateReparation)}</TableCell>
                            <TableCell className="font-medium">{repair.vehicleInfo.marque} {repair.vehicleInfo.modele}</TableCell>
                            <TableCell>{getTypeBadge(repair.typeReparation)}</TableCell>
                            <TableCell>{formatCurrency(repair.cout)}</TableCell>
                            <TableCell className="text-green-600">{formatCurrency(repair.paye)}</TableCell>
                            <TableCell className={(repair.dette || 0) > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>{formatCurrency(repair.dette)}</TableCell>
                            <TableCell>{getDelayBadge(repair)}</TableCell>
                            <TableCell>{getOperationalBadge(repair)}</TableCell>
                            <TableCell className="text-right">{renderActions(repair)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow key={`subtotal-${groupKey}`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={3} className="font-semibold">Sous-total</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(subtotalCost)}</TableCell>
                          <TableCell className="font-semibold text-green-600">{formatCurrency(subtotalPaid)}</TableCell>
                          <TableCell className="font-semibold text-red-600">{formatCurrency(subtotalDebt)}</TableCell>
                          <TableCell colSpan={3}></TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RepairTable;
