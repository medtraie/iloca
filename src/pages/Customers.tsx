import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Sparkles, Users, Globe2, UserCheck, CalendarClock, Download, 
  FileSpreadsheet, Table2, LayoutGrid, Columns3, Eye, Edit, Trash2, 
  Phone, CreditCard, MapPin, RotateCcw, Maximize2, Minimize2, 
  Car, Award, TrendingUp, Search, Filter, X, ArrowUpDown, ChevronRight, UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { useTenants, type Tenant } from "@/hooks/useTenants";
import TenantFormDialog from "@/components/TenantFormDialog";
import TenantDetailsDialog from "@/components/TenantDetailsDialog";
import TenantCard from "@/components/tenants/TenantCard";
import TenantsTable from "@/components/tenants/TenantsTable";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import JSZip from "jszip";
import { motion, AnimatePresence } from "framer-motion";

export type CustomersViewMode = "cards" | "table" | "kanban";
export type KanbanColumnKey = "new" | "active" | "vip" | "secondary";

interface Contract {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerNationalId?: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  dailyRate?: number;
  totalAmount: string;
  status: string;
  statusColor?: string;
}

const resolveTenantAddress = (tenant: Tenant) => {
  const legacyAddress = (tenant as Tenant & { address?: string }).address;
  return (tenant.adresse || legacyAddress || "").trim();
};

