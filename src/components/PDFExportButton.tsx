import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, FileDown, FileSpreadsheet, FileText, Loader2, SlidersHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { getCompanyDisplayName, getCompanyContactLines, getCompanySlug, getCompanyLogoImage } from "@/utils/companyInfo";

export type ExportType = 'reports' | 'revenue' | 'contract' | 'invoice';

interface RevenueStats {
  totalEncaisse?: number;
  totalDettes?: number;
  totalSolde?: number;
  totalEspeces?: number;
  totalCheques?: number;
  bankBalance?: number;
}

interface RevenueContractRow {
  id: string;
  contract_number: string;
  customer_name: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  total_amount?: number;
  advance_payment?: number;
  remaining_amount: number;
  financial_status?: { label?: string };
}

interface RevenuePieRow {
  name: string;
  value: number;
}

interface RevenueBankTransferRow {
  date: string;
  type: "cash" | "check" | "bank_to_cash";
  amount: number;
  fees?: number;
}

interface RevenuePaymentRow {
  contractNumber: string;
  customerName: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  checkReference?: string;
  checkName?: string;
  checkDepositStatus?: string;
}

interface RevenueExpenseRow {
  category: string;
  amount: number;
  expense_date: string;
  description?: string;
}

interface RevenueAlertRow {
  title: string;
  description: string;
  level: "warning" | "critical";
}

interface RevenueMonthlyKpiData {
  currentMonthKey: string;
  previousMonthKey: string;
  current: { netTotal: number; paymentsTotal: number };
  previous: { netTotal: number; paymentsTotal: number };
  delta: number;
  deltaPercent: number;
}

interface RevenueExportData {
  stats?: RevenueStats;
  contractsWithDebts?: RevenueContractRow[];
  pieChartData?: RevenuePieRow[];
  bankTransfers?: RevenueBankTransferRow[];
  payments?: RevenuePaymentRow[];
  miscellaneousExpenses?: RevenueExpenseRow[];
  smartAlerts?: RevenueAlertRow[];
  monthlyKpis?: RevenueMonthlyKpiData;
}

interface PDFExportButtonProps {
  type: ExportType;
  data: unknown;
  filename?: string;
  disabled?: boolean;
  className?: string;
}

type ExcelSheetKey = "summary" | "contracts" | "payments" | "expenses" | "alerts";

interface ExportOptions {
  startDate?: string;
  endDate?: string;
  includeSensitiveData: boolean;
  excelSheets: Record<ExcelSheetKey, boolean>;
}

