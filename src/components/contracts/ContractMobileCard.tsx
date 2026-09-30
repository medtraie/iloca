import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Car,
  Calendar,
  DollarSign,
  Phone,
  MessageCircle,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Share2,
  FileCheck
} from "lucide-react";
import { Contract } from "@/hooks/useContracts";
import { computeContractSummary } from "@/utils/contractMath";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { openWhatsAppContract } from "@/utils/contractShareUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContractMobileCardProps {
  contract: Contract;
  onViewDetails: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onSendForSignature: (contract: Contract) => void;
  onDownloadPDF?: (contract: Contract) => void;
  signatureLoading?: Record<string, boolean>;
  paymentSummary?: any;
}

export const ContractMobileCard: React.FC<ContractMobileCardProps> = ({
  contract,
  onViewDetails,
  onEditContract,
  onDeleteContract,
  onSendForSignature,
  onDownloadPDF,
  signatureLoading,
  paymentSummary,
}) => {
  const summary = computeContractSummary(contract, { advanceMode: "field" });
  const overdueDays = summary.overdueDays || 0;
  const extensionDays = summary.extensionDays || 0;
  const isOverdue = contract.status === "ouvert" && overdueDays > 0;
  const isPendingSignature = contract.status === "sent" || contract.status === "draft";
  const isSigned = contract.status === "signed";
  const isClosed = contract.status === "ferme" || contract.status === "completed";

  let totalPaid = contract.advance_payment || 0;
  let remaining = 0;
  if (paymentSummary) {
    totalPaid = paymentSummary.totalPaid;
    remaining = paymentSummary.remainingAmount;
  } else {
    remaining = Math.max(0, (contract.total_amount || summary.total) - totalPaid);
  }

  const formatCurrency = (val: number) => `${Number(val || 0).toLocaleString()} MAD`;

  const getCleanDate = (dStr: string) => {
    try {
      return format(parseISO(dStr), "dd MMM yyyy", { locale: fr });
    } catch {
      return dStr ? dStr.split("T")[0] : "-";
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 shadow-sm relative overflow-hidden ${
        isOverdue
          ? "bg-red-500/5 border-red-500/30 dark:bg-red-950/20"
          : isClosed
          ? "bg-muted/30 border-border/40 opacity-90"
          : "bg-card border-border/60 hover:border-primary/40 shadow-card"
      }`}
    >
      {/* Top Bar: Number & Status Badges */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-muted-foreground uppercase">
            #{contract.contract_number}
          </span>
          {isOverdue && (
            <Badge className="bg-red-500 text-white font-bold text-[10px] animate-pulse flex items-center gap-1 px-2 py-0.5">
              <AlertTriangle className="h-3 w-3" />
              Retard +{overdueDays}j
            </Badge>
          )}
          {extensionDays > 0 && (
            <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold text-[10px] border-blue-500/20">
              +{extensionDays}j prolonge
            </Badge>
          )}
        </div>

        <Badge
          className={`font-semibold text-[11px] px-2.5 py-0.5 capitalize ${
            isClosed
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : isOverdue
              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20"
              : isPendingSignature
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-primary/15 text-primary border-primary/20"
          }`}
        >
          {isClosed ? "Clôturé" : isOverdue ? "En retard" : contract.status === "ouvert" ? "En cours" : contract.status}
        </Badge>
      </div>

      {/* Main Body */}
      <div className="py-3 space-y-2.5">
        {/* Customer & Phone */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="font-bold text-sm text-foreground truncate">{contract.customer_name}</p>
              {contract.customer_phone && (
                <p className="text-xs text-muted-foreground truncate">{contract.customer_phone}</p>
              )}
            </div>
          </div>

          {contract.customer_phone && (
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={`tel:${contract.customer_phone}`}
                className="h-8 w-8 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground"
                title="Appeler le client"
              >
                <Phone className="h-4 w-4" />
              </a>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openWhatsAppContract(contract)}
                className="h-8 w-8 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                title="Partager sur WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 text-xs">
          <Car className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold text-foreground truncate">{contract.vehicle || "Véhicule non spécifié"}</span>
        </div>

        {/* Rental Dates & Timeline */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              Départ
            </span>
            <p className="font-medium text-foreground">{getCleanDate(contract.start_date)}</p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Retour prévu
            </span>
            <p className={`font-medium ${isOverdue ? "text-red-500 font-bold" : "text-foreground"}`}>
              {getCleanDate(contract.end_date)}
            </p>
          </div>
        </div>

        {/* Financial Strip */}
        <div className="mt-2 p-2.5 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total TTC</span>
            <span className="font-black text-sm text-foreground">{formatCurrency(contract.total_amount || summary.total)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Reste à payer</span>
            <span
              className={`font-black text-sm ${
                remaining <= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {remaining <= 0 ? "Réglé" : formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer (Mobile Touch-Optimized) */}
      <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(contract)}
            className="h-8 px-2.5 rounded-lg text-xs font-bold text-foreground hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5 mr-1 text-primary" />
            Détails
          </Button>

          {onDownloadPDF && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownloadPDF(contract)}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Télécharger PDF"
            >
              <FileDown className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditContract(contract)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Modifier"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          {isPendingSignature && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendForSignature(contract)}
              disabled={signatureLoading?.[contract.id]}
              className="h-8 px-2 text-xs font-bold border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            >
              <FileCheck className="h-3.5 w-3.5 mr-1" />
              Signer
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera définitivement le contrat #{contract.contract_number} ({contract.customer_name}).
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteContract(contract.id)}
                  className="bg-destructive hover:bg-destructive/90 text-white font-bold"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};