export const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [viewMode, setViewMode] = useLocalStorage<CustomersViewMode>("customers:view-mode-2026", "cards");
  const [kanbanAssignments, setKanbanAssignments] = useLocalStorage<Record<string, KanbanColumnKey>>("customers:kanban-columns-2026", {});
  const [draggedTenantId, setDraggedTenantId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  
  const [contracts] = useLocalStorage<Contract[]>("contracts", []);
  const { toast } = useToast();
  const { tenants, loading, addTenant, updateTenant, deleteTenant } = useTenants();

  // Keyboard shortcut for table fullscreen mode
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "f" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (viewMode !== "table") return;

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(target?.isContentEditable);

      if (isTypingTarget) return;
      event.preventDefault();
      setIsTableFullscreen((current) => !current);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [viewMode]);

  // List of all unique nationalities
  const nationalities = useMemo(() => Array.from(new Set(tenants.map((t) => t.nationalite).filter(Boolean))).sort(), [tenants]);

  // Map of tenant ID to their active contract vehicle and total rental count
  const tenantContractStats = useMemo(() => {
    const map = new Map<string, { activeVehicle: string | null; count: number; totalRevenue: number }>();
    
    tenants.forEach((tenant) => {
      const matched = contracts.filter((c) =>
        c.customerNationalId === tenant.cin ||
        c.customerName === `${tenant.prenom} ${tenant.nom}` ||
        c.customerPhone === tenant.telephone
      );

      const active = matched.find((c) => c.status === "Actif");
      const rev = matched.reduce((sum, c) => {
        const val = parseFloat((c.totalAmount || "0").replace(/[^0-9.-]/g, ""));
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      map.set(tenant.id, {
        activeVehicle: active ? active.vehicle : null,
        count: matched.length,
        totalRevenue: rev
      });
    });

    return map;
  }, [tenants, contracts]);

  // Filtered tenants with universal search, type, nationality, and loyalty tier
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const search = searchTerm.trim().toLowerCase();
      const resolvedAddress = resolveTenantAddress(tenant).toLowerCase();
      const matchesSearch =
        !search ||
        (tenant.nom || "").toLowerCase().includes(search) ||
        (tenant.prenom || "").toLowerCase().includes(search) ||
        (tenant.telephone || "").includes(search) ||
        (tenant.cin || "").toLowerCase().includes(search) ||
        (tenant.permis || "").toLowerCase().includes(search) ||
        (tenant.nationalite || "").toLowerCase().includes(search) ||
        resolvedAddress.includes(search);

      const matchesNationality = nationalityFilter === "all" || tenant.nationalite === nationalityFilter;
      const matchesType = typeFilter === "all" || tenant.type === typeFilter;
      
      const stats = tenantContractStats.get(tenant.id) || { count: 0, activeVehicle: null, totalRevenue: 0 };
      let matchesTier = true;
      if (tierFilter === "vip") matchesTier = stats.count >= 10;
      else if (tierFilter === "gold") matchesTier = stats.count >= 5 && stats.count < 10;
      else if (tierFilter === "regular") matchesTier = stats.count >= 2 && stats.count < 5;
      else if (tierFilter === "new") matchesTier = stats.count < 2;
      else if (tierFilter === "active") matchesTier = Boolean(stats.activeVehicle);

      return matchesSearch && matchesNationality && matchesType && matchesTier;
    });
  }, [tenants, searchTerm, nationalityFilter, typeFilter, tierFilter, tenantContractStats]);

  // Telemetry KPIs
  const totalRevenueAll = useMemo(() => {
    return Array.from(tenantContractStats.values()).reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [tenantContractStats]);

  const activeRentalsCount = useMemo(() => {
    return Array.from(tenantContractStats.values()).filter((s) => Boolean(s.activeVehicle)).length;
  }, [tenantContractStats]);

  const foreignTenantsCount = useMemo(() => {
    return tenants.filter((t) => t.nationalite && t.nationalite !== "Marocaine").length;
  }, [tenants]);

  const topNationalities = useMemo(() => {
    return Object.entries(
      filteredTenants.reduce<Record<string, number>>((acc, tenant) => {
        const nat = tenant.nationalite || "Marocaine";
        acc[nat] = (acc[nat] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [filteredTenants]);

  const recentTenants = useMemo(() => {
    return [...filteredTenants]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .slice(0, 5);
  }, [filteredTenants]);

  // Kanban Board Columns
  const getDefaultKanbanColumn = (tenant: Tenant): KanbanColumnKey => {
    if (tenant.type === "Chauffeur secondaire") return "secondary";
    const stats = tenantContractStats.get(tenant.id);
    if (stats?.activeVehicle) return "active";
    if ((stats?.count || 0) >= 5) return "vip";
    return "new";
  };

  const kanbanColumns = useMemo(() => {
    const cols: Array<{
      key: KanbanColumnKey;
      title: string;
      accent: string;
      badgeBg: string;
      items: Tenant[];
    }> = [
      { key: "active", title: "En Location Active", accent: "bg-emerald-500", badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", items: [] },
      { key: "vip", title: "Clients VIP & Gold", accent: "bg-amber-500", badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", items: [] },
      { key: "new", title: "Nouveaux / Disponibles", accent: "bg-blue-500", badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", items: [] },
      { key: "secondary", title: "Chauffeurs Secondaires", accent: "bg-purple-500", badgeBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30", items: [] },
    ];

    const colMap: Record<KanbanColumnKey, number> = {
      active: 0,
      vip: 1,
      new: 2,
      secondary: 3,
    };

    filteredTenants.forEach((tenant) => {
      const assigned = kanbanAssignments[tenant.id] ?? getDefaultKanbanColumn(tenant);
      cols[colMap[assigned]].items.push(tenant);
    });

    return cols;
  }, [filteredTenants, kanbanAssignments, tenantContractStats]);

  // Handlers
  const handleAddTenant = async (tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => {
    const existingCin = tenants.find((t) => t.cin && t.cin.toLowerCase() === tenantData.cin.toLowerCase());
    const existingPermis = tenants.find((t) => t.permis && t.permis.toLowerCase() === tenantData.permis.toLowerCase());

    if (existingCin) {
      toast({
        title: "Numéro CIN déjà existant",
        description: `Un locataire avec la CIN "${tenantData.cin}" existe déjà (${existingCin.prenom} ${existingCin.nom}).`,
        variant: "destructive"
      });
      return false;
    }

    if (existingPermis) {
      toast({
        title: "Numéro Permis déjà existant",
        description: `Un locataire avec ce permis existe déjà (${existingPermis.prenom} ${existingPermis.nom}).`,
        variant: "destructive"
      });
      return false;
    }

    const created = await addTenant(tenantData);
    if (!created) return false;

    toast({
      title: "Locataire enregistré",
      description: `${tenantData.prenom} ${tenantData.nom} a été ajouté au fichier client.`,
    });
    return true;
  };

  const handleUpdateTenant = async (updatedTenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => {
    if (!editingTenant) return false;

    const existingCin = tenants.find((t) => t.cin && t.cin.toLowerCase() === updatedTenantData.cin.toLowerCase() && t.id !== editingTenant.id);
    const existingPermis = tenants.find((t) => t.permis && t.permis.toLowerCase() === updatedTenantData.permis.toLowerCase() && t.id !== editingTenant.id);

    if (existingCin) {
      toast({
        title: "Numéro CIN déjà existant",
        description: `Un autre locataire utilise déjà la CIN "${updatedTenantData.cin}".`,
        variant: "destructive"
      });
      return false;
    }

    if (existingPermis) {
      toast({
        title: "Numéro Permis déjà existant",
        description: `Un autre locataire utilise déjà ce numéro de permis.`,
        variant: "destructive"
      });
      return false;
    }

    const updated = await updateTenant(editingTenant.id, updatedTenantData);
    if (!updated) return false;

    toast({
      title: "Dossier mis à jour",
      description: `Les informations de ${updatedTenantData.prenom} ${updatedTenantData.nom} ont été actualisées.`,
    });
    return true;
  };

  const handleDeleteTenant = async (tenantId: string) => {
    const deleted = await deleteTenant(tenantId);
    if (!deleted) return;
    toast({
      title: "Locataire supprimé",
      description: "La fiche client a été retirée de la base de données.",
    });
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsFormDialogOpen(true);
  };

  const handleViewDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailsDialogOpen(true);
  };

  const handleFormClose = () => {
    setIsFormDialogOpen(false);
    setEditingTenant(null);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setNationalityFilter("all");
    setTypeFilter("all");
    setTierFilter("all");
  };

  const handleKanbanDragStart = (tenantId: string) => {
    setDraggedTenantId(tenantId);
  };

  const handleKanbanDragEnd = () => {
    setDraggedTenantId(null);
    setDragOverColumn(null);
  };

  const handleKanbanDrop = (targetColumn: KanbanColumnKey) => {
    if (!draggedTenantId) return;
    setKanbanAssignments((prev) => ({
      ...prev,
      [draggedTenantId]: targetColumn,
    }));
    setDraggedTenantId(null);
    setDragOverColumn(null);
  };

  const handleKanbanDragOver = (event: DragEvent<HTMLDivElement>, targetColumn: KanbanColumnKey) => {
    event.preventDefault();
    setDragOverColumn(targetColumn);
  };

  const handleResetKanbanLayout = () => {
    setKanbanAssignments({});
    setDraggedTenantId(null);
    setDragOverColumn(null);
    toast({
      title: "Kanban réinitialisé",
      description: "Toutes les cartes sont revenues à leur colonne automatique.",
    });
  };

  // Export CSV
  const handleExportCustomersCSV = () => {
    const headers = ["ID", "Nom complet", "Téléphone", "CIN", "Permis", "Nationalité", "Type", "Adresse", "Locations Total", "Statut Actif", "Créé le", "Mis à jour le"];
    const rows = filteredTenants.map((t) => {
      const stats = tenantContractStats.get(t.id);
      return [
        t.id,
        `${t.prenom} ${t.nom}`,
        t.telephone,
        t.cin,
        t.permis,
        t.nationalite,
        t.type,
        resolveTenantAddress(t),
        stats?.count || 0,
        stats?.activeVehicle ? `En location (${stats.activeVehicle})` : "Disponible",
        t.createdAt,
        t.updatedAt,
      ];
    });

    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clients_crm_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV Réussi", description: `${filteredTenants.length} clients exportés avec succès.` });
  };

  // Export XLSX Multi-feuille
  const handleExportCustomersXLSX = async () => {
    const escapeXml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const getColumnName = (index: number) => {
      let n = index;
      let name = "";
      while (n > 0) {
        const remainder = (n - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        n = Math.floor((n - 1) / 26);
      }
      return name;
    };

    const buildSheetXml = (rows: Array<Array<string | number>>, columnWidths: number[]) => {
      const colsXml = columnWidths
        .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
        .join("");

      const rowXml = rows
        .map((row, rowIndex) => {
          const rowNumber = rowIndex + 1;
          const cellsXml = row
            .map((cell, cellIndex) => {
              const ref = `${getColumnName(cellIndex + 1)}${rowNumber}`;
              if (typeof cell === "number") {
                return `<c r="${ref}"><v>${cell}</v></c>`;
              }
              return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`;
            })
            .join("");
          return `<row r="${rowNumber}">${cellsXml}</row>`;
        })
        .join("");

      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${colsXml}</cols>
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
    };

    const customersRows: Array<Array<string | number>> = [
      ["ID", "Nom complet", "Téléphone", "CIN", "Permis", "Nationalité", "Type", "Adresse", "Locations Effectuées", "Véhicule Actuel", "CA LTV (MAD)", "Créé le"],
      ...filteredTenants.map((t) => {
        const stats = tenantContractStats.get(t.id);
        return [
          t.id,
          `${t.prenom} ${t.nom}`,
          t.telephone,
          t.cin,
          t.permis,
          t.nationalite,
          t.type,
          resolveTenantAddress(t),
          stats?.count || 0,
          stats?.activeVehicle || "Aucun",
          stats?.totalRevenue || 0,
          t.createdAt,
        ];
      }),
    ];

    const metricsRows: Array<Array<string | number>> = [
      ["Indicateur CRM 2026", "Valeur"],
      ["Total Clients Filtrés", filteredTenants.length],
      ["Total Base Clients", tenants.length],
      ["Clients Actuellement en Location", activeRentalsCount],
      ["Clients Internationaux", foreignTenantsCount],
      ["Volume d'Affaires Global (MAD)", totalRevenueAll],
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Fichier Clients" sheetId="1" r:id="rId1"/>
    <sheet name="KPIs CRM" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels")?.file(".rels", rootRelsXml);
    zip.folder("xl")?.file("workbook.xml", workbookXml);
    zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", workbookRelsXml);
    zip.folder("xl")?.folder("worksheets")?.file("sheet1.xml", buildSheetXml(customersRows, [12, 24, 18, 14, 14, 16, 22, 36, 16, 18, 16, 14]));
    zip.folder("xl")?.folder("worksheets")?.file("sheet2.xml", buildSheetXml(metricsRows, [34, 18]));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm_clients_complet_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Export Excel Terminé", description: "Le classeur multi-onglets a été généré avec succès." });
  };

  const hasActiveFilters = nationalityFilter !== "all" || typeFilter !== "all" || tierFilter !== "all" || searchTerm.trim().length > 0;

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-accent/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-black tracking-wider uppercase text-xs animate-pulse">
            Chargement de la base CRM 2026...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 safe-pt safe-pb relative">
      
      {/* 2026 HERO COMMAND BAR & ACTIONS */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center font-black shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Gestion <span className="text-accent">Clients CRM</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium pl-1">
            Passeport 360°, suivi des locations, fidélisation & conformité légale
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/">
            <Button variant="outline" className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-accent/10">
              Accueil
            </Button>
          </Link>

          <Button 
            variant="outline" 
            onClick={handleExportCustomersCSV}
            className="rounded-2xl h-11 px-3.5 font-bold border-border/60 hover:bg-accent/10 text-xs hidden sm:flex gap-1.5"
          >
            <Download className="w-4 h-4 text-accent" />
            <span>CSV</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExportCustomersXLSX}
            className="rounded-2xl h-11 px-3.5 font-bold border-border/60 hover:bg-accent/10 text-xs hidden sm:flex gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Excel</span>
          </Button>

          <Button 
            onClick={() => {
              setEditingTenant(null);
              setIsFormDialogOpen(true);
            }}
            className="rounded-2xl h-11 px-5 font-black bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 hover:scale-105 transition-all active:scale-95 text-xs sm:text-sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Nouveau Client
          </Button>
        </div>
      </motion.div>

      {/* 2026 HERO TELEMETRY KPI METRICS */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        {/* KPI 1: Total Clients */}
        <Card className="rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-card/90 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Total Clients</p>
              <p className="text-2xl sm:text-3xl font-black text-foreground font-mono">{tenants.length}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{filteredTenants.length} affiché(s)</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: En Location Active */}
        <Card className="rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-card/90 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">En Location</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{activeRentalsCount}</p>
              <p className="text-[11px] text-emerald-600/80 font-bold flex items-center gap-1">
                <Car className="w-3 h-3" /> Véhicule en cours
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <Car className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Clients Internationaux */}
        <Card className="rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-card/90 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Internationaux</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">{foreignTenantsCount}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{nationalities.length} pays représentés</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Globe2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: CA Total LTV */}
        <Card className="rounded-3xl border border-border/50 bg-gradient-to-br from-card via-card to-card/90 shadow-xs hover:shadow-md transition-all">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Volume LTV Flotte</p>
              <p className="text-xl sm:text-2xl font-black text-foreground font-mono">
                {totalRevenueAll.toLocaleString("fr-FR")} <span className="text-xs font-bold text-accent">MAD</span>
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">Cumul contrats</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2026 CRM COMMAND BAR & FILTERS */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="bg-card/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-border/60 shadow-sm space-y-4"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Universal Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Recherche intelligente (Nom, Téléphone, CIN, Permis, Ville)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-10 rounded-2xl bg-muted/40 border border-border/50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40 focus:bg-background transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted/50 border border-border/50 rounded-2xl self-start md:self-auto">
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className={`rounded-xl h-9 px-3 font-bold text-xs gap-1.5 ${viewMode === "cards" ? "bg-foreground text-background shadow-xs" : ""}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cartes VIP</span>
            </Button>

            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className={`rounded-xl h-9 px-3 font-bold text-xs gap-1.5 ${viewMode === "table" ? "bg-foreground text-background shadow-xs" : ""}`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Table Pro</span>
            </Button>

            <Button
              size="sm"
              variant={viewMode === "kanban" ? "default" : "ghost"}
              onClick={() => setViewMode("kanban")}
              className={`rounded-xl h-9 px-3 font-bold text-xs gap-1.5 ${viewMode === "kanban" ? "bg-foreground text-background shadow-xs" : ""}`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Pipeline Kanban</span>
            </Button>
          </div>
        </div>

        {/* Quick Filter Chips (Type, Loyalty, Nationality) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] font-black uppercase text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-accent" /> Filtres:
          </span>

          {/* Type Filter Chips */}
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              typeFilter === "all" ? "bg-accent text-accent-foreground shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            Tous les types
          </button>
          <button
            onClick={() => setTypeFilter("Locataire Principal")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              typeFilter === "Locataire Principal" ? "bg-accent text-accent-foreground shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            Locataires Principaux
          </button>
          <button
            onClick={() => setTypeFilter("Chauffeur secondaire")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              typeFilter === "Chauffeur secondaire" ? "bg-accent text-accent-foreground shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            Chauffeurs Secondaires
          </button>

          <span className="text-border mx-1">|</span>

          {/* Tier Filter Chips */}
          <button
            onClick={() => setTierFilter("active")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              tierFilter === "active" ? "bg-emerald-500 text-white shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            🚗 En Location Active
          </button>
          <button
            onClick={() => setTierFilter("vip")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              tierFilter === "vip" ? "bg-amber-500 text-white shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            👑 VIP (10+)
          </button>
          <button
            onClick={() => setTierFilter("gold")}
            className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all ${
              tierFilter === "gold" ? "bg-yellow-500 text-black shadow-xs" : "bg-muted/40 hover:bg-muted text-muted-foreground"
            }`}
          >
            ⭐ Gold (5+)
          </button>

          {/* Nationality Dropdown */}
          <select
            value={nationalityFilter}
            onChange={(e) => setNationalityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-accent ml-auto"
          >
            <option value="all">🌍 Toutes nationalités ({nationalities.length})</option>
            {nationalities.map((nat) => (
              <option key={nat} value={nat}>{nat}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-destructive shrink-0 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Réinitialiser
            </Button>
          )}
        </div>
      </motion.div>

      {/* VIEW MODES RENDERING */}
      <div className="space-y-6">
        
        {/* VIEW MODE 1: VIP CARDS GRID */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredTenants.length === 0 ? (
              <div className="col-span-full text-center py-20 rounded-3xl border border-dashed border-border/60 bg-muted/10 space-y-4">
                <Users className="w-14 h-14 mx-auto text-muted-foreground/30" />
                <div>
                  <h3 className="text-lg font-black text-foreground">Aucun locataire trouvé</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Essayez de modifier votre recherche ou vos filtres pour afficher des résultats.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={resetFilters} className="rounded-2xl font-bold text-xs">
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              filteredTenants.map((tenant, index) => {
                const stats = tenantContractStats.get(tenant.id);
                return (
                  <motion.div
                    key={tenant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
                  >
                    <TenantCard
                      tenant={tenant}
                      onView={handleViewDetails}
                      onEdit={handleEditTenant}
                      onDelete={handleDeleteTenant}
                      activeContractVehicle={stats?.activeVehicle}
                      rentalCount={stats?.count || 0}
                    />
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* VIEW MODE 2: PRO TABLE */}
        {viewMode === "table" && (
          <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
            <CardHeader className="p-4 sm:p-5 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black">Répertoire Clients & Dossiers</CardTitle>
                <CardDescription className="text-xs font-medium">
                  {filteredTenants.length} client(s) affiché(s) sur {tenants.length} enregistrés
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTableFullscreen(true)}
                  className="rounded-xl font-bold text-xs h-9"
                >
                  <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
                  Plein écran (F)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TenantsTable
                tenants={filteredTenants}
                onView={handleViewDetails}
                onEdit={handleEditTenant}
                onDelete={handleDeleteTenant}
                searchTerm={searchTerm}
                expanded={isTableExpanded}
              />
            </CardContent>
          </Card>
        )}

        {/* VIEW MODE 3: KANBAN PIPELINE */}
        {viewMode === "kanban" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground font-medium">
                Glissez-déposez les cartes d'une colonne à une autre pour organiser le flux CRM.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetKanbanLayout}
                className="rounded-xl text-xs font-bold h-8 gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser les colonnes
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {kanbanColumns.map((col, cIdx) => (
                <div
                  key={col.key}
                  onDragOver={(e) => handleKanbanDragOver(e, col.key)}
                  onDragLeave={() => setDragOverColumn((cur) => (cur === col.key ? null : cur))}
                  onDrop={() => handleKanbanDrop(col.key)}
                  className={`rounded-3xl border p-4 flex flex-col min-h-[450px] transition-colors ${
                    dragOverColumn === col.key
                      ? "border-accent bg-accent/5"
                      : "border-border/50 bg-card/60 backdrop-blur-sm"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.accent}`} />
                      <h3 className="text-sm font-black text-foreground">{col.title}</h3>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${col.badgeBg}`}>
                      {col.items.length}
                    </span>
                  </div>

                  {/* Column Items */}
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                    {col.items.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground/60 text-xs font-medium">
                        Aucun client dans cette colonne
                      </div>
                    ) : (
                      col.items.map((tenant) => {
                        const stats = tenantContractStats.get(tenant.id);
                        return (
                          <div
                            key={tenant.id}
                            draggable
                            onDragStart={() => handleKanbanDragStart(tenant.id)}
                            onDragEnd={handleKanbanDragEnd}
                            className={`p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 ${
                              draggedTenantId === tenant.id ? "opacity-40" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-black text-sm text-foreground truncate">
                                  {tenant.prenom} {tenant.nom}
                                </p>
                                <p className="text-[11px] font-mono text-muted-foreground">
                                  CIN: {tenant.cin || "N/A"}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px] shrink-0 font-bold">
                                {tenant.nationalite || "Marocaine"}
                              </Badge>
                            </div>

                            {stats?.activeVehicle && (
                              <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Car className="w-3 h-3 shrink-0" />
                                <span className="truncate">{stats.activeVehicle}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                              <span className="font-mono text-muted-foreground text-[11px]">
                                {tenant.telephone || "Sans tél"}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(tenant)}
                                  className="h-7 w-7 p-0 rounded-lg"
                                >
                                  <Eye className="w-3.5 h-3.5 text-accent" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTenant(tenant)}
                                  className="h-7 w-7 p-0 rounded-lg"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MOBILE / ANDROID FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => {
          setEditingTenant(null);
          setIsFormDialogOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center font-black active:scale-95 transition-transform"
        aria-label="Nouveau Locataire"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* 2026 3-STEP SMART ONBOARDING WIZARD MODAL */}
      <TenantFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleFormClose}
        onSubmit={editingTenant ? handleUpdateTenant : handleAddTenant}
        tenant={editingTenant}
        nationalities={nationalities}
      />

      {/* 2026 360° CUSTOMER PASSPORT & CRM DOSSIER MODAL */}
      <TenantDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        tenant={selectedTenant}
        onEdit={handleEditTenant}
      />

      {/* FULLSCREEN TABLE MODAL */}
      <Dialog open={isTableFullscreen} onOpenChange={setIsTableFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 border-none">
          <DialogTitle className="sr-only">Table des clients en plein écran</DialogTitle>
          <DialogDescription className="sr-only">Affichage haute densité pour grand écran</DialogDescription>
          <div className="h-full bg-background p-4 md:p-6 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <h2 className="text-xl font-black text-foreground">Table Plein Écran — Fichier Clients</h2>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsTableFullscreen(false)} 
                className="rounded-xl font-bold text-xs"
              >
                <Minimize2 className="w-4 h-4 mr-1.5" /> Quitter le plein écran
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TenantsTable
                tenants={filteredTenants}
                onView={handleViewDetails}
                onEdit={handleEditTenant}
                onDelete={handleDeleteTenant}
                searchTerm={searchTerm}
                expanded
                tableHeightClass="h-[calc(100vh-8rem)]"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Customers;
