import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Phone, MessageSquare, CreditCard, Award, Eye, Edit, 
  Trash2, MapPin, Globe, Calendar, Car, ShieldCheck, ChevronRight 
} from "lucide-react";
import { Tenant } from "@/types/appData";

interface TenantCardProps {
  tenant: Tenant;
  onView: (tenant: Tenant) => void;
  onEdit: (tenant: Tenant) => void;
  onDelete: (tenantId: string) => void;
  activeContractVehicle?: string | null;
  rentalCount?: number;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onView,
  onEdit,
  onDelete,
  activeContractVehicle,
  rentalCount = 0
}) => {
  const nomComplet = `${tenant.prenom || ""} ${tenant.nom || ""}`.trim() || "Client sans nom";
  const initials = `${(tenant.prenom?.[0] || "").toUpperCase()}${(tenant.nom?.[0] || "").toUpperCase()}` || "CL";
  const rawPhone = (tenant.telephone || "").replace(/[^0-9+]/g, "");
  
  // Format WhatsApp Link (defaults to Morocco +212 if starting with 0)
  const getWhatsAppNumber = (phoneStr: string) => {
    let clean = phoneStr.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "212" + clean.substring(1);
    }
    return clean;
  };
  const waNumber = getWhatsAppNumber(rawPhone);

  // Determine Loyalty Tier
  const getLoyaltyBadge = (count: number) => {
    if (count >= 10) return { label: "Client VIP", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "👑" };
    if (count >= 5) return { label: "Client Gold", bg: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", icon: "⭐" };
    if (count >= 2) return { label: "Client Régulier", bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", icon: "🥈" };
    return { label: "Nouveau Client", bg: "bg-muted text-muted-foreground border-border/40", icon: "✨" };
  };

  const loyalty = getLoyaltyBadge(rentalCount);
  const isPrincipal = tenant.type === "Locataire Principal";

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card to-card/95 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Ambient Top Glow */}
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl group-hover:bg-accent/20 transition-all pointer-events-none" />

      <CardContent className="p-5 space-y-4">
        {/* Header Profile Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with Initials or Image */}
            <div className="relative">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-accent/20 to-accent/5 border border-accent/30 text-accent font-black text-base flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                {tenant.tenantImageUrl ? (
                  <img src={tenant.tenantImageUrl} alt={nomComplet} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              {activeContractVehicle && (
                <span 
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background shadow-xs" 
                  title="En cours de location active"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${loyalty.bg}`}>
                  {loyalty.icon} {loyalty.label}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPrincipal ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {isPrincipal ? "Principal" : "Secondaire"}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate mt-1 group-hover:text-accent transition-colors">
                {nomComplet}
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 truncate">
                <Globe className="w-3 h-3 text-accent shrink-0" />
                {tenant.nationalite || "Marocaine"}
              </p>
            </div>
          </div>
        </div>

        {/* Active Rental Alert (If currently driving a vehicle) */}
        {activeContractVehicle && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-2">
              <Car className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span className="font-bold text-emerald-700 dark:text-emerald-300 truncate">
                Location en cours: <span className="font-black">{activeContractVehicle}</span>
              </span>
            </div>
          </div>
        )}

        {/* Identification Spec Pills (CIN & Permis) */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
              CIN / Passeport
            </span>
            <span className="font-mono text-xs font-black text-foreground truncate block mt-0.5">
              {tenant.cin || tenant.passeport || "Non renseigné"}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/40">
            <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">
              Permis Conduire
            </span>
            <span className="font-mono text-xs font-black text-foreground truncate block mt-0.5">
              {tenant.permis || "Non renseigné"}
            </span>
          </div>
        </div>

        {/* Mobile Quick Telecom Buttons (Phone & WhatsApp) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {rawPhone ? (
            <a 
              href={`tel:${rawPhone}`}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-2xl bg-muted/60 hover:bg-foreground hover:text-background border border-border/50 font-bold text-xs transition-all active:scale-95"
            >
              <Phone className="w-3.5 h-3.5 text-accent" />
              <span className="truncate">Appeler</span>
            </a>
          ) : (
            <div className="flex items-center justify-center h-10 px-3 rounded-2xl bg-muted/20 border border-border/30 text-[11px] text-muted-foreground font-medium">
              Pas de tél.
            </div>
          )}

          {rawPhone ? (
            <a 
              href={`https://wa.me/${waNumber}?text=Bonjour%20${encodeURIComponent(tenant.prenom || '')},`}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 font-bold text-xs text-emerald-600 dark:text-emerald-400 transition-all active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          ) : (
            <div className="flex items-center justify-center h-10 px-3 rounded-2xl bg-muted/20 border border-border/30 text-[11px] text-muted-foreground font-medium">
              Pas de WhatsApp
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/40">
          <Button
            variant="default"
            size="sm"
            onClick={() => onView(tenant)}
            className="flex-1 font-bold bg-foreground text-background hover:bg-foreground/90 rounded-2xl h-10 shadow-xs transition-transform active:scale-95 text-xs"
          >
            <Eye className="w-4 h-4 mr-1.5 text-accent" />
            Dossier 360°
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(tenant)}
            aria-label="Modifier"
            className="h-10 w-10 p-0 rounded-2xl border-border/60 hover:bg-accent/10 hover:text-accent transition-transform active:scale-95 shrink-0"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Supprimer"
                className="h-10 w-10 p-0 rounded-2xl border-border/60 text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-transform active:scale-95 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border border-border/60 backdrop-blur-xl bg-card/95 shadow-2xl p-6">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black">
                  Confirmer la suppression du client
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-medium text-sm pt-2">
                  Êtes-vous sûr de vouloir supprimer le profil de <span className="text-foreground font-bold">{nomComplet}</span> (CIN: {tenant.cin || "N/A"}) ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 mt-4">
                <AlertDialogCancel className="rounded-2xl font-bold border-border/60">Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(tenant.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl font-bold"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};
export default TenantCard;