export const PDFExportButton = ({ 
  type, 
  data, 
  filename, 
  disabled = false,
  className = ""
}: PDFExportButtonProps) => {
  const { toast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const [isExportingExcel, setIsExportingExcel] = React.useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [startDate, setStartDate] = React.useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [includeSensitiveData, setIncludeSensitiveData] = React.useState(true);
  const [excelSheets, setExcelSheets] = React.useState<Record<ExcelSheetKey, boolean>>({
    summary: true,
    contracts: true,
    payments: true,
    expenses: true,
    alerts: true
  });
  const isExporting = isExportingPdf || isExportingExcel;

  const resolveBaseFilename = () => {
    const provided = filename?.trim();
    if (!provided) return `${getCompanySlug()}-${type}-${new Date().toISOString().split('T')[0]}`;
    return provided.replace(/\.(pdf|xlsx)$/i, "");
  };

  const getRevenueData = (): RevenueExportData => (data as RevenueExportData) || {};

  const normalizeDateValue = (dateValue?: string) => {
    if (!dateValue) return "";
    const normalized = dateValue.includes("T") ? dateValue.slice(0, 10) : dateValue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "";
    return normalized;
  };

  const isDateInRange = (dateValue?: string, options?: ExportOptions) => {
    const normalized = normalizeDateValue(dateValue);
    if (!normalized) return true;
    const start = options?.startDate ? normalizeDateValue(options.startDate) : "";
    const end = options?.endDate ? normalizeDateValue(options.endDate) : "";
    if (start && normalized < start) return false;
    if (end && normalized > end) return false;
    return true;
  };

  const maskSensitiveText = (value: string) => {
    if (!value) return value;
    if (value.length <= 2) return "*".repeat(value.length);
    return `${value.slice(0, 1)}${"*".repeat(Math.max(1, value.length - 2))}${value.slice(-1)}`;
  };

  const maskContractNumber = (value: string) => {
    if (!value) return value;
    if (value.length <= 4) return "*".repeat(value.length);
    return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
  };

  const getPreparedRevenueData = (options?: ExportOptions): RevenueExportData => {
    const revenue = getRevenueData();
    const filteredPayments = (revenue.payments || []).filter((payment) => isDateInRange(payment.paymentDate, options));
    const filteredExpenses = (revenue.miscellaneousExpenses || []).filter((expense) => isDateInRange(expense.expense_date, options));
    const filteredTransfers = (revenue.bankTransfers || []).filter((transfer) => isDateInRange(transfer.date, options));
    const filteredContracts = (revenue.contractsWithDebts || []).filter((contract) => isDateInRange(contract.start_date, options));

    const shouldIncludeSensitive = options?.includeSensitiveData ?? true;

    const securedPayments = filteredPayments.map((payment) => ({
      ...payment,
      contractNumber: shouldIncludeSensitive ? payment.contractNumber : maskContractNumber(payment.contractNumber),
      customerName: shouldIncludeSensitive ? payment.customerName : maskSensitiveText(payment.customerName),
      checkReference: shouldIncludeSensitive ? payment.checkReference : undefined,
      checkName: shouldIncludeSensitive ? payment.checkName : undefined
    }));

    const securedContracts = filteredContracts.map((contract) => ({
      ...contract,
      contract_number: shouldIncludeSensitive ? contract.contract_number : maskContractNumber(contract.contract_number),
      customer_name: shouldIncludeSensitive ? contract.customer_name : maskSensitiveText(contract.customer_name)
    }));

    const securedExpenses = filteredExpenses.map((expense) => ({
      ...expense,
      description: shouldIncludeSensitive ? expense.description : undefined
    }));

    const derivedStats: RevenueStats = {
      totalEncaisse: securedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      totalDettes: securedContracts.reduce((sum, contract) => sum + Number(contract.remaining_amount || 0), 0),
      totalSolde: securedContracts.reduce((sum, contract) => sum + Math.max(0, Number(contract.total_amount || 0) - Number(contract.remaining_amount || 0)), 0),
      totalEspeces: securedPayments.filter((payment) => payment.paymentMethod === "Espèces").reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      totalCheques: securedPayments.filter((payment) => payment.paymentMethod === "Chèque").reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      bankBalance: revenue.stats?.bankBalance || 0
    };

    return {
      ...revenue,
      stats: { ...revenue.stats, ...derivedStats },
      payments: securedPayments,
      miscellaneousExpenses: securedExpenses,
      bankTransfers: filteredTransfers,
      contractsWithDebts: securedContracts
    };
  };

  const buildExportOptions = (): ExportOptions => ({
    startDate,
    endDate,
    includeSensitiveData,
    excelSheets
  });

  const generatePDF = async (options?: ExportOptions) => {
    setIsExportingPdf(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Common header
      const logoInfo = getCompanyLogoImage();
      if (logoInfo) {
        try {
          pdf.addImage(logoInfo.data, logoInfo.format, 14, 8, 18, 18);
        } catch {}
      }
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      const companyName = getCompanyDisplayName();
      pdf.text(`${companyName} - Location de Voitures`, pageWidth / 2, 20, { align: "center" });
      const { addressLine, phoneFaxLine, gsmLine, emailLine } = getCompanyContactLines();
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(addressLine, pageWidth / 2, 28, { align: "center" });
      let contactY = 34;
      if (phoneFaxLine) {
        pdf.text(phoneFaxLine, pageWidth / 2, contactY, { align: "center" });
        contactY += 6;
      }
      if (gsmLine) {
        pdf.text(gsmLine, pageWidth / 2, contactY, { align: "center" });
        contactY += 6;
      }
      if (emailLine) {
        pdf.text(emailLine, pageWidth / 2, contactY, { align: "center" });
        contactY += 6;
      }
      
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, contactY, { align: "right" });

      let yPosition = Math.max(contactY + 10, 50);
      const preparedRevenueData = getPreparedRevenueData(options);

      switch (type) {
        case 'reports':
          await generateReportsPDF(pdf, preparedRevenueData, yPosition);
          break;
        case 'revenue':
          await generateRevenuePDF(pdf, preparedRevenueData, yPosition);
          break;
        case 'contract':
          await generateContractPDF(pdf, data as Record<string, unknown>, yPosition);
          break;
        case 'invoice':
          await generateInvoicePDF(pdf, data as Record<string, unknown>, yPosition);
          break;
      }

      // Footer
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text(`Document généré automatiquement par ${companyName}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      const finalFilename = `${resolveBaseFilename()}.pdf`;
      pdf.save(finalFilename);

      toast({
        title: "Export réussi",
        description: `Le fichier PDF "${finalFilename}" a été téléchargé`,
        variant: "default"
      });

    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF",
        variant: "destructive"
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

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

  const downloadBlob = (blob: Blob, downloadName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateRevenueExcel = async (options?: ExportOptions) => {
    const revenue = getPreparedRevenueData(options);
    const headerStyle = 1;
    const currencyStyle = 2;

    const summaryRows: Array<Array<XlsxCell>> = [
      [{ value: "Indicateur", style: headerStyle }, { value: "Valeur", style: headerStyle }],
      ["Total Encaissé", { value: Number(revenue.stats?.totalEncaisse || 0), style: currencyStyle }],
      ["Total Dettes", { value: Number(revenue.stats?.totalDettes || 0), style: currencyStyle }],
      ["Total Soldé", { value: Number(revenue.stats?.totalSolde || 0), style: currencyStyle }],
      ["Total Espèces", { value: Number(revenue.stats?.totalEspeces || 0), style: currencyStyle }],
      ["Total Chèques", { value: Number(revenue.stats?.totalCheques || 0), style: currencyStyle }],
      ["Solde Banque", { value: Number(revenue.stats?.bankBalance || 0), style: currencyStyle }],
      ["Mois KPI courant", revenue.monthlyKpis?.currentMonthKey || "-"],
      ["Mois KPI précédent", revenue.monthlyKpis?.previousMonthKey || "-"],
      ["Net courant", { value: Number(revenue.monthlyKpis?.current.netTotal || 0), style: currencyStyle }],
      ["Net précédent", { value: Number(revenue.monthlyKpis?.previous.netTotal || 0), style: currencyStyle }],
      ["Variation nette", { value: Number(revenue.monthlyKpis?.delta || 0), style: currencyStyle }],
      ["Variation (%)", Number(revenue.monthlyKpis?.deltaPercent || 0)],
    ];

    const contractsRows: Array<Array<XlsxCell>> = [
      [
        { value: "Contrat", style: headerStyle },
        { value: "Locataire", style: headerStyle },
        { value: "Total", style: headerStyle },
        { value: "Avance", style: headerStyle },
        { value: "Reste", style: headerStyle },
        { value: "Statut", style: headerStyle },
      ],
      ...(revenue.contractsWithDebts || []).map((contract) => [
        contract.contract_number || "-",
        contract.customer_name || "-",
        { value: Number(contract.total_amount || 0), style: currencyStyle },
        { value: Number(contract.advance_payment || 0), style: currencyStyle },
        { value: Number(contract.remaining_amount || 0), style: currencyStyle },
        contract.financial_status?.label || "-",
      ]),
    ];

    const paymentsRows: Array<Array<XlsxCell>> = [
      [
        { value: "Date", style: headerStyle },
        { value: "Contrat", style: headerStyle },
        { value: "Client", style: headerStyle },
        { value: "Mode", style: headerStyle },
        { value: "Montant", style: headerStyle },
        { value: "Statut Chèque", style: headerStyle },
      ],
      ...(revenue.payments || []).map((payment) => [
        payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("fr-FR") : "-",
        payment.contractNumber || "-",
        payment.customerName || "-",
        payment.paymentMethod || "-",
        { value: Number(payment.amount || 0), style: currencyStyle },
        payment.checkDepositStatus || "-",
      ]),
    ];

    const expensesRows: Array<Array<XlsxCell>> = [
      [
        { value: "Date", style: headerStyle },
        { value: "Catégorie", style: headerStyle },
        { value: "Description", style: headerStyle },
        { value: "Montant", style: headerStyle },
      ],
      ...(revenue.miscellaneousExpenses || []).map((expense) => [
        expense.expense_date ? new Date(expense.expense_date).toLocaleDateString("fr-FR") : "-",
        expense.category || "-",
        expense.description || "-",
        { value: Number(expense.amount || 0), style: currencyStyle },
      ]),
    ];

    const alertsRows: Array<Array<XlsxCell>> = [
      [
        { value: "Niveau", style: headerStyle },
        { value: "Alerte", style: headerStyle },
        { value: "Détail", style: headerStyle },
      ],
      ...(revenue.smartAlerts || []).map((alert) => [alert.level, alert.title, alert.description]),
    ];

    const selectedSheets = options?.excelSheets || excelSheets;
    const sheetDefinitions = [
      { key: "summary" as const, name: "Resume", rows: summaryRows, widths: [34, 22] },
      { key: "contracts" as const, name: "Contrats", rows: contractsRows, widths: [16, 24, 16, 14, 14, 18] },
      { key: "payments" as const, name: "Paiements", rows: paymentsRows, widths: [14, 14, 24, 14, 14, 16] },
      { key: "expenses" as const, name: "Depenses", rows: expensesRows, widths: [14, 20, 40, 14] },
      { key: "alerts" as const, name: "Alertes", rows: alertsRows, widths: [12, 24, 46] },
    ].filter((sheet) => selectedSheets[sheet.key]);

    if (sheetDefinitions.length === 0) {
      throw new Error("Aucune feuille Excel sélectionnée");
    }

    const workbookSheetsXml = sheetDefinitions
      .map((sheet, index) => `<sheet name="${sheet.name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
      .join("");

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${workbookSheetsXml}</sheets>
</workbook>`;

    const workbookRelsParts = sheetDefinitions
      .map((sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`)
      .join("");

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRelsParts}
  <Relationship Id="rId${sheetDefinitions.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
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

    const worksheetsContentTypes = sheetDefinitions
      .map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
      .join("");

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${worksheetsContentTypes}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

    const zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypesXml);
    zip.folder("_rels")?.file(".rels", rootRelsXml);
    zip.folder("xl")?.file("workbook.xml", workbookXml);
    zip.folder("xl")?.file("styles.xml", stylesXml);
    zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", workbookRelsXml);
    sheetDefinitions.forEach((sheet, index) => {
      zip.folder("xl")?.folder("worksheets")?.file(`sheet${index + 1}.xml`, buildSheetXml(sheet.rows, sheet.widths));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const finalFilename = `${resolveBaseFilename()}.xlsx`;
    downloadBlob(blob, finalFilename);
  };

  const generateExcel = async (options?: ExportOptions) => {
    setIsExportingExcel(true);
    try {
      if (type === "revenue") {
        await generateRevenueExcel(options);
      } else {
        throw new Error("Excel export non pris en charge pour ce type");
      }
      toast({
        title: "Export réussi",
        description: `Le fichier Excel "${resolveBaseFilename()}.xlsx" a été téléchargé`,
        variant: "default"
      });
    } catch (error) {
      console.error("Erreur lors de l'export Excel:", error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du fichier Excel",
        variant: "destructive"
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const generateReportsPDF = async (pdf: jsPDF, reportData: RevenueExportData, yPosition: number) => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("RAPPORT FINANCIER", 20, yPosition);
    yPosition += 20;

    // Statistics summary
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("RÉSUMÉ FINANCIER:", 20, yPosition);
    yPosition += 10;

    const stats = [
      ["Total Encaissé:", `${reportData.stats?.totalEncaisse?.toLocaleString() || 0} DH`],
      ["Total Dettes:", `${reportData.stats?.totalDettes?.toLocaleString() || 0} DH`],
      ["Total Soldé:", `${reportData.stats?.totalSolde?.toLocaleString() || 0} DH`],
      ["Total Espèces:", `${reportData.stats?.totalEspeces?.toLocaleString() || 0} DH`],
      ["Total Chèques:", `${reportData.stats?.totalCheques?.toLocaleString() || 0} DH`],
      ["Compte Banque:", `${reportData.stats?.bankBalance?.toLocaleString() || 0} DH`]
    ];

    stats.forEach(([label, value]) => {
      pdf.text(label, 30, yPosition);
      pdf.text(value, 120, yPosition);
      yPosition += 8;
    });

    // Payment distribution
    yPosition += 10;
    pdf.text("RÉPARTITION DES PAIEMENTS:", 20, yPosition);
    yPosition += 10;

    if (reportData.pieChartData && reportData.pieChartData.length > 0) {
      reportData.pieChartData.forEach((item) => {
        const percentage = reportData.stats?.totalEncaisse ? ((item.value / reportData.stats.totalEncaisse) * 100).toFixed(1) : "0.0";
        pdf.text(`${item.name}: ${item.value.toLocaleString()} DH (${percentage}%)`, 30, yPosition);
        yPosition += 8;
      });
    }

    if (reportData.bankTransfers && reportData.bankTransfers.length > 0) {
      yPosition += 10;
      pdf.text("HISTORIQUE DES TRANSFERTS BANCAIRES:", 20, yPosition);
      yPosition += 10;

      reportData.bankTransfers.forEach((transfer) => {
        pdf.text(`${new Date(transfer.date).toLocaleDateString('fr-FR')} - ${transfer.type === 'cash' ? 'Espèces' : 'Chèque'}`, 30, yPosition);
        pdf.text(`${transfer.amount.toLocaleString()} DH (Frais: ${(transfer.fees || 0).toLocaleString()} DH)`, 120, yPosition);
        yPosition += 8;
      });
    }
  };

  const generateRevenuePDF = async (pdf: jsPDF, revenueData: RevenueExportData, yPosition: number) => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("GESTION DES RECETTES", 20, yPosition);
    yPosition += 20;

    // Tableau récapitulatif
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("TABLEAU RÉCAPITULATIF:", 20, yPosition);
    yPosition += 15;

    // Table headers
    pdf.setFont("helvetica", "bold");
    const headers = ["Contrat", "Locataire", "Total", "Avance", "Reste", "Statut"];
    let xPositions = [20, 60, 100, 130, 160, 190];
    
    headers.forEach((header, index) => {
      pdf.text(header, xPositions[index], yPosition);
    });
    yPosition += 10;

    // Table content
    pdf.setFont("helvetica", "normal");
    if (revenueData.contractsWithDebts && revenueData.contractsWithDebts.length > 0) {
      revenueData.contractsWithDebts.forEach((contract) => {
        const row = [
          contract.contract_number || 'N/A',
          contract.customer_name || 'N/A',
          `${(contract.total_amount || 0).toLocaleString()}`,
          `${(contract.advance_payment || 0).toLocaleString()}`,
          `${contract.remaining_amount.toLocaleString()}`,
          contract.financial_status?.label || 'N/A'
        ];
        
        row.forEach((cell, index) => {
          pdf.text(cell, xPositions[index], yPosition);
        });
        yPosition += 8;

        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
      });
    }
  };

  const generateContractPDF = async (pdf: jsPDF, contractData: Record<string, unknown>, yPosition: number) => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`CONTRAT ${String(contractData.contract_number || 'N/A')}`, 20, yPosition);
    yPosition += 20;

    // Contract details
    const details = [
      ["Client:", String(contractData.customer_name || 'N/A')],
      ["Email:", String(contractData.customer_email || 'N/A')],
      ["Téléphone:", String(contractData.customer_phone || 'N/A')],
      ["Date début:", contractData.start_date ? new Date(String(contractData.start_date)).toLocaleDateString('fr-FR') : 'N/A'],
      ["Date fin:", contractData.end_date ? new Date(String(contractData.end_date)).toLocaleDateString('fr-FR') : 'N/A'],
      ["Véhicule:", 'N/A'],
      ["Prix journalier:", `${Number(contractData.daily_rate || 0).toLocaleString()} DH`],
      ["Montant total:", `${Number(contractData.total_amount || 0).toLocaleString()} DH`],
      ["Avance payée:", `${Number(contractData.advance_payment || 0).toLocaleString()} DH`],
      ["Reste à payer:", `${(Number(contractData.total_amount || 0) - Number(contractData.advance_payment || 0)).toLocaleString()} DH`]
    ];

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    details.forEach(([label, value]) => {
      pdf.text(label, 20, yPosition);
      pdf.text(value, 100, yPosition);
      yPosition += 10;
    });

    if (contractData.notes) {
      yPosition += 10;
      pdf.text("NOTES:", 20, yPosition);
      yPosition += 10;
      pdf.text(String(contractData.notes), 20, yPosition, { maxWidth: 170 });
    }
  };

  const generateInvoicePDF = async (pdf: jsPDF, invoiceData: Record<string, unknown>, yPosition: number) => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`FACTURE ${String(invoiceData.invoice_number || 'N/A')}`, 20, yPosition);
    yPosition += 20;

    // Invoice details similar to contract but with invoice-specific fields
    const details = [
      ["Client:", String(invoiceData.customer_name || 'N/A')],
      ["ICE:", String(invoiceData.customer_ice || 'N/A')],
      ["Date facture:", invoiceData.invoice_date ? new Date(String(invoiceData.invoice_date)).toLocaleDateString('fr-FR') : 'N/A'],
      ["Date échéance:", invoiceData.due_date ? new Date(String(invoiceData.due_date)).toLocaleDateString('fr-FR') : 'N/A'],
      ["Montant HT:", `${Number(invoiceData.subtotal_ht || 0).toLocaleString()} DH`],
      ["TVA:", `${Number(invoiceData.tax_amount || 0).toLocaleString()} DH`],
      ["Montant TTC:", `${Number(invoiceData.total_ttc || 0).toLocaleString()} DH`],
      ["Mode paiement:", String(invoiceData.payment_method || 'N/A')],
      ["Statut:", String(invoiceData.status || 'N/A')]
    ];

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    details.forEach(([label, value]) => {
      pdf.text(label, 20, yPosition);
      pdf.text(value, 100, yPosition);
      yPosition += 10;
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled || isExporting}
            className={`flex items-center gap-2 ${className}`}
            variant="outline"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isExporting ? "Export..." : "Exporter"}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => generatePDF()} disabled={isExporting}>
            <FileText className="w-4 h-4 mr-2" />
            PDF rapide
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateExcel()} disabled={isExporting}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel rapide
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsAdvancedOpen(true)} disabled={isExporting}>
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Export avancé
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Paramètres d'export avancé</DialogTitle>
            <DialogDescription>
              Définissez la période, les feuilles Excel et le niveau de confidentialité.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-start-date">Date début</Label>
              <Input
                id="export-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-end-date">Date fin</Label>
              <Input
                id="export-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="include-sensitive-data"
                checked={includeSensitiveData}
                onCheckedChange={(checked) => setIncludeSensitiveData(Boolean(checked))}
              />
              <Label htmlFor="include-sensitive-data">Inclure les données sensibles (noms, références)</Label>
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Feuilles à inclure dans Excel</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sheet-summary"
                  checked={excelSheets.summary}
                  onCheckedChange={(checked) => setExcelSheets((prev) => ({ ...prev, summary: Boolean(checked) }))}
                />
                <Label htmlFor="sheet-summary">Résumé</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sheet-contracts"
                  checked={excelSheets.contracts}
                  onCheckedChange={(checked) => setExcelSheets((prev) => ({ ...prev, contracts: Boolean(checked) }))}
                />
                <Label htmlFor="sheet-contracts">Contrats</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sheet-payments"
                  checked={excelSheets.payments}
                  onCheckedChange={(checked) => setExcelSheets((prev) => ({ ...prev, payments: Boolean(checked) }))}
                />
                <Label htmlFor="sheet-payments">Paiements</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sheet-expenses"
                  checked={excelSheets.expenses}
                  onCheckedChange={(checked) => setExcelSheets((prev) => ({ ...prev, expenses: Boolean(checked) }))}
                />
                <Label htmlFor="sheet-expenses">Dépenses</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sheet-alerts"
                  checked={excelSheets.alerts}
                  onCheckedChange={(checked) => setExcelSheets((prev) => ({ ...prev, alerts: Boolean(checked) }))}
                />
                <Label htmlFor="sheet-alerts">Alertes</Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (startDate && endDate && startDate > endDate) {
                  toast({
                    title: "Plage invalide",
                    description: "La date de début doit être antérieure à la date de fin",
                    variant: "destructive"
                  });
                  return;
                }
                setIsAdvancedOpen(false);
                generatePDF(buildExportOptions());
              }}
              disabled={isExporting}
            >
              <FileText className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
            <Button
              onClick={() => {
                if (startDate && endDate && startDate > endDate) {
                  toast({
                    title: "Plage invalide",
                    description: "La date de début doit être antérieure à la date de fin",
                    variant: "destructive"
                  });
                  return;
                }
                if (!Object.values(excelSheets).some(Boolean)) {
                  toast({
                    title: "Aucune feuille",
                    description: "Sélectionnez au moins une feuille pour l'export Excel",
                    variant: "destructive"
                  });
                  return;
                }
                setIsAdvancedOpen(false);
                generateExcel(buildExportOptions());
              }}
              disabled={isExporting}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exporter Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
