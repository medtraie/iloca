import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Calendar, DollarSign, Filter, Trophy, AlertTriangle, RefreshCw, 
  Download, FileSpreadsheet, FileText, TrendingUp, Car, Users, 
  Layers, CheckCircle2, Clock, ArrowRight, ArrowUpRight, Search, X, ShieldCheck 
} from "lucide-react";
import { Link } from "react-router-dom";
import MetricsSection from "@/features/reports/MetricsSection";
import VehiclePlanningSection from "@/features/reports/VehiclePlanningSection";
import AllVehiclesSection from "@/features/reports/AllVehiclesSection";
import RevenueSection from "@/features/reports/RevenueSection";
import TenantSection from "@/features/reports/TenantSection";
import VehicleComparisonSection from "@/features/reports/VehicleComparisonSection";
import MonthlyRevenueSection from "@/features/reports/MonthlyRevenueSection";
import { useVehicles } from "@/hooks/useVehicles";
import { useContracts } from "@/hooks/useContracts";
import { useExpenses } from "@/hooks/useExpenses";
import { computeContractSummary } from "@/utils/contractMath";
import type { Contract as RevenueChartContract } from "@/components/RevenueChart";
import { Contract as ServiceContract } from "@/types/appData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import JSZip from "jszip";
import { motion } from "framer-motion";

interface Contract {
  id: string;
  customer_name?: string;
  vehicle?: string;
  start_date?: string;
  end_date?: string;
  daily_rate?: number;
  total_amount?: number;
  status?: 'ouvert' | 'ferme' | 'draft' | 'sent' | 'signed' | 'completed' | 'cancelled';
  vehicleId?: string;
  nombreDeJour?: number;
  prolongationAu?: string;
  nombreDeJourProlonge?: number;
  customerName?: string;
  contract_number?: string;
  contract_data?: any;
}

interface Vehicle {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  annee?: number;
  etat_vehicule?: string;
}

interface FilterState {
  periode: { start: string; end: string };
  vehicleId: string;
  tenantName: string;
  contractStatus: string;
  vehicleStatus: string;
  expenseType: string;
}

