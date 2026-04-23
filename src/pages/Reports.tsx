import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Filter, Trophy, AlertTriangle, RefreshCw, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocalStorage } from "@/hooks/useLocalStorage";
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
import type { Contract as ServiceContract } from "@/services/localStorageService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import JSZip from "jszip";

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
  // For compatibility
  customerName?: string;
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

const Reports = () => {
  const { contracts: allContracts, refetch: refetchContracts } = useContracts();
  const { vehicles: allVehicles, refetch: refetchVehicles } = useVehicles();
  const { expenses: allExpenses } = useExpenses();

  // Force refresh data when component mounts and every 30 seconds
  useEffect(() => {
    console.log("[Reports] Component mounted, fetching contract data...");
    refetchContracts();
    
    // Set up periodic refresh for real-time data sync
    const interval = setInterval(() => {
      console.log("[Reports] Auto-refreshing contract data for financial status sync...");
      refetchContracts();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [refetchContracts]);

  const contracts: Contract[] = useMemo(() => {
    console.log("[Reports] Processing contracts:", allContracts?.length || 0);
    return allContracts?.map(c => {
      const contractWithAmount = {...c, total_amount: Number(c.total_amount)};
      // Use centralized calculation logic
      const summary = computeContractSummary(contractWithAmount, { advanceMode: 'field' });
      const updatedContract = { ...contractWithAmount, total_amount: summary.total };
      
      // Enhanced logging for troubleshooting extension amounts
      const hasExtension = updatedContract.contract_data?.extensionAmount > 0;
      const hasOverdue = updatedContract.contract_data?.overdueAmount > 0;
      
      console.log("[Reports] Contract", c.contract_number, 
        "- Original amount:", c.total_amount,
        "- Updated amount:", updatedContract.total_amount,
        "- Summary:", summary);
      
      return {
        ...updatedContract,
        contractNumber: updatedContract.contract_number,
        vehicleName: updatedContract.vehicle,
        startDate: updatedContract.start_date,
        endDate: updatedContract.end_date,
        totalAmount: summary.total,
      };
    }) || [];
  }, [allContracts]);
  
  const vehicles: Vehicle[] = useMemo(() =>
    (allVehicles || [])
      .filter(v => v.marque && v.modele && v.immatriculation)
      .map(v => ({
        ...v,
        marque: v.marque!,
        modele: v.modele!,
        immatriculation: v.immatriculation!,
      }))
  , [allVehicles]);

  const [filters, setFilters] = useState<FilterState>({
    periode: { start: "", end: "" },
    vehicleId: "all",
    tenantName: "",
    contractStatus: "",
    vehicleStatus: "",
    expenseType: ""
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

      const contractStart = contract.start_date ? new Date(contract.start_date) : null;
      if (filters.periode.start && contractStart && contractStart < new Date(filters.periode.start)) {
        return false;
      }

      if (filters.periode.end && contractStart && contractStart > new Date(filters.periode.end)) {
        return false;
      }

      return true;
    });
  }, [contracts, filters]);

  // Calculate statistics with financial status
  const stats = useMemo(() => {
    const totalContracts = filteredContracts.length;
    const activeContracts = filteredContracts.filter(c => c.status === "signed").length;
    const completedContracts = filteredContracts.filter(c => c.status === "completed").length;
    const upcomingContracts = filteredContracts.filter(c => c.status === "draft" || c.status === "sent").length;

    // Calculate contracts by financial status
    const overdueContracts = filteredContracts.filter(c => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return c.status === 'ouvert' && summary.overdueDays > 0;
    }).length;

    const extendedContracts = filteredContracts.filter(c => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return summary.extensionDays > 0;
    }).length;

    const paidContracts = filteredContracts.filter(c => {
      const summary = computeContractSummary(c as ServiceContract, { advanceMode: 'field' });
      return summary.statut === 'payé';
    }).length;

    const pendingContracts = filteredContracts.filter(c => {
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
      
      // Add overdue days for unpaid contracts
      const summary = computeContractSummary(contract as ServiceContract, { advanceMode: 'field' });
      return sum + days + summary.overdueDays;
    }, 0);

    // Calculate overdue revenue
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
      netProfit: totalRevenue - totalExpenses
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
      .sort((a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0))
      .slice(0, 8);
  }, [filteredContracts]);

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("fr-FR");
  };

  const statusLabel = (status?: string) => {
    switch (status) {
      case "signed":
        return "Signé";
      case "completed":
        return "Terminé";
      case "draft":
        return "Brouillon";
      case "sent":
        return "Envoyé";
      case "ouvert":
        return "Ouvert";
      case "ferme":
        return "Fermé";
      case "cancelled":
        return "Annulé";
      default:
        return "N/A";
    }
  };

  const statusClass = (status?: string) => {
    if (status === "signed" || status === "completed") return "bg-card-green-bg text-card-green";
    if (status === "draft" || status === "sent") return "bg-card-blue-bg text-card-blue";
    if (status === "ouvert") return "bg-card-orange-bg text-card-orange";
    if (status === "cancelled") return "bg-card-red-bg text-card-red";
    return "bg-muted text-muted-foreground";
  };

  // Contracts prepared for child components requiring different prop shapes
  const contractsForPlanning = useMemo(() => {
    return contracts.map(c => {
      let { nombreDeJour } = c;
      // If nombreDeJour is not available on the contract, calculate it from dates
      if (nombreDeJour === undefined && c.start_date && c.end_date) {
        try {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          const diffInMs = end.getTime() - start.getTime();
          
          if (diffInMs >= 0) {
            // Calculate number of days. A rental from 15th to 19th is 4 days.
            nombreDeJour = Math.round(diffInMs / (1000 * 60 * 60 * 24));
          }
        } catch (e) {
          console.error(`Could not calculate duration for contract ${c.id}:`, e);
        }
      }
      return { ...c, customerName: c.customer_name, nombreDeJour };
    });
  }, [contracts]);

  const contractsForRevenue = useMemo(() => {
    return contracts.map(c => ({
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

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Rapport filtré - SFTLOCATION", 14, 16);
    doc.setFontSize(10);
    doc.text(`Date export: ${new Date().toLocaleString("fr-FR")}`, 14, 24);
    doc.text(`Contrats: ${filteredContracts.length} | Revenus: ${Math.round(stats.totalRevenue).toLocaleString()} DH`, 14, 30);

    autoTable(doc, {
      startY: 36,
      head: [["Contrat", "Client", "Véhicule", "Début", "Fin", "Statut", "Montant (DH)"]],
      body: exportRows.map((row) => [
        row.contract,
        row.client,
        row.vehicle,
        row.start,
        row.end,
        row.status,
        row.amount.toLocaleString(),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 30, 30] },
    });

    doc.save(`rapport_filtre_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportCSV = () => {
    const headers = ["Contrat", "Client", "Véhicule", "Date début", "Date fin", "Statut", "Montant DH"];
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
    link.download = `rapport_filtre_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
        return { value: cell, type: typeof cell === "number" ? "number" as const : "string" as const };
      }
      return {
        value: cell.value,
        type: cell.type ?? (typeof cell.value === "number" ? "number" as const : "string" as const),
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
    const metricCurrencyLabels = new Set(["Revenus filtrés", "Dépenses", "Résultat net", "Valeur moyenne contrat"]);

    const vehicleExportRows = topVehicles.map((vehicle) => [
      vehicle.label,
      vehicle.contracts,
      Math.round(vehicle.revenue),
    ]);

    const metricsRows: Array<Array<XlsxCell>> = [
      [
        { value: "Indicateur", style: headerStyle },
        { value: "Valeur", style: headerStyle },
      ],
      ...[
        ["Nombre de contrats", filteredContracts.length],
        ["Revenus filtrés", Math.round(stats.totalRevenue)],
        ["Dépenses", Math.round(stats.totalExpenses)],
        ["Résultat net", Math.round(stats.netProfit)],
        ["Taux de paiement (%)", stats.paidRate],
        ["Valeur moyenne contrat", avgContractValue],
        ["Échéances proches", expiringSoonContracts.length],
      ].map(([label, value]) => [
        String(label),
        metricCurrencyLabels.has(String(label)) && typeof value === "number"
          ? { value, style: currencyStyle }
          : typeof value === "number"
            ? { value, type: "number" as const }
            : String(value),
      ]),
    ];

    const contractRows: Array<Array<XlsxCell>> = [
      [
        { value: "Contrat", style: headerStyle },
        { value: "Client", style: headerStyle },
        { value: "Véhicule", style: headerStyle },
        { value: "Date début", style: headerStyle },
        { value: "Date fin", style: headerStyle },
        { value: "Statut", style: headerStyle },
        { value: "Montant DH", style: headerStyle },
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
        { value: "Revenu DH", style: headerStyle },
      ],
      ...vehicleExportRows.map((row) => [row[0], row[1], { value: row[2], style: currencyStyle }]),
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Contrats" sheetId="1" r:id="rId1"/>
    <sheet name="Vehicules" sheetId="2" r:id="rId2"/>
    <sheet name="Indicateurs" sheetId="3" r:id="rId3"/>
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
    <numFmt numFmtId="164" formatCode="#,##0 &quot;DH&quot;"/>
  </numFmts>
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E1E1E"/><bgColor indexed="64"/></patternFill></fill>
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
    zip.folder("xl")?.folder("worksheets")?.file("sheet3.xml", buildSheetXml(metricsRows, [30, 18]));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport_filtre_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Rapports et Analyses</h1>
              <p className="text-muted-foreground">Rapports financiers et analyses de performance opérationnelle</p>
            </div>
            <Link to="/">
              <Button variant="outline">Retour à l'Accueil</Button>
            </Link>
          </div>
        </div>

        <Card className="mb-8 border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Filter className="h-5 w-5 text-accent" />
              Filtres intelligents
            </CardTitle>
            <CardDescription>
              Affichez les rapports par période, statut, véhicule et client sans perdre les données existantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setFilters((prev) => ({ ...prev, periode: { start, end } }));
                }}
              >
                Ce mois
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
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
                }}
              >
                30 derniers jours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    periode: { start: "", end: "" },
                    vehicleId: "all",
                    tenantName: "",
                    contractStatus: "all",
                  }))
                }
              >
                Réinitialiser
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchContracts()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Actualiser
              </Button>
              <Button size="sm" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-1.5" />
                Export PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Export XLSX
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1.5" />
                Export CSV
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={filters.periode.start}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      periode: { ...prev.periode, start: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={filters.periode.end}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      periode: { ...prev.periode, end: e.target.value },
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Client</Label>
                <Input
                  value={filters.tenantName}
                  onChange={(e) => setFilters((prev) => ({ ...prev, tenantName: e.target.value }))}
                  placeholder="Nom client"
                />
              </div>
              <div className="space-y-1">
                <Label>Statut contrat</Label>
                <Select
                  value={filters.contractStatus || "all"}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, contractStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="sent">Envoyé</SelectItem>
                    <SelectItem value="signed">Signé</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="ouvert">Ouvert</SelectItem>
                    <SelectItem value="ferme">Fermé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Véhicule</Label>
                <Select
                  value={filters.vehicleId}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, vehicleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les véhicules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les véhicules</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.marque} {vehicle.modele}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{filteredContracts.length} contrats affichés</Badge>
              <Badge variant="secondary">{stats.paidRate}% payés</Badge>
              <Badge variant="secondary">{expiringSoonContracts.length} échéances proches</Badge>
            </div>
          </CardContent>
        </Card>

        <MetricsSection stats={stats} />

        <MonthlyRevenueSection contracts={filteredContracts} />

        <VehiclePlanningSection
          vehicles={vehicles}
          contracts={filteredContracts as Contract[]}
          filters={filters}
        />

        <AllVehiclesSection
          vehicles={vehicles}
          onRefresh={refetchVehicles}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <RevenueSection
            vehicles={vehicles}
            contracts={filteredContractsForRevenue as RevenueChartContract[]}
            filters={filters}
          />
        </div>

        {/* Vehicle Comparison Section */}
        <VehicleComparisonSection
          vehicles={vehicles}
          contracts={filteredContracts}
          expenses={allExpenses || []}
        />

        {/* Tenant Section - moved after Vehicle Comparison */}
        <div className="mb-8">
          <TenantSection
            contracts={filteredContracts as any}
            filters={filters}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Indicateurs avancés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Valeur moyenne contrat</span>
                <span className="font-black text-accent">{avgContractValue.toLocaleString()} DH</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-muted-foreground">Rentabilité nette</span>
                <span className={`font-black ${stats.netProfit >= 0 ? "text-card-green" : "text-card-red"}`}>
                  {stats.netProfit.toLocaleString()} DH
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Taux de paiement</span>
                <span className="font-black text-card-blue">{stats.paidRate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-card-orange" />
                Contrats à surveiller
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {expiringSoonContracts.length > 0 ? (
                expiringSoonContracts.map((contract) => (
                  <div key={contract.id} className="p-3 rounded-xl border border-border/50 bg-background/40 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{contract.customer}</p>
                      <p className="text-xs text-muted-foreground truncate">#{contract.contractNumber}</p>
                    </div>
                    <Badge variant="secondary" className={contract.daysLeft <= 2 ? "text-card-red" : "text-card-orange"}>
                      {contract.daysLeft === 0 ? "Aujourd'hui" : `${contract.daysLeft} j`}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground p-5 rounded-xl border border-dashed border-border">
                  Aucun contrat arrivant à échéance cette semaine
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-card-blue" />
                Top véhicules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topVehicles.length > 0 ? (
                topVehicles.map((vehicle, index) => (
                  <div key={`${vehicle.label}-${index}`} className="p-3 rounded-xl border border-border/50 bg-background/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold truncate">{vehicle.label}</p>
                      <span className="text-sm font-black text-card-blue">{Math.round(vehicle.revenue).toLocaleString()} DH</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{vehicle.contracts} contrats</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground p-5 rounded-xl border border-dashed border-border">
                  Pas de données de véhicules pour ces filtres
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <Card className="xl:col-span-2 border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Download className="h-5 w-5 text-accent" />
                Tendance filtrée des revenus
              </CardTitle>
              <CardDescription>
                Evolution des revenus selon les filtres actifs
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "1rem",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `${Math.round(Number(value)).toLocaleString()} DH` : Number(value),
                      name === "revenue" ? "Revenu" : "Contrats",
                    ]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={3} fill="url(#trendFill)" />
                  <Area type="monotone" dataKey="contracts" stroke="hsl(var(--card-blue))" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Résumé exportable</CardTitle>
              <CardDescription>Prévisualisation des données exportées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border/50 p-3 bg-background/40">
                <p className="text-xs text-muted-foreground">Lignes export</p>
                <p className="text-2xl font-black">{exportRows.length}</p>
              </div>
              <div className="rounded-xl border border-border/50 p-3 bg-background/40">
                <p className="text-xs text-muted-foreground">Revenu exporté</p>
                <p className="text-2xl font-black text-accent">{Math.round(stats.totalRevenue).toLocaleString()} DH</p>
              </div>
              <div className="rounded-xl border border-border/50 p-3 bg-background/40">
                <p className="text-xs text-muted-foreground">Dernier export</p>
                <p className="text-sm font-bold">{new Date().toLocaleDateString("fr-FR")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 border-none shadow-card rounded-[2rem] overflow-hidden bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tableau des meilleurs contrats</CardTitle>
            <CardDescription>Classement par montant selon les filtres appliqués</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full table-striped">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-3">Contrat</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Véhicule</th>
                  <th className="py-3 px-3">Période</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {topContractsTable.length > 0 ? (
                  topContractsTable.map((contract) => (
                    <tr key={contract.id} className="border-b border-border/40">
                      <td className="py-3 px-3 font-bold">{(contract as any).contract_number || (contract as any).contractNumber || "N/A"}</td>
                      <td className="py-3 px-3">{contract.customer_name || contract.customerName || "Client"}</td>
                      <td className="py-3 px-3">{contract.vehicle || "Véhicule"}</td>
                      <td className="py-3 px-3 text-sm text-muted-foreground">
                        {formatDate(contract.start_date)} → {formatDate(contract.end_date)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${statusClass(contract.status)}`}>
                          {statusLabel(contract.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black">
                        {Math.round(Number(contract.total_amount) || 0).toLocaleString()} DH
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-8 text-center text-muted-foreground" colSpan={6}>
                      لا توجد بيانات حسب الفلاتر الحالية
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Section de rapport des dépenses supprimée */}

        {/* Section de rapports personnalisés supprimée */}
      </div>
    </div>
  );
};

export type { Contract, Vehicle, FilterState };
export default Reports;
