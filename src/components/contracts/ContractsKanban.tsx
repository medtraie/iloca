import React, { useMemo } from "react";
import { Contract } from "@/hooks/useContracts";
import { computeContractSummary } from "@/utils/contractMath";
import { ContractMobileCard } from "./ContractMobileCard";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Car,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { isToday, parseISO, isPast } from "date-fns";

interface ContractsKanbanProps {
  contracts: Contract[];
  onViewDetails: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onSendForSignature: (contract: Contract) => void;
  onDownloadPDF?: (contract: Contract) => void;
  signatureLoading?: Record<string, boolean>;
  getPaymentSummary?: (contractId: string) => any;
}

export const ContractsKanban: React.FC<ContractsKanbanProps> = ({
  contracts,
  onViewDetails,
  onEditContract,
  onDeleteContract,
  onSendForSignature,
  onDownloadPDF,
  signatureLoading,
  getPaymentSummary,
}) => {
  const columns = useMemo(() => {
    const drafts: Contract[] = [];
    const active: Contract[] = [];
    const returningSoon: Contract[] = [];
    const overdue: Contract[] = [];
    const closed: Contract[] = [];

    contracts.forEach((c) => {
      const summary = computeContractSummary(c, { advanceMode: "field" });
      const overdueDays = summary.overdueDays || 0;
      const isClosed = c.status === "ferme" || c.status === "completed";

      if (isClosed) {
        closed.push(c);
      } else if (c.status === "ouvert" && overdueDays > 0) {
        overdue.push(c);
      } else if (c.status === "draft" || c.status === "sent") {
        drafts.push(c);
      } else {
        // Check if return is today or tomorrow
        try {
          const endDate = parseISO(c.end_date);
          if (isToday(endDate)) {
            returningSoon.push(c);
          } else {
            active.push(c);
          }
        } catch {
          active.push(c);
        }
      }
    });

    return [
      {
        id: "active",
        title: "En circulation",
        subtitle: "Véhicules loués actifs",
        icon: Car,
        color: "text-blue-500",
        badgeBg: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        items: active,
      },
      {
        id: "returning",
        title: "Restitution aujourd'hui",
        subtitle: "Check-in attendu",
        icon: Clock,
        color: "text-amber-500",
        badgeBg: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        items: returningSoon,
      },
      {
        id: "overdue",
        title: "En retard / Relance",
        subtitle: "Date limite dépassée",
        icon: AlertTriangle,
        color: "text-red-500",
        badgeBg: "bg-red-500/10 text-red-600 border-red-500/20",
        items: overdue,
      },
      {
        id: "drafts",
        title: "Brouillons & Signature",
        subtitle: "En cours de validation",
        icon: FileText,
        color: "text-purple-500",
        badgeBg: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        items: drafts,
      },
      {
        id: "closed",
        title: "Clôturés",
        subtitle: "Véhicules réintégrés",
        icon: CheckCircle2,
        color: "text-emerald-500",
        badgeBg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        items: closed,
      },
    ];
  }, [contracts]);

  return (
    <div className="overflow-x-auto pb-4 pt-1">
      <div className="flex gap-4 min-w-[1200px] items-start">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className="flex-1 min-w-[280px] max-w-[340px] bg-muted/20 border border-border/40 rounded-2xl p-3 flex flex-col max-h-[80vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-card border shadow-xs ${col.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-foreground">
                      {col.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{col.subtitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`font-black text-xs px-2 ${col.badgeBg}`}>
                  {col.items.length}
                </Badge>
              </div>

              {/* Cards Container with smooth scrolling */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[150px]">
                {col.items.length === 0 ? (
                  <div className="h-28 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center p-3 text-center">
                    <p className="text-xs text-muted-foreground font-medium">Aucun contrat</p>
                  </div>
                ) : (
                  col.items.map((contract) => (
                    <ContractMobileCard
                      key={contract.id}
                      contract={contract}
                      onViewDetails={onViewDetails}
                      onEditContract={onEditContract}
                      onDeleteContract={onDeleteContract}
                      onSendForSignature={onSendForSignature}
                      onDownloadPDF={onDownloadPDF}
                      signatureLoading={signatureLoading}
                      paymentSummary={getPaymentSummary ? getPaymentSummary(contract.id) : undefined}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
