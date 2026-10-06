import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckRecord } from "@/components/ChequesTable";
import { cn } from "@/lib/utils";

interface ChequesKanbanProps {
  kanbanGroups: {
    aEncaisser: CheckRecord[];
    aujourdHui: CheckRecord[];
    enRetard: CheckRecord[];
    encaisses: CheckRecord[];
  };
  onEdit: (check: CheckRecord) => void;
}

const statusLabelClass: Record<string, string> = {
  "encaissé": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "non encaissé": "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  "partiellement encaissé": "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "retourné": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
};

export const ChequesKanban: React.FC<ChequesKanbanProps> = ({ kanbanGroups, onEdit }) => {
  const columns = [
    { key: "aEncaisser", title: "À Encaisser", data: kanbanGroups.aEncaisser, color: "text-amber-600" },
    { key: "aujourdHui", title: "Aujourd'hui", data: kanbanGroups.aujourdHui, color: "text-blue-600" },
    { key: "enRetard", title: "En Retard", data: kanbanGroups.enRetard, color: "text-red-600" },
    { key: "encaisses", title: "Encaissés", data: kanbanGroups.encaisses, color: "text-emerald-600" }
  ];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {columns.map((column) => (
        <Card key={column.key} className="rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>{column.title}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full bg-background border border-border/50 font-black ${column.color}`}>
                {column.data.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
            {column.data.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 font-medium">Aucun chèque dans cette colonne</p>
            ) : (
              column.data.slice(0, 20).map((check) => (
                <div
                  key={check.id}
                  onClick={() => onEdit(check)}
                  className="rounded-2xl border border-border/50 bg-background/80 p-3.5 space-y-2 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors">
                        {check.checkReference || "Chèque sans réf"}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground truncate max-w-[150px]">
                        {check.customerName || check.checkName || "Client inconnu"}
                      </p>
                    </div>
                    <Badge className={cn("text-[10px] rounded-lg px-2 py-0.5 font-bold border shrink-0", statusLabelClass[check.checkDepositStatus || "non encaissé"])}>
                      {check.checkDepositStatus || "non encaissé"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30">
                    <span className="font-mono text-xs font-black text-primary">
                      {check.amount.toLocaleString()} MAD
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      Score: {check.riskScore}/100
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ChequesKanban;
