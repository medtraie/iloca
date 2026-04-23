import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, RefreshCw, Send, DollarSign, Wallet, Building2, Repeat2 } from "lucide-react";
import MiscellaneousExpenseDialog from "@/components/MiscellaneousExpenseDialog";
import { BankTransferDialog } from "@/components/BankTransferDialog";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { getCompanyDisplayName, getCompanyContactLines, getCompanySlug, getCompanyLogoImage } from "@/utils/companyInfo";

interface TreasuryActionsProps {
  onRefresh: () => void;
}

export const TreasuryActions = ({ onRefresh }: TreasuryActionsProps) => {
  const [cashBalance] = useLocalStorage<number>("cashBalance", 0);
  const [bankAccount] = useLocalStorage<number>("bankAccount", 0);
  const [bankTransfers] = useLocalStorage<any[]>("bankTransfers", []);
  const recentTransfers = bankTransfers.slice(0, 5);

  const generateMonthlyReport = () => {
    const doc = new jsPDF();
    
    // Header
    const logoInfo = getCompanyLogoImage();
    if (logoInfo) {
      try {
        doc.addImage(logoInfo.data, logoInfo.format, 14, 6, 18, 18);
      } catch {}
    }
    doc.setFontSize(20);
    doc.text("Rapport Mensuel de Trésorerie", 14, 20);
    
    doc.setFontSize(12);
    const companyName = getCompanyDisplayName();
    doc.text(companyName, 14, 28);
    const { addressLine, phoneFaxLine, gsmLine, emailLine } = getCompanyContactLines();
    let contactsY = 34;
    doc.setFontSize(9);
    doc.text(addressLine, 14, contactsY);
    contactsY += 6;
    if (phoneFaxLine) {
      doc.text(phoneFaxLine, 14, contactsY);
      contactsY += 6;
    }
    if (gsmLine) {
      doc.text(gsmLine, 14, contactsY);
      contactsY += 6;
    }
    if (emailLine) {
      doc.text(emailLine, 14, contactsY);
      contactsY += 6;
    }
    doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 14, 35);
    
    // Summary
    doc.setFontSize(14);
    doc.text("Résumé", 14, 50);
    
    const summaryData = [
      ['Solde Banque', `${bankAccount.toLocaleString()} DH`],
      ['Solde Espèces', `${cashBalance.toLocaleString()} DH`],
      ['Total Disponible', `${(bankAccount + cashBalance).toLocaleString()} DH`]
    ];

    autoTable(doc, {
      startY: 55,
      head: [['Catégorie', 'Montant']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Recent transfers
    if (bankTransfers.length > 0) {
      doc.setFontSize(14);
      doc.text("Derniers Transferts", 14, (doc as any).lastAutoTable.finalY + 15);
      
      const transferData = bankTransfers.slice(0, 10).map(t => [
        format(new Date(t.date), 'dd/MM/yyyy'),
        t.type === 'cash' ? 'Espèces → Banque' : t.type === 'check' ? 'Chèque → Banque' : 'Banque → Espèces',
        `${t.amount.toLocaleString()} DH`,
        `${(t.netAmount ?? t.amount).toLocaleString()} DH`
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Type', 'Montant', 'Net']],
        body: transferData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
      });
    }

    doc.save(`${getCompanySlug()}-rapport-tresorerie-${format(new Date(), 'yyyy-MM')}.pdf`);
  };

  return (
    <Card className="border bg-card/95 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5" />
          Actions Rapides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-blue-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Solde Banque</p>
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-blue-700">{bankAccount.toLocaleString()} DH</p>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Solde Espèces</p>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-emerald-700">{cashBalance.toLocaleString()} DH</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Transferts récents</p>
              <Repeat2 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">{recentTransfers.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MiscellaneousExpenseDialog
            trigger={
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Dépense
              </Button>
            }
          />

          <BankTransferDialog
            totalCash={cashBalance}
            totalChecks={0}
            bankBalance={bankAccount}
            onTransfer={() => {}}
          >
            <Button className="w-full" variant="outline">
              <Send className="w-4 h-4 mr-2" />
              Nouveau Transfert
            </Button>
          </BankTransferDialog>

          <Button
            onClick={generateMonthlyReport}
            className="w-full"
            variant="default"
          >
            <Download className="w-4 h-4 mr-2" />
            Rapport PDF
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground">
            Gardez les soldes à jour après chaque opération pour une prévision précise.
          </p>
          <Button
            onClick={onRefresh}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser les données
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
