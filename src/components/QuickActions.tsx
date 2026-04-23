
import { Plus, Calendar, FileText, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Nouveau Contrat",
    description: "Location",
    icon: FileText,
    href: "/contracts",
    colors: {
      bg: "bg-card-blue-bg",
      icon: "text-card-blue",
      hover: "hover:border-card-blue/30"
    }
  },
  {
    title: "Nouveau Client",
    description: "Ajouter",
    icon: Plus,
    href: "/customers",
    colors: {
      bg: "bg-card-green-bg",
      icon: "text-card-green",
      hover: "hover:border-card-green/30"
    }
  },
  {
    title: "Facture",
    description: "Créer",
    icon: FileText,
    href: "/factures",
    colors: {
      bg: "bg-accent/10",
      icon: "text-accent",
      hover: "hover:border-accent/30"
    }
  },
  {
    title: "Ajouter Véhicule",
    description: "Flotte",
    icon: Car,
    href: "/vehicles",
    colors: {
      bg: "bg-card-orange-bg",
      icon: "text-card-orange",
      hover: "hover:border-card-orange/30"
    }
  },
];

export function QuickActions() {
  return (
    <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card h-full">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Plus className="h-5 w-5 text-accent" />
          Actions Rapides
        </CardTitle>
        <CardDescription className="font-medium">Actions essentielles du système</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href} className="group">
              <div className={`h-full p-6 rounded-[1.5rem] bg-background/40 border border-border/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-background group-hover:shadow-lg flex flex-col items-center gap-4 ${action.colors.hover}`}>
                <div className={`p-4 rounded-2xl ${action.colors.bg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <action.icon className={`h-6 w-6 ${action.colors.icon}`} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm text-foreground">{action.title}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{action.description}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
