import React from "react";
import { Plus, FileText, Users, Car, Receipt, Wrench, Fuel, MapPin, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Nouveau Contrat",
    description: "Créer une location",
    icon: FileText,
    href: "/contracts",
    colors: {
      bg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
      border: "hover:border-blue-500/50",
      glow: "group-hover:bg-blue-500/10",
    }
  },
  {
    title: "Nouveau Client",
    description: "Fiche CRM & CIN",
    icon: Users,
    href: "/customers",
    colors: {
      bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      border: "hover:border-emerald-500/50",
      glow: "group-hover:bg-emerald-500/10",
    }
  },
  {
    title: "Nouveau Véhicule",
    description: "Ajout au parc",
    icon: Car,
    href: "/vehicles",
    colors: {
      bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
      border: "hover:border-amber-500/50",
      glow: "group-hover:bg-amber-500/10",
    }
  },
  {
    title: "Nouvelle Facture",
    description: "Facturation & ICE",
    icon: Receipt,
    href: "/factures",
    colors: {
      bg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
      border: "hover:border-purple-500/50",
      glow: "group-hover:bg-purple-500/10",
    }
  },
  {
    title: "Déclarer Réparation",
    description: "Atelier & Garage",
    icon: Wrench,
    href: "/repairs",
    colors: {
      bg: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
      border: "hover:border-red-500/50",
      glow: "group-hover:bg-red-500/10",
    }
  },
  {
    title: "Suivi GPS Flotte",
    description: "Carte en direct",
    icon: MapPin,
    href: "/map",
    colors: {
      bg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
      border: "hover:border-cyan-500/50",
      glow: "group-hover:bg-cyan-500/10",
    }
  },
];

export function QuickActions() {
  return (
    <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden h-full flex flex-col justify-between">
      <CardHeader className="p-5 sm:p-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-black">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                Actions Rapides & Opérations
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Accès direct aux modules clés
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href} className="group block">
              <div className={`p-4 rounded-2xl bg-muted/20 border border-border/50 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-background group-hover:shadow-md flex flex-col items-center text-center gap-2.5 ${action.colors.border}`}>
                <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${action.colors.bg}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-foreground group-hover:text-accent transition-colors">
                    {action.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {action.description}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickActions;
