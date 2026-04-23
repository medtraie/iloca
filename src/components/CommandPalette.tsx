import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Home, Users, Car, FileText, Receipt, Settings, BarChart3, FileSpreadsheet, BellRing } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const routes = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "Clients", to: "/customers", icon: Users },
  { label: "Véhicules", to: "/vehicles", icon: Car },
  { label: "Contrats", to: "/contracts", icon: FileText },
  { label: "Revenus", to: "/recette", icon: Receipt },
  { label: "Dépenses", to: "/expenses", icon: Receipt },
  { label: "Chèques", to: "/cheques", icon: Receipt },
  { label: "Trésorerie", to: "/tresorerie", icon: Receipt },
  { label: "Rapports", to: "/reports", icon: BarChart3 },
  { label: "Factures", to: "/factures", icon: FileSpreadsheet },
  { label: "Paramètres", to: "/settings", icon: Settings },
];

const actions = [
  { label: "Nouveau Contrat", to: "/contracts", icon: FileText, hint: "Enter" },
  { label: "Nouveau Client", to: "/customers", icon: Users, hint: "Enter" },
  { label: "Ajouter Véhicule", to: "/vehicles", icon: Car, hint: "Enter" },
  { label: "Créer Facture", to: "/factures", icon: FileSpreadsheet, hint: "Enter" },
];

