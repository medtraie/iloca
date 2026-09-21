import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Edit,
  Trash2,
  Eye,
  FileDown,
  Wrench,
  Zap,
  Car,
  Calendar,
  DollarSign,
  CircleAlert,
  ReceiptText,
  CheckCircle2,
  ExternalLink,
  MoreHorizontal,
  FileSpreadsheet,
} from "lucide-react";
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
  onMarkAsSettled,
}: RepairTableProps) => {
  const [groupBy, setGroupBy] = useState<"none" | "vehicle" | "type" | "month">("none");
  const [repairToDelete, setRepairToDelete] = useState<Repair | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Mécanique":
        return <Wrench className="h-3.5 w-3.5" />;
      case "Électrique":
        return <Zap className="h-3.5 w-3.5" />;
      case "Garage":
        return <Car className="h-3.5 w-3.5" />;
      default:
        return <Wrench className="h-3.5 w-3.5" />;
    }
  };

  const getTypeBadge = (type: string) => {
    let colorClass = "";
    switch (type) {
      case "Électrique":
        colorClass = "bg-blue-50 text-blue-700 border-blue-200";
        break;
      case "Garage":
        colorClass = "bg-purple-50 text-purple-700 border-purple-200";
        break;
      default:
        colorClass = "bg-amber-50 text-amber-700 border-amber-200";
        break;
    }

    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 text-xs ${colorClass}`}>
        {getTypeIcon(type)}
        {type}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
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
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">0 j</Badge>;
    }
    const diffDays = getDelayDays(repair);
    if (diffDays <= 15) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">{diffDays} j</Badge>;
    }
    if (diffDays <= 30) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-mono text-xs">{diffDays} j</Badge>;
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-mono text-xs flex items-center gap-1">
        <CircleAlert className="h-3 w-3" />
        {diffDays} j
      </Badge>
    );
  };

  const getOperationalBadge = (repair: Repair) => {
    if (repair.operationalStatus === "pret_pour_retour") {
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Prêt retour</Badge>;
    }
    if (repair.operationalStatus === "immobilise_long") {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">Immobilisé</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Maintenance</Badge>;
  };

  const columns = [
    {
      key: "dateReparation",
      label: "Date",
      className: "w-[110px] min-w-[110px]",
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-foreground">{formatDate(repair.dateReparation)}</span>
        </div>
      ),
    },
    {
      key: "vehicleInfo",
      label: "Véhicule",
      className: "w-[190px] min-w-[190px]",
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Car className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-xs truncate">
              {repair.vehicleInfo?.marque || "Véhicule"} {repair.vehicleInfo?.modele || ""}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {repair.vehicleInfo?.immatriculation || "N/A"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "typeReparation",
      label: "Type",
      className: "w-[130px] min-w-[130px]",
      sortable: true,
      render: (repair: Repair) => getTypeBadge(repair.typeReparation),
    },
    {
      key: "cout",
      label: "Coût Total",
      className: "w-[110px] min-w-[110px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center justify-end gap-1 font-bold text-foreground font-mono text-xs">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatCurrency(repair.cout)}</span>
        </div>
      ),
    },
    {
      key: "paye",
      label: "Payé",
      className: "w-[100px] min-w-[100px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <span className="font-semibold text-emerald-600 font-mono text-xs">
          {formatCurrency(repair.paye || 0)}
        </span>
      ),
    },
    {
      key: "dette",
      label: "Dette",
      className: "w-[100px] min-w-[100px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <span
          className={`font-semibold font-mono text-xs ${
            (repair.dette || 0) > 0 ? "text-red-600 font-bold" : "text-muted-foreground"
          }`}
        >
          {formatCurrency(repair.dette || 0)}
        </span>
      ),
    },
    {
      key: "delai",
      label: "Délai",
      className: "w-[85px] min-w-[85px] text-center",
      sortable: false,
      render: (repair: Repair) => getDelayBadge(repair),
    },
    {
      key: "statut",
      label: "Statut",
      className: "w-[100px] min-w-[100px] text-center",
      sortable: false,
      render: (repair: Repair) => {
        const status = getPaymentStatus(repair);
        if (status === "Soldé") {
          return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Soldé</Badge>;
        }
        if (status === "Partiel") {
          return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Partiel</Badge>;
        }
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">Non payé</Badge>;
      },
    },
    {
      key: "operationalStatus",
      label: "Atelier",
      className: "w-[110px] min-w-[110px] text-center",
      sortable: false,
      render: (repair: Repair) => getOperationalBadge(repair),
    },
    {
      key: "paymentMethod",
      label: "Paiement",
      className: "w-[125px] min-w-[125px]",
      sortable: true,
      render: (repair: Repair) => (
        <Badge variant="outline" className="text-xs bg-muted/30 font-normal">
          {repair.paymentMethod === "Espèces" && "💵"}
          {repair.paymentMethod === "Virement" && "🏦"}
          {repair.paymentMethod === "Chèque" && "🧾"}
          {" "}{repair.paymentMethod || "Non spécifié"}
        </Badge>
      ),
    },
    {
      key: "note",
      label: "Remarque",
      className: "w-[180px] min-w-[180px]",
      sortable: false,
      render: (repair: Repair) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-[160px] truncate cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {repair.note || <span className="opacity-40 italic">Aucune note</span>}
            </div>
          </TooltipTrigger>
          {repair.note ? (
            <TooltipContent side="top" className="max-w-xs p-2.5 text-xs font-tajawal">
              <p className="font-semibold mb-1 text-foreground">Remarque :</p>
              <p>{repair.note}</p>
            </TooltipContent>
          ) : null}
        </Tooltip>
      ),
    },
    {
      key: "pieceJointe",
      label: "Pièce jointe",
      className: "w-[95px] min-w-[95px] text-center",
      sortable: false,
      render: (repair: Repair) =>
        repair.pieceJointe ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(repair.pieceJointe.fileUrl, "_blank")}
                className="h-7 w-7 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-700"
              >
                <FileDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Télécharger la pièce jointe</TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground/40 text-xs italic">-</span>
        ),
    },
  ];

  const renderActions = (repair: Repair) => (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(repair)}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Voir détails</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditRepair(repair)}
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Modifier</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddPayment(repair)}
            className="h-7 px-2 rounded-lg text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 font-semibold"
          >
            <ReceiptText className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Payer</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Enregistrer un règlement</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 font-tajawal">
          <DropdownMenuItem
            onClick={() => onMarkAsSettled(repair)}
            className="text-emerald-700 cursor-pointer text-xs"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marquer comme soldé
          </DropdownMenuItem>

          {repair.pieceJointe && (
            <DropdownMenuItem
              onClick={() => window.open(repair.pieceJointe.fileUrl, "_blank")}
              className="cursor-pointer text-xs"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Consulter pièce jointe
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => onReactivateVehicle(repair)}
            className="text-purple-700 cursor-pointer text-xs"
          >
            <Car className="h-4 w-4 mr-2" />
            Réactiver le véhicule
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setRepairToDelete(repair)}
            className="text-red-600 focus:text-red-600 cursor-pointer text-xs"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la réparation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const groupedRepairs = useMemo(() => {
    if (groupBy === "none") return [];
    const grouped = new Map<string, Repair[]>();
    filteredRepairs.forEach((repair) => {
      const key =
        groupBy === "vehicle"
          ? `${repair.vehicleInfo?.marque || ""} ${repair.vehicleInfo?.modele || ""} - ${repair.vehicleInfo?.immatriculation || "Sans immat"}`
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
      `${repair.vehicleInfo?.marque || ""} ${repair.vehicleInfo?.modele || ""} (${repair.vehicleInfo?.immatriculation || ""})`,
      repair.typeReparation,
      (repair.cout || 0).toString(),
      (repair.paye || 0).toString(),
      (repair.dette || 0).toString(),
      getPaymentStatus(repair),
      repair.dueDate ? formatDate(repair.dueDate) : "-",
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
    doc.text("Rapport des réparations", 14, 16);
    doc.setFontSize(10);
    doc.text(`Nombre de dossiers: ${filteredRepairs.length} • Dette: ${formatCurrency(totalDebt)}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["Date", "Véhicule", "Type", "Coût", "Payé", "Dette", "Statut"]],
      body: filteredRepairs.map((repair) => [
        formatDate(repair.dateReparation),
        `${repair.vehicleInfo?.marque || ""} ${repair.vehicleInfo?.modele || ""}`,
        repair.typeReparation,
        formatCurrency(repair.cout),
        formatCurrency(repair.paye),
        formatCurrency(repair.dette),
        getPaymentStatus(repair),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 98, 255] },
    });
    doc.save("reparations-filtrees.pdf");
  };

  return (
    <div className="space-y-4 font-tajawal">
      {/* Top action / group bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-card/60 p-3 rounded-xl border border-border/40 backdrop-blur-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium shrink-0">Grouper par :</span>
          <Select value={groupBy} onValueChange={(value: "none" | "vehicle" | "type" | "month") => setGroupBy(value)}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder="Regrouper" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun groupement</SelectItem>
              <SelectItem value="vehicle">Par véhicule</SelectItem>
              <SelectItem value="type">Par type de réparation</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 text-xs gap-1.5">
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="h-8 text-xs gap-1.5">
            <FileDown className="h-3.5 w-3.5 text-blue-600" />
            Exporter PDF
          </Button>
        </div>
      </div>

      {groupBy === "none" ? (
        <EnhancedTable
          data={filteredRepairs}
          columns={columns}
          title="Liste des réparations"
          description={`${filteredRepairs.length} réparation${filteredRepairs.length > 1 ? "s" : ""} trouvée${filteredRepairs.length > 1 ? "s" : ""} • Dette visible ${formatCurrency(totalDebt)} • Retards > 30 jours ${overdueRepairs}`}
          searchPlaceholder="Rechercher par véhicule, type, remarque..."
          actions={renderActions}
          emptyMessage="Aucune réparation ne correspond à vos filtres."
          defaultItemsPerPage={25}
          itemsPerPageOptions={[10, 25, 50, 100]}
          tableMinWidth="min-w-[1450px]"
        />
      ) : (
        <Card className="border border-border/40 rounded-2xl overflow-hidden shadow-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto min-w-full">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20 border-b">
                    <TableHead className="w-[110px]">Date</TableHead>
                    <TableHead className="w-[200px]">Véhicule</TableHead>
                    <TableHead className="w-[130px]">Type</TableHead>
                    <TableHead className="w-[110px] text-right">Coût</TableHead>
                    <TableHead className="w-[110px] text-right">Payé</TableHead>
                    <TableHead className="w-[110px] text-right">Dette</TableHead>
                    <TableHead className="w-[90px] text-center">Délai</TableHead>
                    <TableHead className="w-[110px] text-center">Atelier</TableHead>
                    <TableHead className="w-[130px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRepairs.map(([groupKey, repairs]) => {
                    const subtotalCost = repairs.reduce((sum, repair) => sum + (repair.cout || 0), 0);
                    const subtotalPaid = repairs.reduce((sum, repair) => sum + (repair.paye || 0), 0);
                    const subtotalDebt = repairs.reduce((sum, repair) => sum + (repair.dette || 0), 0);
                    return (
                      <Fragment key={`group-${groupKey}`}>
                        <TableRow className="bg-primary/5 hover:bg-primary/10 border-b">
                          <TableCell colSpan={9} className="font-bold text-primary text-xs tracking-wider uppercase">
                            {groupKey} ({repairs.length})
                          </TableCell>
                        </TableRow>
                        {repairs.map((repair) => (
                          <TableRow key={repair.id} className="hover:bg-muted/5 border-b text-xs">
                            <TableCell>{formatDate(repair.dateReparation)}</TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {repair.vehicleInfo?.marque} {repair.vehicleInfo?.modele}
                            </TableCell>
                            <TableCell>{getTypeBadge(repair.typeReparation)}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{formatCurrency(repair.cout)}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 font-semibold">{formatCurrency(repair.paye)}</TableCell>
                            <TableCell className={`text-right font-mono font-semibold ${(repair.dette || 0) > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              {formatCurrency(repair.dette)}
                            </TableCell>
                            <TableCell className="text-center">{getDelayBadge(repair)}</TableCell>
                            <TableCell className="text-center">{getOperationalBadge(repair)}</TableCell>
                            <TableCell className="text-right">{renderActions(repair)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b font-bold text-xs">
                          <TableCell colSpan={3} className="text-muted-foreground uppercase tracking-wider">Sous-total :</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(subtotalCost)}</TableCell>
                          <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(subtotalPaid)}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{formatCurrency(subtotalDebt)}</TableCell>
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

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={Boolean(repairToDelete)} onOpenChange={(open) => !open && setRepairToDelete(null)}>
        <AlertDialogContent className="font-tajawal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement cette réparation ({repairToDelete?.vehicleInfo?.marque} {repairToDelete?.vehicleInfo?.modele}) ? 
              Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (repairToDelete) {
                  onDeleteRepair(repairToDelete);
                  setRepairToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RepairTable;
