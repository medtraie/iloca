
import { Bell, Search, Settings as SettingsIcon, Keyboard, ChevronDown, FileText, Car, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { localStorageService } from "@/services/localStorageService";
import { toast } from "@/components/ui/sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

export function TopHeader() {
  const { user, logout } = useAuth();
  const [company, setCompany] = useState<string>(() => localStorage.getItem("company:selected") || "SFTLOCATION");
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; description: string; icon: "contract" | "vehicle" | "expense" }>>([]);
  const [signoutOpen, setSignoutOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("company:selected", company);
  }, [company]);

  useEffect(() => {
    const items: Array<{ id: string; title: string; description: string; icon: "contract" | "vehicle" | "expense" }> = [];
    const contracts = localStorageService.getAll<any>('contracts').slice(-1);
    const vehicles = localStorageService.getAll<any>('vehicles').slice(-1);
    const expenses = (localStorageService.getAll('expenses') as any[]).slice(-1);
    contracts.forEach((c: any) => items.push({ id: c.id || `c-${Date.now()}`, title: "Nouveau contrat", description: c.contract_number || "", icon: "contract" }));
    vehicles.forEach((v: any) => items.push({ id: v.id || `v-${Date.now()}`, title: "Véhicule ajouté", description: `${v.marque || ""} ${v.modele || ""}`, icon: "vehicle" }));
    expenses.forEach((e: any) => items.push({ id: e.id || `e-${Date.now()}`, title: "Dépense enregistrée", description: e.type || "", icon: "expense" }));
    setNotifications(items.slice(0, 3));
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-8 w-8" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hidden sm:inline-flex items-center gap-2">
                <span className="font-medium">{company}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setCompany("SFTLOCATION")}>SFTLOCATION</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCompany("Acme Rental")}>Acme Rental</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative max-w-full sm:max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher des véhicules..."
              className="pl-10 w-full sm:w-80 bg-muted/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 ? <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full" /> : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>{notifications.length} nouvelles notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem>Aucune notification</DropdownMenuItem>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      {n.icon === "contract" ? <FileText className="h-4 w-4" /> : n.icon === "vehicle" ? <Car className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-muted-foreground">{n.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Keyboard className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Raccourcis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Trier la barre latérale (Ctrl+B)</DropdownMenuItem>
              <DropdownMenuItem>Palette de commandes (Ctrl+K)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings" aria-label="Paramètres">
              <SettingsIcon className="h-5 w-5" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="p-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder.svg" alt="@user" />
                  <AvatarFallback>{(user?.fullName || "SU").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="space-y-1">
                <div>Mon compte</div>
                <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">Paramètres</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Profil</DropdownMenuItem>
              <DropdownMenuItem>Compte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setSignoutOpen(true); }}>Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog open={signoutOpen} onOpenChange={setSignoutOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la déconnexion</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir vous déconnecter ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => { logout(); toast.success("Déconnecté"); }}>{`Se déconnecter`}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
