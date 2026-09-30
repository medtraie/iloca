import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, Phone, MessageSquare, Car, AlertTriangle, 
  CheckCircle2, ArrowRight, ArrowUpRight, User, ShieldAlert 
} from "lucide-react";
import { Link } from "react-router-dom";

export interface OperationContract {
  id: string;
  contractNumber?: string;
  customerName: string;
  customerPhone?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  status: string;
  totalAmount?: string | number;
}

interface TodayOperationsHubProps {
  contracts: any[];
}

export const TodayOperationsHub: React.FC<TodayOperationsHubProps> = ({ contracts }) => {
  const [activeTab, setActiveTab] = useState<"returns" | "overdue" | "departures">("returns");
  
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  
  // Format WhatsApp Link
  const getWhatsAppLink = (phone?: string, clientName?: string, vehicle?: string, isOverdue?: boolean) => {
    if (!phone) return "#";
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) clean = "212" + clean.substring(1);
    
    const message = isOverdue
      ? `Bonjour ${clientName || ''}, nous constatons que la restitution du véhicule ${vehicle || ''} est en retard. Merci de nous contacter d'urgence pour régulariser votre contrat.`
      : `Bonjour ${clientName || ''}, nous vous rappelons que la restitution de votre véhicule ${vehicle || ''} est prévue aujourd'hui. Merci de préparer le véhicule pour le check-in.`;

    return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  };

  // Classify contracts
  const todayReturns: OperationContract[] = [];
  const overdueContracts: OperationContract[] = [];
  const todayDepartures: OperationContract[] = [];

  contracts.forEach((c: any) => {
    const endRaw = c.end_date || c.endDate || c.date_fin;
    const startRaw = c.start_date || c.startDate || c.date_debut || c.created_at;
    const isActive = ['signed', 'sent', 'ouvert', 'Actif', 'actif'].includes(c.status);

    const endFormatted = endRaw ? new Date(endRaw).toISOString().slice(0, 10) : "";
    const startFormatted = startRaw ? new Date(startRaw).toISOString().slice(0, 10) : "";

    const item: OperationContract = {
      id: c.id,
      contractNumber: c.contract_number || c.contractNumber || c.id,
      customerName: c.customer_name || c.customerName || "Client",
      customerPhone: c.customer_phone || c.customerPhone || c.telephone || "",
      vehicle: c.vehicle || c.vehicule || (c.vehicle_info ? `${c.vehicle_info.marque} ${c.vehicle_info.modele}` : "Véhicule"),
      startDate: startRaw,
      endDate: endRaw,
      status: c.status,
      totalAmount: c.total_amount || c.totalAmount || 0,
    };

    if (isActive) {
      if (endFormatted && endFormatted < todayStr) {
        overdueContracts.push(item);
      } else if (endFormatted === todayStr) {
        todayReturns.push(item);
      }
    }

    if (startFormatted === todayStr) {
      todayDepartures.push(item);
    }
  });

  const getItemsForTab = () => {
    if (activeTab === "overdue") return overdueContracts;
    if (activeTab === "departures") return todayDepartures;
    return todayReturns;
  };

  const currentList = getItemsForTab();

  return (
    <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
      <CardHeader className="p-5 sm:p-6 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <CardTitle className="text-lg sm:text-xl font-black tracking-tight">
                Mouvements de Flotte & Opérations du Jour
              </CardTitle>
            </div>
            <CardDescription className="text-xs font-medium mt-0.5">
              Suivi en direct des restitutions, départs et dépassements
            </CardDescription>
          </div>

          <Link to="/contracts">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold gap-1 text-accent hover:text-accent">
              Tous les contrats <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border/40 rounded-2xl mt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("returns")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "returns"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            <span>Retours Prévus</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
              activeTab === "returns" ? "bg-background/20 text-background" : "bg-muted text-foreground"
            }`}>
              {todayReturns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("overdue")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "overdue"
                ? "bg-destructive text-destructive-foreground shadow-xs"
                : overdueContracts.length > 0
                ? "text-destructive font-black bg-destructive/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Dépassements / Retards</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
              activeTab === "overdue" ? "bg-white/20 text-white" : "bg-destructive/20 text-destructive"
            }`}>
              {overdueContracts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("departures")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "departures"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Car className="w-3.5 h-3.5 text-emerald-500" />
            <span>Départs du Jour</span>
            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
              activeTab === "departures" ? "bg-background/20 text-background" : "bg-muted text-foreground"
            }`}>
              {todayDepartures.length}
            </span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2">
        {currentList.length === 0 ? (
          <div className="py-10 text-center rounded-2xl border border-dashed border-border/50 bg-muted/10 space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs font-bold text-foreground">
              {activeTab === "overdue" 
                ? "Aucun retard ou dépassement de contrat !" 
                : activeTab === "departures" 
                ? "Aucun nouveau départ prévu aujourd'hui" 
                : "Aucune restitution attendue pour aujourd'hui"}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Toutes les opérations de cette catégorie sont à jour.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map((item) => {
              const rawPhone = item.customerPhone?.replace(/[^0-9+]/g, "");
              const isOverdue = activeTab === "overdue";

              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isOverdue 
                      ? "bg-destructive/5 border-destructive/30 hover:border-destructive/50" 
                      : "bg-background/60 border-border/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      isOverdue 
                        ? "bg-destructive/15 text-destructive border border-destructive/30" 
                        : "bg-accent/15 text-accent border border-accent/30"
                    }`}>
                      <Car className="w-5 h-5" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-foreground truncate">
                          {item.vehicle}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono font-bold">
                          #{item.contractNumber}
                        </Badge>
                        {isOverdue && (
                          <Badge className="bg-destructive text-destructive-foreground text-[10px] font-black animate-pulse">
                            Retard Restitution
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate">
                        <User className="w-3 h-3 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">{item.customerName}</span>
                        {item.customerPhone && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.customerPhone}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions (WhatsApp, Call, Details) */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {rawPhone && (
                      <a
                        href={getWhatsAppLink(rawPhone, item.customerName, item.vehicle, isOverdue)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 h-9 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs transition-all active:scale-95"
                        title="Relancer sur WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {rawPhone && (
                      <a
                        href={`tel:${rawPhone}`}
                        className="flex items-center gap-1 px-2.5 h-9 rounded-xl bg-muted/60 hover:bg-foreground hover:text-background border border-border/50 font-bold text-xs transition-all active:scale-95"
                        title="Appeler le client"
                      >
                        <Phone className="w-3.5 h-3.5 text-accent" />
                      </a>
                    )}

                    <Link to="/contracts">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-2.5 rounded-xl border-border/60 hover:bg-accent/10 font-bold text-xs gap-1"
                        title="Voir contrat"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayOperationsHub;
