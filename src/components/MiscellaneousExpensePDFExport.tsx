import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { MiscellaneousExpense, EXPENSE_TYPES } from "@/hooks/useMiscellaneousExpenses";
import { DateRange } from "react-day-picker";
import { getCompanyDisplayName, getCompanyContactLines, getCompanySlug, getCompanyLogoImage } from "@/utils/companyInfo";

// Import jspdf-autotable for better table formatting
import "jspdf-autotable";

interface MiscellaneousExpensePDFExportProps {
  expenses: MiscellaneousExpense[];
}

type PeriodFilter = 'today' | 'month' | 'year' | 'custom';

const MiscellaneousExpensePDFExport = ({ expenses }: MiscellaneousExpensePDFExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { toast } = useToast();

  const getFilteredExpenses = () => {
    if (periodFilter === "custom" && !customDateRange?.from) {
      return expenses;
    }

    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (periodFilter) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case "month":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "year":
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case "custom":
        if (!customDateRange?.from) return expenses;
        startDate = customDateRange.from;
        endDate = customDateRange.to || customDateRange.from;
        break;
      default:
        return expenses;
    }

    return expenses.filter(expense => {
      const expenseDate = parseISO(expense.expense_date);
      return isWithinInterval(expenseDate, { start: startDate, end: endDate });
    });
  };

  const getPeriodTitle = () => {
    const now = new Date();
    switch (periodFilter) {
      case "today":
        return `Aujourd'hui - ${format(now, "dd/MM/yyyy", { locale: fr })}`;
      case "month":
        return `${format(now, "MMMM yyyy", { locale: fr })}`;
      case "year":
        return `${format(now, "yyyy", { locale: fr })}`;
      case "custom":
        if (customDateRange?.from) {
          const to = customDateRange.to || customDateRange.from;
          return `Du ${format(customDateRange.from, "dd/MM/yyyy")} au ${format(to, "dd/MM/yyyy")}`;
        }
        return "Période personnalisée";
      default:
        return "Toutes les données";
    }
  };

  const generateSummaryData = (filteredExpenses: MiscellaneousExpense[]) => {
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Totaux par mode de paiement
    const paymentMethodTotals = filteredExpenses.reduce((acc, exp) => {
      acc[exp.payment_method] = (acc[exp.payment_method] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    // Totaux par catégorie
    const categoryTotals = filteredExpenses.reduce((acc, exp) => {
      const category = exp.custom_expense_type || exp.expense_type;
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAmount,
      paymentMethodTotals,
      categoryTotals
    };
  };

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      const filteredExpenses = getFilteredExpenses();
      const summaryData = generateSummaryData(filteredExpenses);
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      const logoInfo = getCompanyLogoImage();
      if (logoInfo) {
        try {
          pdf.addImage(logoInfo.data, logoInfo.format, 14, 8, 18, 18);
        } catch {}
      }
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      const companyName = getCompanyDisplayName();
      pdf.text(`${companyName} - Rapport des Dépenses Diverses`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 8;
      const { addressLine, phoneFaxLine, gsmLine, emailLine } = getCompanyContactLines();
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(addressLine, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 6;
      if (phoneFaxLine) {
        pdf.text(phoneFaxLine, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
      }
      if (gsmLine) {
        pdf.text(gsmLine, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
      }
      if (emailLine) {
        pdf.text(emailLine, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 6;
      }
      yPosition += 3;

      // Period
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Période: ${getPeriodTitle()}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      // Date of generation
      pdf.setFontSize(10);
      pdf.text(`Généré le: ${format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}`, pageWidth - 20, yPosition, { align: "right" });
      yPosition += 25;

      // Summary section
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("RÉCAPITULATIF GÉNÉRAL", 20, yPosition);
      yPosition += 15;

      // Total amount
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(220, 38, 127); // Red color for expenses
      pdf.text(`Total des dépenses: ${summaryData.totalAmount.toLocaleString()} MAD`, 20, yPosition);
      pdf.setTextColor(0, 0, 0); // Reset to black
      yPosition += 20;

      // Payment method totals
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Répartition par mode de paiement:", 20, yPosition);
      yPosition += 10;

      pdf.setFont("helvetica", "normal");
      Object.entries(summaryData.paymentMethodTotals).forEach(([method, amount]) => {
        pdf.text(`• ${method}: ${amount.toLocaleString()} MAD`, 30, yPosition);
        yPosition += 8;
      });
      yPosition += 10;

      // Category totals
      pdf.setFont("helvetica", "bold");
      pdf.text("Répartition par catégorie:", 20, yPosition);
      yPosition += 10;

      pdf.setFont("helvetica", "normal");
      Object.entries(summaryData.categoryTotals).forEach(([category, amount]) => {
        pdf.text(`• ${category}: ${amount.toLocaleString()} MAD`, 30, yPosition);
        yPosition += 8;
        
        // Check if we need a new page
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 20;
        }
      });
      yPosition += 20;

      // Detailed table
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("LISTE DÉTAILLÉE DES DÉPENSES", 20, yPosition);
      yPosition += 15;

      // Prepare table data
      const tableHeaders = ['Date', 'Type', 'Montant (MAD)', 'Mode', 'Note'];
      const tableData = filteredExpenses.map(expense => [
        format(parseISO(expense.expense_date), "dd/MM/yyyy", { locale: fr }),
        expense.custom_expense_type || expense.expense_type,
        expense.amount.toLocaleString(),
        expense.payment_method,
        expense.notes || '-'
      ]);

      // Generate table using autoTable
      (pdf as any).autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: yPosition,
        theme: 'striped',
        headStyles: {
          fillColor: [220, 38, 127], // Red theme color
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Date
          1: { cellWidth: 40 }, // Type
          2: { cellWidth: 30, halign: 'right' }, // Amount
          3: { cellWidth: 25 }, // Mode
          4: { cellWidth: 50 } // Note
        },
        margin: { left: 20, right: 20 },
      });

      // Charts section (simplified representation)
      const finalY = (pdf as any).lastAutoTable.finalY || yPosition + 50;
      
      if (finalY > pageHeight - 80) {
        pdf.addPage();
        yPosition = 20;
      } else {
        yPosition = finalY + 20;
      }

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("ANALYSE GRAPHIQUE", 20, yPosition);
      yPosition += 15;

      // Chart descriptions (since we can't easily embed actual charts)
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Répartition par catégorie (%)", 20, yPosition);
      yPosition += 10;

      pdf.setFont("helvetica", "normal");
      Object.entries(summaryData.categoryTotals).forEach(([category, amount]) => {
        const percentage = ((amount / summaryData.totalAmount) * 100).toFixed(1);
        pdf.text(`• ${category}: ${percentage}%`, 30, yPosition);
        yPosition += 8;
      });
      yPosition += 10;

      pdf.setFont("helvetica", "bold");
      pdf.text("Répartition par mode de paiement (%)", 20, yPosition);  
      yPosition += 10;

      pdf.setFont("helvetica", "normal");
      Object.entries(summaryData.paymentMethodTotals).forEach(([method, amount]) => {
        const percentage = ((amount / summaryData.totalAmount) * 100).toFixed(1);
        pdf.text(`• ${method}: ${percentage}%`, 30, yPosition);
        yPosition += 8;
      });

      // Footer
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "italic");
      pdf.text(`Document généré automatiquement par ${companyName}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      // Save PDF
      const filename = `${getCompanySlug()}-depenses-diverses-${getPeriodTitle().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      pdf.save(filename);

      toast({
        title: "Export réussi",
        description: `Le rapport PDF "${filename}" a été téléchargé`,
        variant: "default"
      });

      setIsOpen(false);

    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de la génération du PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredExpenses = getFilteredExpenses();
  const summaryData = generateSummaryData(filteredExpenses);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Télécharger en PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export PDF - Dépenses Diverses
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sélection de la période</h3>
            
            <div className="flex flex-wrap gap-4">
              <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choisir une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Période personnalisée</SelectItem>
                </SelectContent>
              </Select>

              {periodFilter === "custom" && (
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[240px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          `${format(customDateRange.from, "dd/MM/yy")} - ${format(customDateRange.to, "dd/MM/yy")}`
                        ) : (
                          format(customDateRange.from, "dd/MM/yyyy")
                        )
                      ) : (
                        "Choisir une période"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={customDateRange}
                      onSelect={(range) => {
                        setCustomDateRange(range);
                        if (range?.from && range?.to) {
                          setShowDatePicker(false);
                        }
                      }}
                      numberOfMonths={2}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <Badge variant="outline" className="text-sm">
              Période sélectionnée: {getPeriodTitle()}
            </Badge>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Aperçu des données</span>
                <Badge variant="secondary">{filteredExpenses.length} dépense(s)</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total des dépenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    {summaryData.totalAmount.toLocaleString()} MAD
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Catégories</p>
                  <p className="text-lg font-semibold">
                    {Object.keys(summaryData.categoryTotals).length}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Répartition par mode de paiement:</p>
                {Object.entries(summaryData.paymentMethodTotals).map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span>{method}:</span>
                    <span className="font-medium">{amount.toLocaleString()} MAD</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={generatePDF} 
              disabled={isExporting || filteredExpenses.length === 0}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {isExporting ? 'Génération...' : 'Générer le PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MiscellaneousExpensePDFExport;
