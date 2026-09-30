import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Menu, Sparkles, ExternalLink, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { alertsService, AlertItem } from "@/services/alertsService";
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

export function TopHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const computed = await alertsService.compute();
        setAlerts(computed || []);
      } catch (e) {
        console.error("Failed to load alerts in header:", e);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleToggleMenu = () => {
    if (onMenuClick) {
      onMenuClick();
    } else {
      toggleSidebar();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-all">
      <div className="flex h-13 sm:h-14 items-center justify-between px-3 sm:px-6">
        {/* Left: Mobile hamburger menu toggle only when needed on small screens */}
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleMenu}
              className="h-9 w-9 rounded-xl hover:bg-muted/80 text-foreground"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Right: Only the Bell (Notifications) and the Déconnexion button */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* 🔔 Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-xl hover:bg-muted/80 text-foreground transition-all hover:scale-105 active:scale-95"
                title="Notifications & Alertes"
              >
                <Bell className="h-4.5 w-4.5 text-foreground/80 hover:text-foreground transition-colors" />
                {alerts.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl border-border/70 shadow-2xl overflow-hidden bg-card/98 backdrop-blur-xl">
              <DropdownMenuLabel className="p-4 border-b border-border/40 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="font-black text-sm text-foreground">Centre d'Alertes Flotte</span>
                  </div>
                  {alerts.length > 0 ? (
                    <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                      {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      À jour
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <ScrollArea className="h-72 p-2">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">Aucune alerte critique</p>
                    <p className="text-[11px] text-muted-foreground">Toutes les opérations de flotte sont conformes.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {alerts.map((alert) => (
                      <DropdownMenuItem
                        key={alert.id}
                        asChild
                        className="p-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors focus:bg-muted/50"
                      >
                        <Link to="/alerts" className="flex flex-col items-start gap-1 w-full">
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-bold text-xs text-foreground truncate">{alert.title}</span>
                            <Badge
                              variant={alert.severity === "critical" ? "destructive" : "secondary"}
                              className={`text-[9px] px-1.5 py-0 h-4 capitalize font-semibold shrink-0 ${
                                alert.severity === "critical"
                                  ? "bg-red-500/15 text-red-600 border-red-500/30"
                                  : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                              }`}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {alert.message}
                          </p>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <DropdownMenuSeparator className="m-0" />
              <div className="p-2 bg-muted/10">
                <Link
                  to="/alerts"
                  className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-primary hover:underline"
                >
                  <span>Voir le moniteur d'alertes complet</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 🚪 Bouton Déconnexion Direct & Développé */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 bg-red-500/5 hover:bg-red-500/15 hover:text-red-700 dark:hover:text-red-300 border border-red-500/20 shadow-xs transition-all hover:scale-102 active:scale-95 flex items-center gap-1.5"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-bold tracking-tight">Déconnexion</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border border-border/80 bg-background shadow-2xl p-6">
              <AlertDialogHeader>
                <div className="h-11 w-11 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
                  <LogOut className="h-5 w-5" />
                </div>
                <AlertDialogTitle className="text-lg font-black text-foreground">
                  Confirmer la déconnexion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground">
                  Êtes-vous sûr de vouloir fermer votre session active ? Vos données saisies sont sauvegardées en sécurité.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pt-2 gap-2">
                <AlertDialogCancel className="rounded-xl font-bold text-xs h-10">
                  Annuler
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="rounded-xl font-bold text-xs h-10 bg-destructive hover:bg-destructive/90 text-white shadow-md shadow-destructive/20"
                >
                  Se déconnecter
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}

export default TopHeader;