export const Reports = () => {
  const { contracts: allContracts, refetch: refetchContracts } = useContracts();
  const { vehicles: allVehicles, refetch: refetchVehicles } = useVehicles();
  const { expenses: allExpenses } = useExpenses();
  
  const [activeTab, setActiveTab] = useState<"finance" | "fleet" | "tenants" | "ledger">("finance");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Sync data on mount and interval
  useEffect(() => {
    refetchContracts();
    const interval = setInterval(() => {
      refetchContracts();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetchContracts]);

  const contracts: Contract[] = useMemo(() => {
    return (allContracts || []).map((c) => {
      const contractWithAmount = { ...c, total_amount: Number(c.total_amount) };
      const summary = computeContractSummary(contractWithAmount as any, { advanceMode: 'field' });
      const updatedContract = { ...contractWithAmount, total_amount: summary.total };

      return {
        ...updatedContract,
        contractNumber: updatedContract.contract_number,
        vehicleName: updatedContract.vehicle,
        startDate: updatedContract.start_date,
        endDate: updatedContract.end_date,
        totalAmount: summary.total,
      };
    });
  }, [allContracts]);

  const vehicles: Vehicle[] = useMemo(() =>
    (allVehicles || []).map((v) => {
      const marque = v.marque || v.brand || "—";
      const modele = v.modele || v.model || "—";
      const immatriculation = v.immatriculation || v.registration || v.id?.slice?.(0, 8) || "—";
      return {
        ...v,
        marque,
        modele,
        immatriculation,
      };
    }),
    [allVehicles]
  );

  const [filters, setFilters] = useState<FilterState>({
    periode: { start: "", end: "" },
    vehicleId: "all",
    tenantName: "",
    contractStatus: "",
    vehicleStatus: "",
    expenseType: "",
  });

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      if (filters.contractStatus && filters.contractStatus !== "all" && contract.status !== filters.contractStatus) {
        return false;
      }

      if (filters.vehicleId !== "all" && contract.vehicleId !== filters.vehicleId) {
        return false;
      }

      if (filters.tenantName.trim()) {
        const customer = (contract.customer_name || contract.customerName || "").toLowerCase();
        if (!customer.includes(filters.tenantName.trim().toLowerCase())) {
          return false;
        }
      }

      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const customer = (contract.customer_name || contract.customerName || "").toLowerCase();
        const vehicle = (contract.vehicle || "").toLowerCase();
        const contractNum = ((contract as any).contract_number || (contract as any).contractNumber || "").toLowerCase();
        if (!customer.includes(search) && !vehicle.includes(search) && !contractNum.includes(search)) {
          return false;
        }
      }

      const contractStart = contract.start_date ? new Date(contract.start_date) : null;
      if (filters.periode.start && contractStart && contractStart < new Date(filters.periode.start)) {
        return false;
      }

      if (filters.periode.end && contractStart && contractStart > new Date(filters.periode.end)) {
        return false;
      }

      return true;
    });
  }, [contracts, filters, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalContracts = filteredContracts.length;
    const activeContracts = filteredContracts.filter((c) => c.status === "signed" || c.status === "ouvert").length;
    const completedContracts = filteredContracts.filter((c) => c.status === "completed" || c.status === "ferme").length;
    const upcomingContracts = filteredContracts.filter((c) => c.status === "draft" || c.status === "sent").length;

    const overdueContracts = filteredContracts.filter((c) => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return c.status === 'ouvert' && summary.overdueDays > 0;
    }).length;

    const extendedContracts = filteredContracts.filter((c) => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return summary.extensionDays > 0;
    }).length;

    const paidContracts = filteredContracts.filter((c) => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return summary.statut === 'payé';
    }).length;

    const pendingContracts = filteredContracts.filter((c) => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return summary.statut === 'en attente';
    }).length;

    const totalRevenue = filteredContracts.reduce((sum, contract) => {
      return sum + (contract.total_amount || 0);
    }, 0);

    const totalExpenses = (allExpenses || []).reduce((sum, expense) => sum + expense.total_cost, 0);

    const totalDaysRented = filteredContracts.reduce((sum, contract) => {
      if (!contract.start_date || !contract.end_date) return sum;
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const diffInMs = end.getTime() - start.getTime();
      if (diffInMs < 0) return sum;
      const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24)) + 1;
      const summary = computeContractSummary(contract as ServiceContract, { advanceMode: 'field' });
      return sum + days + summary.overdueDays;
    }, 0);

    const overdueRevenue = filteredContracts.reduce((sum, contract) => {
      const summary = computeContractSummary(contract as ServiceContract, { advanceMode: 'field' });
      const dailyRate = contract.daily_rate || 0;
      return sum + (summary.overdueDays * dailyRate);
    }, 0);

    return {
      totalContracts,
      activeContracts,
      completedContracts,
      upcomingContracts,
      overdueContracts,
      extendedContracts,
      paidContracts,
      pendingContracts,
      paidRate: totalContracts > 0 ? Math.round((paidContracts / totalContracts) * 100) : 0,
      totalRevenue,
      totalExpenses,
      totalDaysRented,
      overdueRevenue,
      netProfit: totalRevenue - totalExpenses,
    };
  }, [filteredContracts, allExpenses]);

  const avgContractValue = stats.totalContracts > 0 ? Math.round(stats.totalRevenue / stats.totalContracts) : 0;

  const expiringSoonContracts = useMemo(() => {
    const now = new Date();
    return filteredContracts
      .map((contract) => {
        const endRaw = contract.end_date;
        if (!endRaw) return null;
        const end = new Date(endRaw);
        if (Number.isNaN(end.getTime())) return null;
        const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: contract.id,
          contractNumber: (contract as any).contract_number || (contract as any).contractNumber || "N/A",
          customer: contract.customer_name || contract.customerName || "Client",
          daysLeft,
        };
      })
      .filter((item): item is { id: string; contractNumber: string; customer: string; daysLeft: number } => !!item && item.daysLeft >= 0 && item.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 5);
  }, [filteredContracts]);

  const topVehicles = useMemo(() => {
    const byVehicle: Record<string, { label: string; contracts: number; revenue: number }> = {};
    filteredContracts.forEach((contract) => {
      const label = contract.vehicle || "Véhicule";
      if (!byVehicle[label]) byVehicle[label] = { label, contracts: 0, revenue: 0 };
      byVehicle[label].contracts += 1;
      byVehicle[label].revenue += Number(contract.total_amount) || 0;
    });
    return Object.values(byVehicle).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [filteredContracts]);

  const monthlyTrendData = useMemo(() => {
    const map: Record<string, { label: string; revenue: number; contracts: number }> = {};
    filteredContracts.forEach((contract) => {
      const sourceDate = contract.start_date || contract.end_date;
      if (!sourceDate) return;
      const date = new Date(sourceDate);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { label, revenue: 0, contracts: 0 };
      map[key].revenue += Number(contract.total_amount) || 0;
      map[key].contracts += 1;
    });
    return Object.keys(map)
      .sort((a, b) => {
        const [ya, ma] = a.split("-").map(Number);
        const [yb, mb] = b.split("-").map(Number);
        return new Date(ya, ma - 1, 1).getTime() - new Date(yb, mb - 1, 1).getTime();
      })
      .map((key) => map[key])
      .slice(-8);
  }, [filteredContracts]);

  const topContractsTable = useMemo(() => {
    return [...filteredContracts]
      .sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0));
  }, [filteredContracts]);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR");
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case "signed": return "Signé";
      case "completed": return "Terminé";
      case "draft": return "Brouillon";
      case "sent": return "Envoyé";
      case "ouvert": return "Ouvert";
      case "ferme": return "Fermé";
      case "cancelled": return "Annulé";
      default: return "N/A";
    }
  };

  const statusClass = (status?: string) => {
    if (status === "signed" || status === "completed") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    if (status === "draft" || status === "sent") return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30";
    if (status === "ouvert") return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
    if (status === "cancelled") return "bg-destructive/15 text-destructive border border-destructive/30";
    return "bg-muted text-muted-foreground";
  };

  const contractsForRevenue = useMemo(() => {
    return contracts.map((c) => ({
      ...c,
      customerName: c.customer_name || "",
      startDate: c.start_date || "",
      endDate: c.end_date || "",
      dailyRate: c.daily_rate || 0,
      totalAmount: String(c.total_amount || 0),
      vehicle: c.vehicle || "",
    }));
  }, [contracts]);

  const filteredContractsForRevenue = useMemo(() => {
    const ids = new Set(filteredContracts.map((contract) => contract.id));
    return contractsForRevenue.filter((contract) => ids.has(contract.id));
  }, [contractsForRevenue, filteredContracts]);

  const exportRows = useMemo(() => {
    return filteredContracts.map((contract) => ({
      contract: (contract as any).contract_number || (contract as any).contractNumber || "N/A",
      client: contract.customer_name || contract.customerName || "Client",
      vehicle: contract.vehicle || "Véhicule",
      start: formatDate(contract.start_date),
      end: formatDate(contract.end_date),
      status: statusLabel(contract.status),
      amount: Math.round(Number(contract.total_amount) || 0),
    }));
  }, [filteredContracts]);

  // Export PDF with jsPDF & AutoTable
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Rapport d'Activité & Analytique Flotte - SFTLOCATION 2026", 14, 16);
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleString("fr-FR")}`, 14, 23);
    doc.text(`Contrats filtrés: ${filteredContracts.length} | CA Total: ${Math.round(stats.totalRevenue).toLocaleString()} MAD | Bénéfice Net: ${Math.round(stats.netProfit).toLocaleString()} MAD`, 14, 29);

    autoTable(doc, {
      startY: 35,
      head: [["N° Contrat", "Client", "Véhicule", "Date Début", "Date Fin", "Statut", "Montant (MAD)"]],
      body: exportRows.map((row) => [
        row.contract,
        row.client,
        row.vehicle,
        row.start,
        row.end,
        row.status,
        row.amount.toLocaleString(),
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [30, 41, 59] },
    });

    doc.save(`rapport_flotte_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Contrat", "Client", "Véhicule", "Date début", "Date fin", "Statut", "Montant MAD"];
    const rows = exportRows.map((row) => [
      row.contract,
      row.client,
      row.vehicle,
      row.start,
      row.end,
      row.status,
      row.amount.toString(),
    ]);
    const csv = [headers, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_flotte_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export XLSX Multi-feuilles Stylisé
  const handleExportExcel = async () => {
    type XlsxCell = string | number | { value: string | number; type?: "string" | "number"; style?: number };

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

    const toCell = (cell: XlsxCell) => {
      if (typeof cell === "string" || typeof cell === "number") {
        return { value: cell, type: typeof cell === "number" ? ("number" as const) : ("string" as const) };
      }
      return {
        value: cell.value,
        type: cell.type ?? (typeof cell.value === "number" ? ("number" as const) : ("string" as const)),
        style: cell.style,
      };
    };

    const buildSheetXml = (rows: Array<Array<XlsxCell>>, columnWidths: number[]) => {
      const colsXml = columnWidths
        .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
        .join("");

      const rowXml = rows
        .map((row, rowIndex) => {
          const rowNumber = rowIndex + 1;
          const cellsXml = row
            .map((rawCell, cellIndex) => {
              const cell = toCell(rawCell);
              const ref = `${getColumnName(cellIndex + 1)}${rowNumber}`;
              const styleAttr = typeof cell.style === "number" ? ` s="${cell.style}"` : "";
              if (cell.type === "number" && typeof cell.value === "number" && Number.isFinite(cell.value)) {
                return `<c r="${ref}"${styleAttr}><v>${cell.value}</v></c>`;
              }
              return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t>${escapeXml(String(cell.value))}</t></is></c>`;
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

    const headerStyle = 1;
    const currencyStyle = 2;

    const metricsRows: Array<Array<XlsxCell>> = [
      [
        { value: "Indicateur Analytique 2026", style: headerStyle },
        { value: "Valeur", style: headerStyle },
      ],
      ["Nombre de contrats filtrés", filteredContracts.length],
      ["Chiffre d'affaires global (MAD)", Math.round(stats.totalRevenue)],
      ["Charges & Dépenses (MAD)", Math.round(stats.totalExpenses)],
      ["Bénéfice Net Opérationnel (MAD)", Math.round(stats.netProfit)],
      ["Taux de Recouvrement (%)", stats.paidRate],
      ["Valeur moyenne par contrat (MAD)", avgContractValue],
      ["Total jours loués", stats.totalDaysRented],
    ];

    const contractRows: Array<Array<XlsxCell>> = [
      [
        { value: "Contrat", style: headerStyle },
        { value: "Client", style: headerStyle },
        { value: "Véhicule", style: headerStyle },
        { value: "Date début", style: headerStyle },
        { value: "Date fin", style: headerStyle },
        { value: "Statut", style: headerStyle },
        { value: "Montant MAD", style: headerStyle },
      ],
      ...exportRows.map((row) => [
        row.contract,
        row.client,
        row.vehicle,
        row.start,
        row.end,
        row.status,
        { value: row.amount, style: currencyStyle },
      ]),
    ];

    const vehicleRows: Array<Array<XlsxCell>> = [
      [
        { value: "Véhicule", style: headerStyle },
        { value: "Nombre contrats", style: headerStyle },
        { value: "Revenu Total MAD", style: headerStyle },
      ],
      ...topVehicles.map((v) => [v.label, v.contracts, { value: Math.round(v.revenue), style: currencyStyle }]),
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Grand Livre Contrats" sheetId="1" r:id="rId1"/>
    <sheet name="Performance Flotte" sheetId="2" r:id="rId2"/>
    <sheet name="KPIs & Indicateurs" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`;

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="#,##0 &quot;MAD&quot;"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

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
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels")?.file(".rels", rootRelsXml);
    zip.folder("xl")?.file("workbook.xml", workbookXml);
    zip.folder("xl")?.file("styles.xml", stylesXml);
    zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", workbookRelsXml);
    zip.folder("xl")?.folder("worksheets")?.file("sheet1.xml", buildSheetXml(contractRows, [18, 26, 22, 14, 14, 14, 16]));
    zip.folder("xl")?.folder("worksheets")?.file("sheet2.xml", buildSheetXml(vehicleRows, [30, 18, 16]));
    zip.folder("xl")?.folder("worksheets")?.file("sheet3.xml", buildSheetXml(metricsRows, [34, 18]));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_analytique_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const setPeriodPreset = (preset: "month" | "30d" | "quarter" | "year" | "all") => {
    const now = new Date();
    if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      setFilters((prev) => ({ ...prev, periode: { start, end } }));
    } else if (preset === "30d") {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 29);
      setFilters((prev) => ({
        ...prev,
        periode: {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
      }));
    } else if (preset === "quarter") {
      const q = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), (q + 1) * 3, 0).toISOString().slice(0, 10);
      setFilters((prev) => ({ ...prev, periode: { start, end } }));
    } else if (preset === "year") {
      const start = `${now.getFullYear()}-01-01`;
      const end = `${now.getFullYear()}-12-31`;
      setFilters((prev) => ({ ...prev, periode: { start, end } }));
    } else {
      setFilters((prev) => ({ ...prev, periode: { start: "", end: "" } }));
    }
  };

  const hasActiveFilters = Boolean(
    filters.periode.start ||
    filters.periode.end ||
    (filters.vehicleId && filters.vehicleId !== "all") ||
    filters.tenantName ||
    (filters.contractStatus && filters.contractStatus !== "all") ||
    searchTerm.trim()
  );

  return (
    <div className="space-y-7 pb-24 safe-pt safe-pb relative">
      
      {/* 2026 ANALYTICS COMMAND CENTER HERO HEADER */}
      <motion.div 
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent border border-accent/30 flex items-center justify-center font-black shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                Rapports & <span className="text-accent">Analyses</span>
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium pl-1">
            Intelligence financière, rentabilité du parc et audits d'exploitation 2026
          </p>
        </div>

        {/* Quick Action & Export Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/">
            <Button variant="outline" className="rounded-2xl h-11 px-4 font-bold border-border/60 hover:bg-accent/10">
              Accueil
            </Button>
          </Link>

          <Button 
            variant="outline" 
            onClick={handleExportPDF}
            className="rounded-2xl h-11 px-3.5 font-bold border-border/60 hover:bg-accent/10 text-xs gap-1.5"
          >
            <FileText className="w-4 h-4 text-accent" />
            <span>PDF</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            className="rounded-2xl h-11 px-3.5 font-bold border-border/60 hover:bg-accent/10 text-xs gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Excel XLSX</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            className="rounded-2xl h-11 px-3.5 font-bold border-border/60 hover:bg-accent/10 text-xs gap-1.5 hidden sm:flex"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </Button>

          <Button 
            onClick={() => setIsFilterDialogOpen(true)}
            className="rounded-2xl h-11 px-4 font-black bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all text-xs"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filtres Avancés
          </Button>
        </div>
      </motion.div>

      {/* QUICK PRESETS & SEARCH BAR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="p-4 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-xs space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground shrink-0 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-accent" /> Périodes:
            </span>

            <button
              onClick={() => setPeriodPreset("month")}
              className="px-3 py-1.5 rounded-xl font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-all"
            >
              Ce Mois
            </button>
            <button
              onClick={() => setPeriodPreset("30d")}
              className="px-3 py-1.5 rounded-xl font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-all"
            >
              30 Derniers Jours
            </button>
            <button
              onClick={() => setPeriodPreset("quarter")}
              className="px-3 py-1.5 rounded-xl font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-all"
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriodPreset("year")}
              className="px-3 py-1.5 rounded-xl font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-all"
            >
              Année 2026
            </button>
            <button
              onClick={() => setPeriodPreset("all")}
              className="px-3 py-1.5 rounded-xl font-bold bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-all"
            >
              Tout Afficher
            </button>
          </div>

          {/* Quick Universal Search */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filtrer client, véhicule, contrat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-8 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Summary Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30 text-xs">
          <Badge variant="secondary" className="font-mono font-bold">
            {filteredContracts.length} contrat(s) filtré(s)
          </Badge>
          <Badge variant="secondary" className="font-mono font-bold">
            {stats.paidRate}% taux de recouvrement
          </Badge>
          {filters.periode.start && (
            <Badge variant="outline" className="gap-1">
              Du: {filters.periode.start}
            </Badge>
          )}
          {filters.periode.end && (
            <Badge variant="outline" className="gap-1">
              Au: {filters.periode.end}
            </Badge>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({
                  periode: { start: "", end: "" },
                  vehicleId: "all",
                  tenantName: "",
                  contractStatus: "",
                  vehicleStatus: "",
                  expenseType: "",
                });
                setSearchTerm("");
              }}
              className="text-xs text-destructive hover:underline font-bold ml-auto"
            >
              Effacer tous les filtres
            </button>
          )}
        </div>
      </motion.div>

      {/* METRICS & KPIS 2026 */}
      <MetricsSection stats={stats} />

      {/* 4 WORKSPACES TABS SYSTEM */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl bg-muted/50 border border-border/40 h-auto">
            <TabsTrigger value="finance" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              Performance Financière
            </TabsTrigger>
            <TabsTrigger value="fleet" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="w-3.5 h-3.5 text-blue-500" />
              Exploitation & Planning Flotte
            </TabsTrigger>
            <TabsTrigger value="tenants" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              Intelligence Clients
            </TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-xl py-2.5 font-bold text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Grand Livre des Contrats
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PERFORMANCE FINANCIÈRE */}
          <TabsContent value="finance" className="space-y-6 animate-in fade-in-50 duration-300">
            <MonthlyRevenueSection contracts={filteredContracts} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Trend Area Chart */}
              <Card className="xl:col-span-2 rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                        Tendance Filtrée des Revenus & Contrats
                      </CardTitle>
                      <CardDescription className="text-xs font-medium">
                        Trajectoire sur la période sélectionnée (MAD)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-2 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData}>
                      <defs>
                        <linearGradient id="trendFill2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: "bold" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "1rem",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                        formatter={(value: number, name: string) => [
                          name === "revenue" ? `${Math.round(Number(value)).toLocaleString()} MAD` : Number(value),
                          name === "revenue" ? "Revenu" : "Contrats",
                        ]}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#trendFill2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Financial Balance Breakdown */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-5 sm:p-6 pb-2">
                  <CardTitle className="text-base sm:text-lg font-black tracking-tight">
                    Bilan & Marge Nette
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">Synthèse globale de rentabilité</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-2 space-y-4">
                  <div className={`p-4 rounded-2xl border ${
                    stats.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}>
                    <span className="text-[10px] font-black uppercase tracking-wider block">Bénéfice Net Opérationnel</span>
                    <span className="text-2xl font-black font-mono block mt-0.5">
                      {stats.netProfit > 0 ? "+" : ""}{Math.round(stats.netProfit).toLocaleString()} MAD
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                      <span className="text-muted-foreground font-semibold">Chiffre d'Affaires</span>
                      <span className="font-black text-foreground font-mono">{Math.round(stats.totalRevenue).toLocaleString()} MAD</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                      <span className="text-muted-foreground font-semibold">Charges d'Exploitation</span>
                      <span className="font-black text-destructive font-mono">{Math.round(stats.totalExpenses).toLocaleString()} MAD</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30">
                      <span className="text-muted-foreground font-semibold">Valeur Moyenne / Contrat</span>
                      <span className="font-black text-accent font-mono">{avgContractValue.toLocaleString()} MAD</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Vehicles Ranking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueSection
                vehicles={vehicles}
                contracts={filteredContractsForRevenue as RevenueChartContract[]}
                filters={filters}
              />

              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-black tracking-tight">Top Véhicules Rentables</CardTitle>
                      <CardDescription className="text-xs font-medium">Classement par chiffre d'affaires généré</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-2">
                  <div className="space-y-3">
                    {topVehicles.length > 0 ? (
                      topVehicles.map((v, i) => (
                        <div key={`${v.label}-${i}`} className="p-3.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground truncate">{v.label}</p>
                            <p className="text-xs text-muted-foreground font-medium">{v.contracts} contrat(s)</p>
                          </div>
                          <span className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                            {Math.round(v.revenue).toLocaleString()} MAD
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground">Aucune donnée disponible</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 2: EXPLOITATION & PLANNING FLOTTE */}
          <TabsContent value="fleet" className="space-y-6 animate-in fade-in-50 duration-300">
            <VehiclePlanningSection
              vehicles={vehicles}
              contracts={filteredContracts as Contract[]}
              filters={filters}
            />

            <AllVehiclesSection
              vehicles={vehicles}
              onRefresh={refetchVehicles}
            />

            <VehicleComparisonSection
              vehicles={vehicles}
              contracts={filteredContracts}
              expenses={allExpenses || []}
            />
          </TabsContent>

          {/* TAB 3: INTELLIGENCE CLIENTS & RECOUVREMENT */}
          <TabsContent value="tenants" className="space-y-6 animate-in fade-in-50 duration-300">
            <TenantSection
              contracts={filteredContracts as any}
              filters={filters}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expiring / Critical Contracts */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
                <CardHeader className="p-5 sm:p-6 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg font-black tracking-tight">Échéances Proches (7 jours)</CardTitle>
                      <CardDescription className="text-xs font-medium">Contrats nécessitant un suivi ou renouvellement</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-2">
                  <div className="space-y-2.5">
                    {expiringSoonContracts.length > 0 ? (
                      expiringSoonContracts.map((c) => (
                        <div key={c.id} className="p-3 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{c.customer}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">#{c.contractNumber}</p>
                          </div>
                          <Badge className={c.daysLeft <= 2 ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"}>
                            {c.daysLeft === 0 ? "Aujourd'hui" : `${c.daysLeft} jour(s)`}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground">Aucun contrat arrivant à terme cette semaine</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Export Summary Box */}
              <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-5 sm:p-6 pb-2">
                  <CardTitle className="text-base sm:text-lg font-black tracking-tight">Audit & Télémétrie Export</CardTitle>
                  <CardDescription className="text-xs font-medium">Données prêtes pour certification comptable</CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-muted/30 border border-border/40 text-center">
                      <span className="text-[10px] uppercase font-black text-muted-foreground block">Lignes Auditées</span>
                      <span className="text-2xl font-black font-mono text-foreground mt-0.5 block">{exportRows.length}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <span className="text-[10px] uppercase font-black text-emerald-600 dark:text-emerald-400 block">Total Encaissable</span>
                      <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                        {Math.round(stats.totalRevenue).toLocaleString()} MAD
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 4: GRAND LIVRE DES CONTRATS */}
          <TabsContent value="ledger" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="rounded-[2rem] border border-border/60 bg-gradient-to-br from-card via-card to-card/95 backdrop-blur-xl shadow-card overflow-hidden">
              <CardHeader className="p-5 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black tracking-tight">
                    Grand Livre des Contrats
                  </CardTitle>
                  <CardDescription className="text-xs font-medium">
                    {topContractsTable.length} enregistrement(s) trouvé(s)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportPDF} className="rounded-xl text-xs font-bold gap-1">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportExcel} className="rounded-xl text-xs font-bold gap-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs hidden md:table">
                    <thead>
                      <tr className="border-b border-border/60 uppercase tracking-wider text-muted-foreground font-black">
                        <th className="py-3 px-3">Contrat</th>
                        <th className="py-3 px-3">Client</th>
                        <th className="py-3 px-3">Véhicule</th>
                        <th className="py-3 px-3">Période</th>
                        <th className="py-3 px-3">Statut</th>
                        <th className="py-3 px-3 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-medium">
                      {topContractsTable.length > 0 ? (
                        topContractsTable.map((contract) => (
                          <tr key={contract.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold">
                              {(contract as any).contract_number || (contract as any).contractNumber || "N/A"}
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-foreground">
                              {contract.customer_name || contract.customerName || "Client"}
                            </td>
                            <td className="py-3.5 px-3">{contract.vehicle || "Véhicule"}</td>
                            <td className="py-3.5 px-3 text-muted-foreground">
                              {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusClass(contract.status)}`}>
                                {statusLabel(contract.status)}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-right font-black font-mono text-sm text-foreground">
                              {Math.round(Number(contract.total_amount) || 0).toLocaleString()} MAD
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-12 text-center text-muted-foreground" colSpan={6}>
                            Aucun contrat ne correspond aux critères de filtre.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Mobile Cards for Contracts */}
                  <div className="md:hidden space-y-3">
                    {topContractsTable.map((contract) => (
                      <div key={contract.id} className="p-4 rounded-2xl border border-border/50 bg-muted/10 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold">{(contract as any).contract_number || "N/A"}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass(contract.status)}`}>
                            {statusLabel(contract.status)}
                          </span>
                        </div>
                        <p className="font-bold text-foreground">{contract.customer_name || "Client"}</p>
                        <p className="text-muted-foreground text-[11px]">{contract.vehicle}</p>
                        <div className="border-t border-border/30 pt-2 flex justify-between items-center">
                          <span className="text-muted-foreground text-[10px]">
                            {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                          </span>
                          <span className="font-black font-mono text-accent">
                            {Math.round(Number(contract.total_amount) || 0).toLocaleString()} MAD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* FILTER MODAL DIALOG */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent className="max-w-lg rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Filtres Analytiques Avancés</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajustez les paramètres de dates, véhicules et statuts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Date de début</Label>
                <Input
                  type="date"
                  value={filters.periode.start}
                  onChange={(e) => setFilters((prev) => ({ ...prev, periode: { ...prev.periode, start: e.target.value } }))}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Date de fin</Label>
                <Input
                  type="date"
                  value={filters.periode.end}
                  onChange={(e) => setFilters((prev) => ({ ...prev, periode: { ...prev.periode, end: e.target.value } }))}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Filtrer par Véhicule</Label>
              <Select value={filters.vehicleId} onValueChange={(v) => setFilters((prev) => ({ ...prev, vehicleId: v }))}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Tous les véhicules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules ({vehicles.length})</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.marque} {v.modele} ({v.immatriculation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Statut du contrat</Label>
              <Select value={filters.contractStatus || "all"} onValueChange={(v) => setFilters((prev) => ({ ...prev, contractStatus: v }))}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="signed">Signé</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="ouvert">Ouvert</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="ferme">Fermé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    periode: { start: "", end: "" },
                    vehicleId: "all",
                    tenantName: "",
                    contractStatus: "all",
                    vehicleStatus: "",
                    expenseType: "",
                  });
                  setIsFilterDialogOpen(false);
                }}
                className="rounded-xl font-bold text-xs"
              >
                Réinitialiser
              </Button>
              <Button
                onClick={() => setIsFilterDialogOpen(false)}
                className="rounded-xl font-black text-xs bg-accent text-accent-foreground"
              >
                Appliquer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ANDROID FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => setIsFilterDialogOpen(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-2xl flex items-center justify-center font-black active:scale-95 transition-transform"
        aria-label="Filtres Analytiques"
      >
        <Filter className="w-6 h-6" />
      </button>

    </div>
  );
};

export type { Contract, Vehicle, FilterState };
export default Reports;
