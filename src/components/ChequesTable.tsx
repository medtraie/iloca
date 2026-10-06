import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, FileText, ArrowUpRight, ArrowDownLeft, ShieldAlert, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Payment, RelanceLevel } from "@/types/payment";
import { getPriorityLevel, getDelayDays } from "@/utils/chequeUtils";

export interface CheckRecord extends Payment {
  sourceType: "contrat" | "reparation";
  canEdit: boolean;
  riskScore: number;
}

interface ChequesTableProps {
  checks: CheckRecord[];
  visibleColumns: string[];
  selectedChecks: string[];
  allSelectableVisibleIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  onEdit: (check: CheckRecord) => void;
  onDelete: (check: CheckRecord) => void;
  onSendRelance: (checkId: string, level: RelanceLevel) => void;
  isMobile: boolean;
}

const statusLabelClass: Record<string, string> = {
  "encaissé": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "non encaissé": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "partiellement encaissé": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "retourné": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
};

const priorityLabelClass: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 font-bold",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  low: "bg-muted text-muted-foreground border-border/50",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
};

export const ChequesTable: React.FC<ChequesTableProps> = ({
  checks,
  visibleColumns,
  selectedChecks,
  allSelectableVisibleIds,
  onToggleSelectAll,
  onToggleSelectOne,
  onEdit,
  onDelete,
  onSendRelance,
  isMobile
}) => {
  const renderTimeline = (check: CheckRecord) => {
    const status = check.checkDepositStatus || "non encaissé";
    const depositedDone = status === "encaissé" || status === "partiellement encaissé" || status === "retourné";
    const finalLabel = status === "retourné" ? "Retourné" : "Encaissé";
    const finalDone = status === "encaissé" || status === "retourné";

    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/30 border border-border/40 text-[11px] font-semibold">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Créé</span>
        </div>
        <span className="text-muted-foreground/60">→</span>
        <div className="flex items-center gap-1">
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", depositedDone ? "bg-blue-500" : "bg-muted-foreground/30")} />
          <span>Déposé</span>
        </div>
        <span className="text-muted-foreground/60">→</span>
        <div className="flex items-center gap-1">
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", finalDone ? "bg-emerald-500" : status === "retourné" ? "bg-red-500" : "bg-muted-foreground/30")} />
          <span className={status === "retourné" ? "text-red-500 font-bold" : ""}>{finalLabel}</span>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {checks.length === 0 ? (
          <Card className="rounded-3xl border border-border/60 bg-card/80 p-8 text-center text-muted-foreground font-medium">
            Aucun chèque trouvé
          </Card>
        ) : (
          checks.map((check) => {
            const priority = getPriorityLevel(check);
            const status = check.checkDepositStatus || "non encaissé";
            const delayDays = getDelayDays(check);

            return (
              <Card key={check.id} className="rounded-3xl border border-border/60 bg-card/90 shadow-xs overflow-hidden">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-foreground leading-snug">
                        {check.checkName || "Bénéficiaire inconnu"}
                      </p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Badge variant="outline" className="text-[10px] rounded-lg font-bold">
                          {check.sourceType === "reparation" ? "Réparation" : "Contrat"}
                        </Badge>
                        <Badge className={cn("text-[10px] rounded-lg border font-bold", check.checkDirection === "reçu" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30")}>
                          {check.checkDirection || "reçu"}
                        </Badge>
                        <Badge className={cn("text-[10px] rounded-lg border", priorityLabelClass[priority])}>
                          {priority}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={cn("text-xs rounded-xl px-2.5 py-1 font-bold border shrink-0", statusLabelClass[status])}>
                      {status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2.5 my-1">
                    <div>
                      <span className="text-muted-foreground block font-medium">N° chèque:</span>
                      <span className="font-bold text-foreground">{check.checkReference || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Contrat:</span>
                      <span className="font-bold text-foreground">{check.contractNumber}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Date chèque:</span>
                      <span className="font-bold text-foreground">
                        {check.paymentDate ? format(new Date(check.paymentDate), "dd/MM/yyyy") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Encaissement:</span>
                      <span className="font-bold text-foreground">
                        {check.checkDepositDate ? format(new Date(check.checkDepositDate), "dd/MM/yyyy") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Délai:</span>
                      <span className="font-bold text-foreground">
                        {delayDays > 0 ? `Retard ${delayDays} j` : delayDays === 0 ? "Aujourd'hui" : `J${delayDays}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block font-medium">Score risque:</span>
                      <span className="font-bold text-foreground">{check.riskScore}/100</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-muted-foreground">Montant du chèque</span>
                    <span className="text-base font-black text-primary">
                      {check.amount.toLocaleString()} MAD
                    </span>
                  </div>

                  {renderTimeline(check)}

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-[11px] font-medium mr-1">Relance:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-xl p-0 text-[11px] font-bold"
                        disabled={!check.canEdit}
                        onClick={() => onSendRelance(check.id, "1ère")}
                      >
                        1
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-xl p-0 text-[11px] font-bold"
                        disabled={!check.canEdit}
                        onClick={() => onSendRelance(check.id, "2ème")}
                      >
                        2
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 rounded-xl p-0 text-[11px] font-bold text-red-600 border-red-300"
                        disabled={!check.canEdit}
                        onClick={() => onSendRelance(check.id, "finale")}
                      >
                        F
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(check)}
                        className="h-8 px-2.5 rounded-xl text-blue-600 hover:bg-blue-500/10 font-bold"
                        disabled={!check.canEdit}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" /> Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(check)}
                        className="h-8 px-2.5 rounded-xl text-red-600 hover:bg-red-500/10 font-bold"
                        disabled={!check.canEdit}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Liste des Chèques Registrés ({checks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border/50">
                {visibleColumns.includes("selection") && (
                  <TableHead className="w-10 px-4">
                    <Checkbox
                      checked={allSelectableVisibleIds.length > 0 && selectedChecks.length === allSelectableVisibleIds.length}
                      onCheckedChange={onToggleSelectAll}
                    />
                  </TableHead>
                )}
                {visibleColumns.includes("name") && <TableHead className="font-bold text-xs">Client / Bénéficiaire</TableHead>}
                {visibleColumns.includes("contract") && <TableHead className="font-bold text-xs">N° Contrat</TableHead>}
                {visibleColumns.includes("source") && <TableHead className="font-bold text-xs">Origine</TableHead>}
                {visibleColumns.includes("reference") && <TableHead className="font-bold text-xs">Référence Chèque</TableHead>}
                {visibleColumns.includes("paymentDate") && <TableHead className="font-bold text-xs">Date Chèque</TableHead>}
                {visibleColumns.includes("depositDate") && <TableHead className="font-bold text-xs">Encaissement</TableHead>}
                {visibleColumns.includes("direction") && <TableHead className="font-bold text-xs">Direction</TableHead>}
                {visibleColumns.includes("status") && <TableHead className="font-bold text-xs">Statut</TableHead>}
                {visibleColumns.includes("amount") && <TableHead className="font-bold text-xs">Montant (MAD)</TableHead>}
                {visibleColumns.includes("delay") && <TableHead className="font-bold text-xs">Délai</TableHead>}
                {visibleColumns.includes("priority") && <TableHead className="font-bold text-xs">Priorité</TableHead>}
                {visibleColumns.includes("risk") && <TableHead className="font-bold text-xs">Score Risque</TableHead>}
                {visibleColumns.includes("timeline") && <TableHead className="font-bold text-xs">Timeline</TableHead>}
                {visibleColumns.includes("relance") && <TableHead className="font-bold text-xs">Relances</TableHead>}
                {visibleColumns.includes("actions") && <TableHead className="font-bold text-xs text-right pr-6">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {checks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-10 text-muted-foreground font-medium">
                    Aucun chèque ne correspond aux critères de recherche.
                  </TableCell>
                </TableRow>
              ) : (
                checks.map((check) => {
                  const priority = getPriorityLevel(check);
                  const status = check.checkDepositStatus || "non encaissé";
                  const delayDays = getDelayDays(check);

                  return (
                    <TableRow key={`${check.sourceType}-${check.id}`} className="hover:bg-muted/30 border-border/40 transition-colors">
                      {visibleColumns.includes("selection") && (
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedChecks.includes(check.id)}
                            onCheckedChange={() => onToggleSelectOne(check.id)}
                            disabled={!check.canEdit}
                          />
                        </TableCell>
                      )}

                      {visibleColumns.includes("name") && (
                        <TableCell className="font-bold text-xs text-foreground py-3.5">
                          {check.checkName || check.customerName || "-"}
                        </TableCell>
                      )}

                      {visibleColumns.includes("contract") && (
                        <TableCell className="text-xs font-semibold text-muted-foreground py-3.5">
                          {check.contractNumber || "-"}
                        </TableCell>
                      )}

                      {visibleColumns.includes("source") && (
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className="text-[11px] rounded-lg font-bold">
                            {check.sourceType === "reparation" ? "Réparation" : "Contrat"}
                          </Badge>
                        </TableCell>
                      )}

                      {visibleColumns.includes("reference") && (
                        <TableCell className="font-mono text-xs font-bold text-foreground py-3.5">
                          {check.checkReference || "-"}
                        </TableCell>
                      )}

                      {visibleColumns.includes("paymentDate") && (
                        <TableCell className="text-xs font-medium text-muted-foreground py-3.5">
                          {check.paymentDate ? format(new Date(check.paymentDate), "dd/MM/yyyy") : "-"}
                        </TableCell>
                      )}

                      {visibleColumns.includes("depositDate") && (
                        <TableCell className="text-xs font-medium text-muted-foreground py-3.5">
                          {check.checkDepositDate ? format(new Date(check.checkDepositDate), "dd/MM/yyyy") : "-"}
                        </TableCell>
                      )}

                      {visibleColumns.includes("direction") && (
                        <TableCell className="py-3.5">
                          <Badge className={cn("text-[10px] rounded-xl border font-bold px-2 py-0.5", check.checkDirection === "reçu" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30")}>
                            {check.checkDirection === "reçu" ? <ArrowDownLeft className="h-3 w-3 mr-1 inline" /> : <ArrowUpRight className="h-3 w-3 mr-1 inline" />}
                            {check.checkDirection || "reçu"}
                          </Badge>
                        </TableCell>
                      )}

                      {visibleColumns.includes("status") && (
                        <TableCell className="py-3.5">
                          <Badge className={cn("text-[11px] rounded-xl border font-bold px-2.5 py-1", statusLabelClass[status])}>
                            {status}
                          </Badge>
                        </TableCell>
                      )}

                      {visibleColumns.includes("amount") && (
                        <TableCell className="font-black text-sm text-foreground py-3.5">
                          {check.amount.toLocaleString()} MAD
                        </TableCell>
                      )}

                      {visibleColumns.includes("delay") && (
                        <TableCell className="text-xs py-3.5 font-bold">
                          {delayDays > 0 ? (
                            <span className="text-red-500">Retard {delayDays} j</span>
                          ) : delayDays === 0 ? (
                            <span className="text-amber-500">Aujourd'hui</span>
                          ) : (
                            <span className="text-muted-foreground">J{delayDays}</span>
                          )}
                        </TableCell>
                      )}

                      {visibleColumns.includes("priority") && (
                        <TableCell className="py-3.5">
                          <Badge className={cn("text-[10px] rounded-xl border px-2 py-0.5 uppercase tracking-wider", priorityLabelClass[priority])}>
                            {priority}
                          </Badge>
                        </TableCell>
                      )}

                      {visibleColumns.includes("risk") && (
                        <TableCell className="py-3.5">
                          <Badge variant="outline" className={cn("text-xs font-bold rounded-lg", check.riskScore >= 40 ? "border-red-500/30 text-red-600 bg-red-500/5" : "border-border/60")}>
                            {check.riskScore}/100
                          </Badge>
                        </TableCell>
                      )}

                      {visibleColumns.includes("timeline") && (
                        <TableCell className="py-3.5">
                          {renderTimeline(check)}
                        </TableCell>
                      )}

                      {visibleColumns.includes("relance") && (
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-[10px] rounded-xl font-bold"
                              disabled={!check.canEdit}
                              onClick={() => onSendRelance(check.id, "1ère")}
                              title="Relance 1ère"
                            >
                              1
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-[10px] rounded-xl font-bold"
                              disabled={!check.canEdit}
                              onClick={() => onSendRelance(check.id, "2ème")}
                              title="Relance 2ème"
                            >
                              2
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0 text-[10px] rounded-xl font-bold text-red-600 border-red-300 hover:bg-red-50"
                              disabled={!check.canEdit}
                              onClick={() => onSendRelance(check.id, "finale")}
                              title="Relance finale"
                            >
                              F
                            </Button>
                          </div>
                        </TableCell>
                      )}

                      {visibleColumns.includes("actions") && (
                        <TableCell className="py-3.5 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(check)}
                              className="h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-500/10 hover:text-blue-700"
                              title="Modifier"
                              disabled={!check.canEdit}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(check)}
                              className="h-8 w-8 p-0 rounded-xl text-red-600 hover:bg-red-500/10 hover:text-red-700"
                              title="Supprimer"
                              disabled={!check.canEdit}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChequesTable;
