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
  Clock3,
  Building2,
  AlertTriangle
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
        return <Wrench className="h-3.5 w-3.5 text-amber-500" />;
      case "Électrique":
        return <Zap className="h-3.5 w-3.5 text-blue-500" />;
      case "Garage":
        return <Car className="h-3.5 w-3.5 text-purple-500" />;
      default:
        return <Wrench className="h-3.5 w-3.5 text-slate-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    let colorClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30";
    switch (type) {
      case "Mécanique":
        colorClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
        break;
      case "Électrique":
        colorClass = "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30";
        break;
      case "Garage":
        colorClass = "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
        break;
    }

    return (
      <Badge variant="outline" className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-xl text-xs border ${colorClass}`}>
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
    return `${(amount || 0).toLocaleString("fr-FR")} DH`;
  };

  const getPaymentStatus = (repair: Repair) => {
    const debt = repair.dette || 0;
    if (debt <= 0) return "Soldé";
    if ((repair.paye || 0) > 0) return "Partiel";
    return "Non payé";
  };

  const getPaymentStatusBadge = (repair: Repair) => {
    const status = getPaymentStatus(repair);
    if (status === "Soldé") {
      return (
        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Soldé
        </Badge>
      );
    }
    if (status === "Partiel") {
      return (
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1 shrink-0">
          <Clock3 className="w-3.5 h-3.5" />
          Partiel
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 px-3 py-1 rounded-xl font-extrabold flex items-center gap-1 shrink-0 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5" />
        Non payé
      </Badge>
    );
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
      return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-mono text-xs rounded-xl font-bold">0 j</Badge>;
    }
    const diffDays = getDelayDays(repair);
    if (diffDays <= 15) {
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-mono text-xs rounded-xl font-bold">{diffDays} j</Badge>;
    }
    if (diffDays <= 30) {
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 font-mono text-xs rounded-xl font-bold">{diffDays} j</Badge>;
    }
    return (
      <Badge variant="outline" className="bg-red-500/15 text-red-600 border-red-500/40 font-mono text-xs flex items-center gap-1 rounded-xl font-extrabold animate-pulse">
        <CircleAlert className="h-3 w-3" />
        {diffDays} j
      </Badge>
    );
  };

  const getOperationalBadge = (repair: Repair) => {
    if (repair.operationalStatus === "pret_pour_retour") {
      return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs rounded-xl">Prêt retour</Badge>;
    }
    if (repair.operationalStatus === "immobilise_long") {
      return <Badge variant="outline" className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold text-xs rounded-xl">Immobilisé</Badge>;
    }
    return <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold text-xs rounded-xl">Maintenance</Badge>;
  };

  const columns = [
    {
      key: "dateReparation",
      label: "Date",
      className: "w-[110px] min-w-[110px]",
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-foreground whitespace-nowrap">{formatDate(repair.dateReparation)}</span>
        </div>
      ),
    },
    {
      key: "vehicleInfo",
      label: "Véhicule",
      className: "w-[210px] min-w-[210px]",
      sortable: true,
      render: (repair: Repair) => (
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
            <Car className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-foreground text-xs truncate">
              {repair.vehicleInfo?.marque || "Véhicule"} {repair.vehicleInfo?.modele || ""}
            </p>
            <p className="text-[11px] text-muted-foreground font-extrabold truncate">
              {repair.vehicleInfo?.immatriculation || "N/A"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "typeReparation",
      label: "Type Intervention",
      className: "w-[140px] min-w-[140px]",
      sortable: true,
      render: (repair: Repair) => getTypeBadge(repair.typeReparation),
    },
    {
      key: "cout",
      label: "Coût Total",
      className: "w-[120px] min-w-[120px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <span className="font-black text-foreground text-xs whitespace-nowrap">
          {formatCurrency(repair.cout)}
        </span>
      ),
    },
    {
      key: "paye",
      label: "Payé",
      className: "w-[110px] min-w-[110px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs whitespace-nowrap">
          {formatCurrency(repair.paye || 0)}
        </span>
      ),
    },
    {
      key: "dette",
      label: "Dette Garage",
      className: "w-[110px] min-w-[110px] text-right",
      sortable: true,
      render: (repair: Repair) => (
        <span
          className={`font-black text-xs whitespace-nowrap ${
            (repair.dette || 0) > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground font-normal"
          }`}
        >
          {formatCurrency(repair.dette || 0)}
        </span>
      ),
    },
    {
      key: "delai",
      label: "Délai",
      className: "w-[90px] min-w-[90px] text-center",
      sortable: false,
      render: (repair: Repair) => getDelayBadge(repair),
    },
    {
      key: "statut",
      label: "Statut",
      className: "w-[110px] min-w-[110px] text-center",
      sortable: false,
      render: (repair: Repair) => getPaymentStatusBadge(repair),
    },
    {
      key: "operationalStatus",
      label: "Atelier",
      className: "w-[120px] min-w-[120px] text-center",
      sortable: false,
      render: (repair: Repair) => getOperationalBadge(repair),
    },
    {
      key: "paymentMethod",
      label: "Mode Règlement",
      className: "w-[130px] min-w-[130px]",
      sortable: true,
      render: (repair: Repair) => (
        <Badge variant="outline" className="text-xs bg-muted/40 border-border/60 font-bold rounded-xl px-2.5 py-1">
          {repair.paymentMethod === "Espèces" && "💵 "}
          {repair.paymentMethod === "Virement" && "🏦 "}
          {repair.paymentMethod === "Chèque" && "🧾 "}
          {repair.paymentMethod || "Non spécifié"}
        </Badge>
      ),
    },
    {
      key: "note",
      label: "Remarque / Garage",
      className: "w-[180px] min-w-[180px]",
      sortable: false,
      render: (repair: Repair) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="max-w-[160px] truncate cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
              {repair.note || <span className="opacity-40 italic">Aucune note</span>}
            </div>
          </TooltipTrigger>
          {repair.note ? (
            <TooltipContent side="top" className="max-w-xs p-3 text-xs font-medium rounded-xl">
              <p className="font-bold mb-1 text-foreground">Remarque garage :</p>
              <p>{repair.note}</p>
            </TooltipContent>
          ) : null}
        </Tooltip>
      ),
    },
    {
      key: "pieceJointe",
      label: "Pièce Jointe",
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
                className="h-8 w-8 p-0 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 border-border/60"
              >
                <FileDown className="h-4 w-4" />
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
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(repair)}
            className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-blue-500 border-border/60"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Voir détails</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditRepair(repair)}
            className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-emerald-500 border-border/60"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Modifier</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPayment(repair)}
            className="h-8 px-2.5 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 font-bold border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1"
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
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-xl text-muted-foreground border-border/60"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 border-border/60">
          <DropdownMenuItem
            onClick={() => onMarkAsSettled(repair)}
            className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer text-xs rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Marquer comme soldé
          </DropdownMenuItem>

          {repair.pieceJointe && (
            <DropdownMenuItem
              onClick={() => window.open(repair.pieceJointe.fileUrl, "_blank")}
              className="font-bold cursor-pointer text-xs rounded-xl"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Consulter pièce jointe
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => onReactivateVehicle(repair)}
            className="text-purple-600 dark:text-purple-400 font-bold cursor-pointer text-xs rounded-xl"
          >
            <Car className="h-4 w-4 mr-2" />
            Réactiver le véhicule
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setRepairToDelete(repair)}
            className="text-red-600 dark:text-red-400 font-bold cursor-pointer text-xs rounded-xl"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer la réparation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

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
    <div className="space-y-4">
      {/* Top action / group bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-card/80 p-3 sm:p-4 rounded-3xl border border-border/60 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-bold shrink-0">Grouper par :</span>
          <Select value={groupBy} onValueChange={(value: "none" | "vehicle" | "type" | "month") => setGroupBy(value)}>
            <SelectTrigger className="h-9 text-xs font-bold rounded-2xl w-[170px] border-border/60 bg-muted/20">
              <SelectValue placeholder="Regrouper" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border/60">
              <SelectItem value="none" className="font-bold text-xs">Aucun groupement</SelectItem>
              <SelectItem value="vehicle" className="font-bold text-xs">Par véhicule</SelectItem>
              <SelectItem value="type" className="font-bold text-xs">Par type de réparation</SelectItem>
              <SelectItem value="month" className="font-bold text-xs">Par mois</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={exportCsv} className="h-9 rounded-2xl font-bold text-xs gap-1.5 border-border/60">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPdf} className="h-9 rounded-2xl font-bold text-xs gap-1.5 border-border/60">
            <FileDown className="h-4 w-4 text-blue-600" />
            Exporter PDF
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border border-border/60 bg-card shadow-xs overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <EnhancedTable
            data={filteredRepairs}
            columns={columns}
            title="Grand Livre des Réparations & Maintenance"
            description={`${filteredRepairs.length} intervention${filteredRepairs.length > 1 ? "s" : ""} enregistrée${filteredRepairs.length > 1 ? "s" : ""} • Dette visible ${formatCurrency(totalDebt)} • Retards > 30j : ${overdueRepairs}`}
            searchPlaceholder="Rechercher par véhicule, immatriculation, garage, type..."
            actions={renderActions}
            emptyMessage="Aucune réparation ne correspond aux critères de recherche."
            defaultItemsPerPage={25}
            itemsPerPageOptions={[10, 25, 50, 100]}
            tableMinWidth="min-w-[1500px]"
          />
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Deletion */}
      <AlertDialog open={Boolean(repairToDelete)} onOpenChange={(open) => !open && setRepairToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-lg">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium">
              Êtes-vous sûr de vouloir supprimer définitivement cette réparation ({repairToDelete?.vehicleInfo?.marque} {repairToDelete?.vehicleInfo?.modele}) ? 
              Cette opération est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl font-bold">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (repairToDelete) {
                  onDeleteRepair(repairToDelete);
                  setRepairToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black"
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