interface SavedTreasuryView {
  id: string;
  name: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [treasuryViews, setTreasuryViews] = useState<SavedTreasuryView[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem("treasury:movement-views");
      const parsed = raw ? (JSON.parse(raw) as SavedTreasuryView[]) : [];
      setTreasuryViews(Array.isArray(parsed) ? parsed.slice(0, 8) : []);
    } catch {
      setTreasuryViews([]);
    }
  }, [open]);

  const go = (to: string, label: string) => {
    navigate(to);
    setOpen(false);
    toast.success(label);
  };

  const openTreasuryView = (view: SavedTreasuryView) => {
    localStorage.setItem("treasury:apply-view", JSON.stringify({ viewId: view.id, at: Date.now() }));
    navigate("/tresorerie");
    setOpen(false);
    toast.success(`Vue appliquée: ${view.name}`);
  };

  const openTreasuryPreset = (
    label: string,
    filters: {
      timeFilter?: "day" | "week" | "month" | "year";
      typeFilter?: string;
      paymentMethodFilter?: string;
      searchTerm?: string;
      tableMode?: "flat" | "grouped";
    }
  ) => {
    localStorage.setItem("treasury:apply-view", JSON.stringify({ filters, at: Date.now() }));
    navigate("/tresorerie");
    setOpen(false);
    toast.success(`Commande exécutée: ${label}`);
  };

  const openTreasuryAlertPreset = (
    label: string,
    payload: {
      level?: "high" | "medium" | "low";
      alertId?: string;
      movementFilters?: {
        timeFilter?: "day" | "week" | "month" | "year";
        typeFilter?: string;
        paymentMethodFilter?: string;
        searchTerm?: string;
        tableMode?: "flat" | "grouped";
      };
    }
  ) => {
    const now = Date.now();
    localStorage.setItem("treasury:alert-command", JSON.stringify({ level: payload.level, alertId: payload.alertId, at: now }));
    if (payload.movementFilters) {
      localStorage.setItem("treasury:apply-view", JSON.stringify({ filters: payload.movementFilters, at: now }));
    }
    navigate("/tresorerie");
    setOpen(false);
    toast.success(`Commande exécutée: ${label}`);
  };

  const normalizedQuery = commandQuery
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const showTreasurySmartCommands =
    normalizedQuery.includes("tresor") ||
    normalizedQuery.includes("treasury") ||
    normalizedQuery.includes("tresorerie") ||
    normalizedQuery.includes("trésorerie") ||
    normalizedQuery.includes("خزين") ||
    normalizedQuery.includes("treso") ||
    normalizedQuery.includes("alerte") ||
    normalizedQuery.includes("alert") ||
    normalizedQuery.includes("overdue") ||
    normalizedQuery.includes("entries") ||
    normalizedQuery.includes("liquidity") ||
    normalizedQuery.includes("deadlines");

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={commandQuery}
        onValueChange={setCommandQuery}
        placeholder="Rechercher une page, une action ou une commande trésorerie..."
      />
      <CommandList>
        <CommandEmpty>Aucun résultat</CommandEmpty>
        {showTreasurySmartCommands && (
          <>
            <CommandGroup heading="Commandes intelligentes Trésorerie">
              <CommandItem onSelect={() => openTreasuryPreset("Trésorerie اليوم", { timeFilter: "day" })}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Afficher les opérations du jour</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => openTreasuryPreset("Trésorerie هذه الأسبوع", { timeFilter: "week" })}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Afficher les opérations de la semaine</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => openTreasuryPreset("Trésorerie هذا الشهر", { timeFilter: "month" })}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Afficher les opérations du mois</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => openTreasuryPreset("Transferts seulement", { timeFilter: "month", typeFilter: "transfert", tableMode: "grouped" })}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Voir uniquement les transferts</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => openTreasuryPreset("Chèques seulement", { timeFilter: "month", paymentMethodFilter: "Chèque", tableMode: "grouped" })}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Voir uniquement les chèques</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Centre d'alertes">
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("Alertes critiques", {
                    level: "high",
                    movementFilters: { timeFilter: "month", paymentMethodFilter: "Chèque", tableMode: "grouped" }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>Afficher les alertes niveau élevé</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("Alertes moyennes", {
                    level: "medium",
                    movementFilters: { timeFilter: "month", typeFilter: "recette", tableMode: "grouped" }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>Afficher les alertes niveau moyen</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("Échéances proches", {
                    alertId: "near-deadlines",
                    movementFilters: { timeFilter: "week", paymentMethodFilter: "Chèque", tableMode: "grouped" }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>Focus sur les échéances proches</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Alertes ciblées par ID">
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("ID overdue-checks", {
                    level: "high",
                    alertId: "overdue-checks",
                    movementFilters: {
                      timeFilter: "month",
                      typeFilter: "recette",
                      paymentMethodFilter: "Chèque",
                      searchTerm: "Contrat",
                      tableMode: "grouped"
                    }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>overdue-checks • Chèques non encaissés</span>
                <CommandShortcut>ID</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("ID entries-behind", {
                    level: "medium",
                    alertId: "entries-behind",
                    movementFilters: {
                      timeFilter: "month",
                      typeFilter: "recette",
                      paymentMethodFilter: "all",
                      searchTerm: "Contrat",
                      tableMode: "grouped"
                    }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>entries-behind • Recettes à relancer</span>
                <CommandShortcut>ID</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("ID low-liquidity", {
                    level: "high",
                    alertId: "low-liquidity",
                    movementFilters: {
                      timeFilter: "month",
                      typeFilter: "all",
                      paymentMethodFilter: "all",
                      searchTerm: "",
                      tableMode: "grouped"
                    }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>low-liquidity • Analyse des sorties</span>
                <CommandShortcut>ID</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("ID near-deadlines", {
                    level: "low",
                    alertId: "near-deadlines",
                    movementFilters: {
                      timeFilter: "week",
                      typeFilter: "recette",
                      paymentMethodFilter: "Chèque",
                      searchTerm: "Contrat",
                      tableMode: "grouped"
                    }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>near-deadlines • Échéances imminentes</span>
                <CommandShortcut>ID</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  openTreasuryAlertPreset("Toutes les alertes", {
                    movementFilters: {
                      timeFilter: "month",
                      typeFilter: "all",
                      paymentMethodFilter: "all",
                      searchTerm: "",
                      tableMode: "flat"
                    }
                  })
                }
              >
                <BellRing className="mr-2 h-4 w-4" />
                <span>Réinitialiser le filtre Alert Center</span>
                <CommandShortcut>Cmd</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Navigation">
          {routes.map((r) => (
            <CommandItem key={r.label} onSelect={() => go(r.to, r.label)}>
              <r.icon className="mr-2 h-4 w-4" />
              <span>{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions rapides">
          {actions.map((a) => (
            <CommandItem key={a.label} onSelect={() => go(a.to, a.label)}>
              <a.icon className="mr-2 h-4 w-4" />
              <span>{a.label}</span>
              <CommandShortcut>{a.hint}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        {treasuryViews.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Trésorerie • Saved Views">
              {treasuryViews.map((view) => (
                <CommandItem key={view.id} onSelect={() => openTreasuryView(view)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  <span>{view.name}</span>
                  <CommandShortcut>Enter</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
