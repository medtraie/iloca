import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Users, Globe2, UserCheck, CalendarClock, Download, FileSpreadsheet, Table2, LayoutGrid, Columns3, Eye, Edit, Trash2, Phone, CreditCard, MapPin, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import TenantFormDialog from "@/components/TenantFormDialog";
import TenantDetailsDialog from "@/components/TenantDetailsDialog";
import TenantsStatsBar from "@/components/tenants/TenantsStatsBar";
import TenantsActionsBar from "@/components/tenants/TenantsActionsBar";
import TenantsTable from "@/components/tenants/TenantsTable";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import JSZip from "jszip";

import { motion } from "framer-motion";

export interface Tenant {
  id: string;
  nom: string;
  prenom: string;
  adresse: string;
  telephone: string;
  cin: string;
  dateCin: string;
  permis: string;
  datePermis: string;
  dateNaissance: string;
  passeport?: string;
  nationalite: string;
  type: "Locataire Principal" | "Chauffeur secondaire";
  createdAt: string;
  updatedAt: string;
  // New fields:
  cinImageUrl?: string;
  permisImageUrl?: string;
  passeportImageUrl?: string;
  tenantImageUrl?: string; // Correcting field name if needed
}

type CustomersViewMode = "table" | "cards" | "kanban";
type KanbanColumnKey = "principal" | "international" | "secondary";
const resolveTenantAddress = (tenant: Tenant) => {
  const legacyAddress = (tenant as Tenant & { address?: string }).address;
  return (tenant.adresse || legacyAddress || "").trim();
};

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useLocalStorage<CustomersViewMode>("customers:view-mode", "table");
  const [kanbanAssignments, setKanbanAssignments] = useLocalStorage<Record<string, KanbanColumnKey>>("customers:kanban-columns", {});
  const [draggedTenantId, setDraggedTenantId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();

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

  const defaultTenants: Tenant[] = [
    {
      id: "T001",
      nom: "Bennani",
      prenom: "Ahmed",
      adresse: "Rue Hassan II, Casablanca",
      telephone: "+212 612-345678",
      cin: "AB123456",
      dateCin: "2021-08-12",
      permis: "P1234567",
      datePermis: "2020-03-10",
      dateNaissance: "1992-06-15",
      nationalite: "Marocaine",
      type: "Locataire Principal",
      createdAt: "2024-01-10",
      updatedAt: "2024-01-10"
    },
    {
      id: "T002",
      nom: "El Alami",
      prenom: "Fatima",
      adresse: "Avenue Mohammed V, Rabat",
      telephone: "+212 661-789012",
      cin: "CD789012",
      dateCin: "2020-05-15",
      permis: "P2345678",
      datePermis: "2019-12-20",
      dateNaissance: "1988-03-22",
      nationalite: "Marocaine",
      type: "Locataire Principal",
      createdAt: "2024-01-15",
      updatedAt: "2024-01-15"
    },
    {
      id: "T003",
      nom: "Dubois",
      prenom: "Pierre",
      adresse: "Résidence Marina, Agadir",
      telephone: "+212 524-567890",
      cin: "FR345678",
      dateCin: "2022-01-10",
      permis: "P3456789",
      datePermis: "2021-06-15",
      dateNaissance: "1985-11-08",
      passeport: "P00123456",
      nationalite: "Française",
      type: "Locataire Principal",
      createdAt: "2024-01-20",
      updatedAt: "2024-01-20"
    }
  ];

  const [tenants, setTenants] = useLocalStorage<Tenant[]>("tenants", defaultTenants);

  const nationalities = useMemo(() => Array.from(new Set(tenants.map((t) => t.nationalite))).sort(), [tenants]);

  const filteredTenants = useMemo(() => tenants.filter((tenant) => {
    const search = searchTerm.trim().toLowerCase();
    const resolvedAddress = resolveTenantAddress(tenant).toLowerCase();
    const matchesSearch =
      tenant.nom.toLowerCase().includes(search) ||
      tenant.prenom.toLowerCase().includes(search) ||
      tenant.telephone.includes(searchTerm) ||
      tenant.cin.toLowerCase().includes(search) ||
      tenant.permis.toLowerCase().includes(search) ||
      tenant.nationalite.toLowerCase().includes(search) ||
      resolvedAddress.includes(search);

    const matchesNationality = nationalityFilter === "all" || tenant.nationalite === nationalityFilter;
    const matchesType = typeFilter === "all" || tenant.type === typeFilter;

    return matchesSearch && matchesNationality && matchesType;
  }), [tenants, searchTerm, nationalityFilter, typeFilter]);

  const topNationalities = useMemo(
    () =>
      Object.entries(
        filteredTenants.reduce<Record<string, number>>((acc, tenant) => {
          acc[tenant.nationalite] = (acc[tenant.nationalite] || 0) + 1;
          return acc;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
    [filteredTenants]
  );

  const recentTenants = useMemo(
    () =>
      [...filteredTenants]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [filteredTenants]
  );

  const filteredMainTenants = useMemo(
    () => filteredTenants.filter((t) => t.type === "Locataire Principal").length,
    [filteredTenants]
  );

  const filteredForeignTenants = useMemo(
    () => filteredTenants.filter((t) => t.nationalite !== "Marocaine").length,
    [filteredTenants]
  );

  const quickStats = useMemo(
    () => [
      {
        label: "Résultats filtrés",
        value: filteredTenants.length,
        icon: Users,
        className: "bg-card-blue-bg text-card-blue",
      },
      {
        label: "Principaux",
        value: filteredMainTenants,
        icon: UserCheck,
        className: "bg-card-green-bg text-card-green",
      },
      {
        label: "Nationalités affichées",
        value: topNationalities.length,
        icon: Globe2,
        className: "bg-card-orange-bg text-card-orange",
      },
      {
        label: "Mises à jour récentes",
        value: recentTenants.length,
        icon: CalendarClock,
        className: "bg-card-red-bg text-card-red",
      },
    ],
    [filteredTenants.length, filteredMainTenants, topNationalities.length, recentTenants.length]
  );

  const hasActiveFilters = nationalityFilter !== "all" || typeFilter !== "all" || searchTerm.trim().length > 0;
  const exportRows = useMemo(
    () =>
      filteredTenants.map((tenant) => ({
        id: tenant.id,
        fullName: `${tenant.prenom} ${tenant.nom}`,
        telephone: tenant.telephone,
        cin: tenant.cin,
        permis: tenant.permis,
        nationalite: tenant.nationalite,
        type: tenant.type,
        adresse: resolveTenantAddress(tenant),
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
      })),
    [filteredTenants]
  );

  const getDefaultKanbanColumn = (tenant: Tenant): KanbanColumnKey => {
    if (tenant.type === "Chauffeur secondaire") return "secondary";
    if (tenant.nationalite !== "Marocaine") return "international";
    return "principal";
  };

  const kanbanColumns = useMemo(() => {
    const columns: Array<{
      key: KanbanColumnKey;
      title: string;
      accent: string;
      items: Tenant[];
    }> = [
      { key: "principal", title: "Locataires Principaux", accent: "bg-card-blue", items: [] },
      { key: "international", title: "Internationaux", accent: "bg-card-orange", items: [] },
      { key: "secondary", title: "Chauffeurs secondaires", accent: "bg-card-green", items: [] },
    ];

    const columnIndexByKey: Record<KanbanColumnKey, number> = {
      principal: 0,
      international: 1,
      secondary: 2,
    };

    filteredTenants.forEach((tenant) => {
      const assignedColumn = kanbanAssignments[tenant.id] ?? getDefaultKanbanColumn(tenant);
      columns[columnIndexByKey[assignedColumn]].items.push(tenant);
    });

    return columns;
  }, [filteredTenants, kanbanAssignments]);

  const handleAddTenant = (tenant: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => {
    // Check for duplicate CIN or Permis
    const existingCin = tenants.find(t => t.cin === tenant.cin);
    const existingPermis = tenants.find(t => t.permis === tenant.permis);
    
    if (existingCin) {
      toast({
        title: "Erreur",
        description: "Un locataire avec ce numéro CIN existe déjà",
        variant: "destructive"
      });
      return false;
    }
    
    if (existingPermis) {
      toast({
        title: "Erreur", 
        description: "Un locataire avec ce numéro de permis existe déjà",
        variant: "destructive"
      });
      return false;
    }

    const newTenant: Tenant = {
      ...tenant,
      id: `T${String(tenants.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setTenants(prev => [newTenant, ...prev]);
    toast({
      title: "Succès",
      description: "Locataire ajouté avec succès"
    });
    return true;
  };

  const handleUpdateTenant = (updatedTenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => {
    if (!editingTenant) return false;

    // Check for duplicate CIN or Permis (excluding current tenant)
    const existingCin = tenants.find(t => t.cin === updatedTenantData.cin && t.id !== editingTenant.id);
    const existingPermis = tenants.find(t => t.permis === updatedTenantData.permis && t.id !== editingTenant.id);
    
    if (existingCin) {
      toast({
        title: "Erreur",
        description: "Un locataire avec ce numéro CIN existe déjà",
        variant: "destructive"
      });
      return false;
    }
    
    if (existingPermis) {
      toast({
        title: "Erreur",
        description: "Un locataire avec ce numéro de permis existe déjà", 
        variant: "destructive"
      });
      return false;
    }

    const updatedTenant: Tenant = {
      ...updatedTenantData,
      id: editingTenant.id,
      createdAt: editingTenant.createdAt,
      updatedAt: new Date().toISOString().split('T')[0]
    };

    setTenants(prev => prev.map(tenant => 
      tenant.id === updatedTenant.id ? updatedTenant : tenant
    ));
    
    toast({
      title: "Succès",
      description: "Locataire mis à jour avec succès"
    });
    return true;
  };

  const handleDeleteTenant = (tenantId: string) => {
    setTenants(prev => prev.filter(tenant => tenant.id !== tenantId));
    toast({
      title: "Succès",
      description: "Locataire supprimé avec succès"
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
      title: "Succès",
      description: "Disposition Kanban réinitialisée",
    });
  };

  const handleExportCustomersCSV = () => {
    const headers = ["ID", "Nom complet", "Téléphone", "CIN", "Permis", "Nationalité", "Type", "Adresse", "Créé le", "Mis à jour le"];
    const rows = exportRows.map((row) => [
      row.id,
      row.fullName,
      row.telephone,
      row.cin,
      row.permis,
      row.nationalite,
      row.type,
      row.adresse,
      row.createdAt,
      row.updatedAt,
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers_filtres_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      ["ID", "Nom complet", "Téléphone", "CIN", "Permis", "Nationalité", "Type", "Adresse", "Créé le", "Mis à jour le"],
      ...exportRows.map((row) => [
        row.id,
        row.fullName,
        row.telephone,
        row.cin,
        row.permis,
        row.nationalite,
        row.type,
        row.adresse,
        row.createdAt,
        row.updatedAt,
      ]),
    ];

    const metricsRows: Array<Array<string | number>> = [
      ["Indicateur", "Valeur"],
      ["Résultats filtrés", filteredTenants.length],
      ["Locataires principaux", filteredMainTenants],
      ["Chauffeurs secondaires", filteredTenants.length - filteredMainTenants],
      ["Locataires étrangers", filteredForeignTenants],
      ["Nationalités affichées", topNationalities.length],
      ["Recherche active", searchTerm.trim().length > 0 ? "Oui" : "Non"],
      ["Filtre nationalité", nationalityFilter === "all" ? "Toutes" : nationalityFilter],
      ["Filtre type", typeFilter === "all" ? "Tous" : typeFilter],
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Customers" sheetId="1" r:id="rId1"/>
    <sheet name="Indicateurs" sheetId="2" r:id="rId2"/>
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
    zip.folder("xl")?.folder("worksheets")?.file("sheet1.xml", buildSheetXml(customersRows, [12, 24, 18, 14, 14, 16, 22, 36, 14, 14]));
    zip.folder("xl")?.folder("worksheets")?.file("sheet2.xml", buildSheetXml(metricsRows, [30, 16]));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customers_filtres_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderTenantActions = (tenant: Tenant) => (
    <div className="flex items-center gap-1.5">
      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(tenant)} className="h-8 w-8 p-0 rounded-lg hover:bg-card-blue-bg hover:text-card-blue">
        <Eye className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => handleEditTenant(tenant)} className="h-8 w-8 p-0 rounded-lg hover:bg-card-green-bg hover:text-card-green">
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-card-red hover:text-card-red hover:bg-card-red-bg">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le locataire {tenant.prenom} {tenant.nom} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteTenant(tenant.id)} className="bg-red-600 hover:bg-red-700 focus:ring-red-500">
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      <motion.div 
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-1">
            Gestion des <span className="text-accent">Locataires</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Base de données clients et informations de contact
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="outline" className="rounded-xl h-12 px-6 font-bold shadow-sm hover:scale-105 transition-transform">
              Retour à l'Accueil
            </Button>
          </Link>
          <Button 
            onClick={() => setIsFormDialogOpen(true)}
            className="rounded-xl h-12 px-6 font-bold bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 hover:scale-105 transition-transform"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau Locataire
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <TenantsStatsBar
          tenantsLength={filteredTenants.length}
          mainTenants={filteredMainTenants}
          nationalityCount={nationalities.length}
          foreignTenantCount={filteredForeignTenants}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {quickStats.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 + index * 0.06 }}
          >
            <Card className="border border-border/40 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{item.label}</p>
                  <p className="text-2xl font-black text-foreground">{item.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${item.className}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-6"
      >
        <div className="bg-card p-4 rounded-[2rem] border border-border/50 shadow-sm">
          <TenantsActionsBar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            nationalityFilter={nationalityFilter}
            nationalities={nationalities}
            onNationalityChange={setNationalityFilter}
            typeFilter={typeFilter}
            onTypeChange={setTypeFilter}
            onAddTenant={() => setIsFormDialogOpen(true)}
            onResetFilters={resetFilters}
            filteredCount={filteredTenants.length}
            totalCount={tenants.length}
          />
        </div>

        <div className={`grid grid-cols-1 gap-4 ${isTableExpanded ? "xl:grid-cols-1" : "xl:grid-cols-3"}`}>
          <Card
            className={`border-none shadow-card rounded-[2rem] overflow-hidden bg-card ${isTableExpanded ? "xl:col-span-1" : "xl:col-span-2"}`}
            onDoubleClick={() => {
              if (viewMode === "table") setIsTableFullscreen(true);
            }}
          >
            <CardHeader className="pb-2 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xl font-bold">Liste des locataires</CardTitle>
                  <CardDescription className="font-medium">
                    Tous les locataires enregistrés dans le système ({filteredTenants.length} locataire{filteredTenants.length !== 1 ? "s" : ""})
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant={viewMode === "table" ? "default" : "outline"} onClick={() => setViewMode("table")}>
                    <Table2 className="h-4 w-4 mr-1.5" />
                    Table
                  </Button>
                  <Button size="sm" variant={viewMode === "cards" ? "default" : "outline"} onClick={() => setViewMode("cards")}>
                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                    Cards
                  </Button>
                  <Button size="sm" variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")}>
                    <Columns3 className="h-4 w-4 mr-1.5" />
                    Kanban
                  </Button>
                  {viewMode === "kanban" && (
                    <Button size="sm" variant="outline" onClick={handleResetKanbanLayout}>
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      Reset Kanban Layout
                    </Button>
                  )}
                  {viewMode === "table" && (
                    <Button size="sm" variant="outline" onClick={() => setIsTableExpanded((current) => !current)}>
                      {isTableExpanded ? (
                        <Minimize2 className="h-4 w-4 mr-1.5" />
                      ) : (
                        <Maximize2 className="h-4 w-4 mr-1.5" />
                      )}
                      {isTableExpanded ? "Réduire" : "Afficher plein"}
                    </Button>
                  )}
                  {viewMode === "table" && (
                    <Button size="sm" variant="outline" onClick={() => setIsTableFullscreen(true)}>
                      <Maximize2 className="h-4 w-4 mr-1.5" />
                      Plein écran
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleExportCustomersCSV}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Export CSV
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleExportCustomersXLSX}>
                    <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                    Export XLSX
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "table" && (
                <TenantsTable
                  tenants={filteredTenants}
                  onView={handleViewDetails}
                  onEdit={handleEditTenant}
                  onDelete={handleDeleteTenant}
                  searchTerm={searchTerm}
                  expanded={isTableExpanded}
                />
              )}

              {viewMode === "cards" && (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {filteredTenants.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-muted-foreground font-medium">
                      Aucun locataire à afficher avec les filtres actuels.
                    </div>
                  ) : (
                    filteredTenants.map((tenant, index) => (
                      <motion.div
                        key={tenant.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                      >
                        <Card className="rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all">
                          <CardContent className="p-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-bold">{tenant.prenom} {tenant.nom}</p>
                                <p className="text-xs text-muted-foreground">{tenant.id}</p>
                              </div>
                              <Badge className={tenant.type === "Locataire Principal" ? "bg-card-blue-bg text-card-blue border-transparent" : "bg-card-orange-bg text-card-orange border-transparent"}>
                                {tenant.type}
                              </Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{tenant.telephone}</p>
                              <p className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" />{tenant.cin}</p>
                              <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />{resolveTenantAddress(tenant) || "—"}</p>
                            </div>
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary">{tenant.nationalite}</Badge>
                              {renderTenantActions(tenant)}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {viewMode === "kanban" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {kanbanColumns.map((column, columnIndex) => (
                    <motion.div
                      key={column.key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: columnIndex * 0.06 }}
                    >
                      <Card className={`rounded-2xl border shadow-sm h-full transition-colors ${dragOverColumn === column.key ? "border-accent/60 bg-accent/5" : "border-border/50"}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">{column.title}</CardTitle>
                            <Badge variant="secondary">{column.items.length}</Badge>
                          </div>
                          <div className={`h-1 w-20 rounded-full ${column.accent}`} />
                        </CardHeader>
                        <CardContent
                          className="space-y-3 min-h-[180px]"
                          onDragOver={(event) => handleKanbanDragOver(event, column.key)}
                          onDragLeave={() => setDragOverColumn((current) => (current === column.key ? null : current))}
                          onDrop={() => handleKanbanDrop(column.key)}
                        >
                          {column.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Aucun locataire dans cette colonne.</p>
                          ) : (
                            column.items.map((tenant) => (
                              <div
                                key={tenant.id}
                                draggable
                                onDragStart={() => handleKanbanDragStart(tenant.id)}
                                onDragEnd={handleKanbanDragEnd}
                                className={`rounded-xl border border-border/40 p-3 bg-muted/10 space-y-2 cursor-grab active:cursor-grabbing ${draggedTenantId === tenant.id ? "opacity-60" : ""}`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold">{tenant.prenom} {tenant.nom}</p>
                                  <Badge className="bg-muted text-foreground border-transparent">{tenant.nationalite}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{tenant.telephone}</p>
                                <div className="flex justify-end">{renderTenantActions(tenant)}</div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!isTableExpanded && (
          <Card className="border border-border/50 shadow-sm rounded-[2rem] bg-card overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Insights rapides
              </CardTitle>
              <CardDescription>
                Répartition dynamique selon les filtres actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Top nationalités</p>
                {topNationalities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune donnée à afficher.</p>
                ) : (
                  topNationalities.map(([label, count], idx) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.05 }}
                      className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2"
                    >
                      <span className="text-sm font-medium">{label}</span>
                      <Badge variant="secondary" className="font-bold">{count}</Badge>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Dernières mises à jour</p>
                {recentTenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune mise à jour récente.</p>
                ) : (
                  recentTenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      type="button"
                      onClick={() => handleViewDetails(tenant)}
                      className="w-full text-left rounded-xl border border-border/40 px-3 py-2 hover:border-accent/40 hover:bg-accent/5 transition-colors"
                    >
                      <p className="text-sm font-semibold">{tenant.prenom} {tenant.nom}</p>
                      <p className="text-xs text-muted-foreground">{tenant.updatedAt}</p>
                    </button>
                  ))
                )}
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                  Réinitialiser les filtres
                </Button>
              )}
            </CardContent>
          </Card>
          )}
        </div>
      </motion.div>

      <TenantFormDialog
        isOpen={isFormDialogOpen}
        onClose={handleFormClose}
        onSubmit={editingTenant ? handleUpdateTenant : handleAddTenant}
        tenant={editingTenant}
        nationalities={nationalities}
      />

      <TenantDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        tenant={selectedTenant}
      />

      <Dialog open={isTableFullscreen} onOpenChange={setIsTableFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none rounded-none p-0 gap-0 border-none">
          <DialogTitle className="sr-only">Table des locataires en plein écran</DialogTitle>
          <DialogDescription className="sr-only">Affichage détaillé et lisible de la table des locataires.</DialogDescription>
          <div className="h-full bg-background p-4 md:p-6">
            <TenantsTable
              tenants={filteredTenants}
              onView={handleViewDetails}
              onEdit={handleEditTenant}
              onDelete={handleDeleteTenant}
              searchTerm={searchTerm}
              expanded
              tableHeightClass="h-[calc(100vh-6.5rem)] md:h-[calc(100vh-7.5rem)]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Customers;
