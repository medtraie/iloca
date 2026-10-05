
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, FileText, Calendar, DollarSign, User, Car, Download, CreditCard, UserCheck, Share2, MoreHorizontal, AlertTriangle, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Contract } from "@/hooks/useContracts";
import { computeContractSummary, getContractSummaryWithPayments } from "@/utils/contractMath";
import type { PaymentSummary } from "@/types/payment";
import { EnhancedTable } from "@/components/enhanced/EnhancedTable";
import { parseISO, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { downloadContractPackage } from "@/utils/downloadContractPackage";
import jsPDF from "jspdf";
import { getCompanyDisplayName, getCompanySlug } from "@/utils/companyInfo";
import { usePDFGeneration } from "@/hooks/usePDFGeneration";
import type { ContractPDFData } from "@/hooks/usePDFGeneration";

interface ContractsTableProps {
  contracts: Contract[];
  onViewDetails: (contract: Contract) => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contractId: string) => void;
  onSendForSignature: (contract: Contract) => void;
  signatureLoading: Record<string, boolean>;
  getPaymentSummary?: (contractId: string) => PaymentSummary;
}

// ContractsTable component (partial updates)
function ContractsTable({
  contracts,
  onViewDetails,
  onEditContract,
  onDeleteContract,
  onSendForSignature,
  signatureLoading,
  getPaymentSummary,
}: ContractsTableProps) {
  const { toast } = useToast();
  const { generatePDF, generatePDFBlob } = usePDFGeneration();

  // تحميل الـPDF المفصل نفسه الخاص بزر "Créer le Contrat (Ouvert)"
  const handleDownloadFullPDF = async (contract: Contract) => {
    const pdfData = buildPdfDataFromContract(contract);
    await generatePDF(pdfData, `Contrat_${contract.contract_number}.pdf`);
  };

  // Partage WhatsApp avec PDF complet (à l'intérieur du composant)
  const handleShareWhatsAppFull = async (contract: Contract) => {
    try {
      const pdfData: ContractPDFData = buildPdfDataFromContract(contract);
      const blob = await generatePDFBlob(pdfData);
      if (!blob) {
        toast({
          title: "Partage WhatsApp échoué",
          description: "Impossible de générer le PDF.",
          variant: "destructive",
        });
        return;
      }

      const fileName = `Contrat-${pdfData.contractNumber}.pdf`;
      const file = new File([blob], fileName, { type: "application/pdf" });

      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navAny.share({
          files: [file],
          title: "Contrat de Location",
          text: "Veuillez trouver le contrat de location en pièce jointe.",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const companyName = getCompanyDisplayName();
        const text = encodeURIComponent(`Contrat ${companyName} ${pdfData.contractNumber}\n${url}`);
        const phone = (contract.customer_phone || "").replace(/[^\d]/g, "");
        const base = phone ? `https://wa.me/${phone}` : "https://api.whatsapp.com/send";
        window.open(`${base}?text=${text}`, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);

        toast({
          title: "Lien de téléchargement créé",
          description: "Attachez le PDF manuellement dans WhatsApp.",
        });
      }
    } catch (e) {
      console.error("WhatsApp share failed:", e);
      toast({
        title: "Partage WhatsApp échoué",
        description: "Impossible de partager le PDF via WhatsApp. Réessayez.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ouvert: { label: "Ouvert", color: "bg-card-orange-bg text-card-orange border-card-orange/20" },
      ferme: { label: "Fermé", color: "bg-card-green-bg text-card-green border-card-green/20" },
      completed: { label: "Fermé", color: "bg-card-green-bg text-card-green border-card-green/20" },
      draft: { label: "Brouillon", color: "bg-muted text-muted-foreground border-border" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge className={`${config.color} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const getFinancialStatusBadge = (contract: Contract) => {
    let summary;
    
    if (getPaymentSummary) {
      // Use centralized payment-based logic
      const contracts = [contract]; // Minimal array for compatibility
      summary = getContractSummaryWithPayments(contract.id, contracts);
    } else {
      // Use centralized logic without payments
      summary = computeContractSummary(contract, { advanceMode: 'field' });
    }
    
    // Map status to badge color
    const getStatusColor = (statut: string) => {
      switch (statut) {
        case 'payé': return 'text-card-green bg-card-green-bg border-card-green/20';
        case 'en cours': return 'text-card-orange bg-card-orange-bg border-card-orange/20';
        case 'en attente': return 'text-card-orange bg-card-orange-bg border-card-orange/20';
        default: return 'text-muted-foreground bg-muted border-border';
      }
    };
    
    return (
      <Badge 
        className={`${getStatusColor(summary?.statut || 'en attente')} font-medium`}
        title={`Total: ${summary?.total || 0} MAD, Avance: ${summary?.avance || 0} MAD, Reste: ${summary?.reste || 0} MAD`}
      >
        {summary?.statut || 'En attente'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} MAD`;
  };

  // Fonction pour calculer les dates effectives avec prolongation
  const getEffectiveDates = (contract: Contract) => {
    try {
      const startDate = parseISO(contract.start_date);
      let endDate = parseISO(contract.end_date);
      
      // Vérifier les prolongations
      const extensionUntil = contract.contract_data?.extensionUntil || contract.prolongationAu || (contract as any).extensionUntil;
      const extendedDays = contract.contract_data?.extendedDays || contract.nombreDeJourProlonge || (contract as any).extendedDays;
      
      if (extensionUntil && extensionUntil !== "") {
        endDate = parseISO(extensionUntil);
      } else if (extendedDays && parseInt(extendedDays.toString()) > 0) {
        endDate = new Date(parseISO(contract.end_date));
        endDate.setDate(endDate.getDate() + parseInt(extendedDays.toString()));
      }
      
      return { startDate, endDate };
    } catch (error) {
      return { 
        startDate: new Date(contract.start_date), 
        endDate: new Date(contract.end_date) 
      };
    }
  };

  // Fonction pour calculer le montant effectif avec la logique centralisée
  const getEffectiveAmount = (contract: Contract) => {
    const summary = computeContractSummary(contract, { advanceMode: 'field' });
    return summary.total;
  };

  const columns = [
    {
      key: 'contract_number',
      label: 'N° Contrat',
      sortable: true,
      className: 'w-[110px]',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary font-black text-xs font-mono shrink-0">
            #{contract.contract_number}
          </div>
        </div>
      )
    },
    {
      key: 'customer_name',
      label: 'Locataire (Client)',
      sortable: true,
      className: 'min-w-[210px]',
      render: (contract: Contract) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/60 text-muted-foreground shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="flex flex-col justify-center py-0.5">
            <span className="font-black text-sm text-foreground tracking-tight leading-snug">
              {contract.customer_name}
            </span>
            {contract.customer_phone && (
              <span className="text-[11px] font-mono text-muted-foreground font-semibold leading-none mt-1">
                {contract.customer_phone}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'vehicle',
      label: 'Véhicule',
      sortable: true,
      className: 'min-w-[170px]',
      render: (contract: Contract) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Car className="h-4 w-4" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm text-foreground leading-tight">
              {contract.vehicle}
            </span>
            {contract.contract_data?.vehicleRegistration && (
              <Badge variant="outline" className="text-[10px] font-mono font-bold w-fit mt-1 py-0 px-1.5 border-border/60">
                {contract.contract_data.vehicleRegistration}
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Période & Durée',
      sortable: true,
      className: 'min-w-[220px]',
      render: (contract: Contract) => {
        const { startDate, endDate } = getEffectiveDates(contract);
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        const extensionDays = summary.extensionDays || 0;
        const overdueDays = summary.overdueDays || 0;
        const baseDuration = summary.baseDuration || summary.duration;

        return (
          <div className="space-y-1 py-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{format(startDate, 'dd/MM/yyyy', { locale: fr })}</span>
              <span className="text-muted-foreground font-normal">→</span>
              <span>{format(endDate, 'dd/MM/yyyy', { locale: fr })}</span>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="secondary" className="text-[10px] font-bold py-0.5 px-2 bg-muted/60">
                {baseDuration} jour{baseDuration > 1 ? 's' : ''}
              </Badge>

              {extensionDays > 0 && (
                <Badge className="text-[10px] font-bold py-0.5 px-2 bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                  + {extensionDays}j Prolongé
                </Badge>
              )}

              {overdueDays > 0 && contract.status === 'ouvert' && (
                <Badge className="text-[10px] font-black py-0.5 px-2 bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 animate-pulse">
                  ⚠️ Retard {overdueDays}j
                </Badge>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Prix / Jour & Total',
      sortable: true,
      className: 'min-w-[150px]',
      render: (contract: Contract) => {
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        
        return (
          <div className="flex flex-col justify-center py-0.5">
            <div className="text-xs font-semibold text-muted-foreground">
              {formatCurrency(contract.daily_rate || 0)} <span className="text-[10px]">/ jour</span>
            </div>
            <div className="text-sm font-black text-foreground font-mono mt-0.5">
              {formatCurrency(summary.total)}
            </div>
          </div>
        );
      }
    },
    {
      key: 'payment_info',
      label: 'Avance & Solde',
      sortable: false,
      className: 'min-w-[180px]',
      render: (contract: Contract) => {
        let totalPaid = contract.advance_payment || 0;
        let remaining = 0;
        
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        
        if (getPaymentSummary) {
          const paymentSummary = getPaymentSummary(contract.id);
          totalPaid = paymentSummary.totalPaid;
          remaining = paymentSummary.remainingAmount;
        } else {
          remaining = Math.max(0, summary.total - totalPaid);
        }

        const isFullyPaid = remaining <= 0;
        
        return (
          <div className="space-y-1 py-0.5">
            <div className="flex items-center justify-between text-xs gap-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Payé:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaid)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs gap-3">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Reste:</span>
              <span className={`font-black font-mono ${remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                {formatCurrency(remaining)}
              </span>
            </div>

            <Badge 
              className={`text-[10px] font-bold py-0.5 px-2 border w-fit ${
                isFullyPaid 
                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" 
                  : totalPaid > 0 
                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30" 
                  : "bg-red-500/15 text-red-600 border-red-500/30"
              }`}
            >
              {isFullyPaid ? "Soldé" : totalPaid > 0 ? "En cours" : "Non payé"}
            </Badge>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      className: 'w-[120px]',
      render: (contract: Contract) => getStatusBadge(contract.status)
    }
  ];

  const handleDownloadDocument = (contract: Contract, docType: 'cin' | 'permis') => {
    const contractData = contract.contract_data || {};
    const customerData = contractData.customer || {};
    
    let documentUrl = '';
    let filename = '';
    
    if (docType === 'cin') {
      documentUrl = customerData.cin_document || '';
      filename = `CIN_${contract.customer_name || 'inconnu'}_${contract.contract_number || contract.id}.pdf`;
    } else if (docType === 'permis') {
      documentUrl = customerData.permis_document || '';
      filename = `Permis_${contract.customer_name || 'inconnu'}_${contract.contract_number || contract.id}.pdf`;
    }
    
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Document ${docType.toUpperCase()} non disponible pour ce contrat.`);
    }
  };

  const handleDownloadPackage = async (contract: Contract) => {
    try {
      toast({
        title: "Préparation du téléchargement...",
        description: "Création du package des documents d'identité",
      });

      const contractData = contract.contract_data || {};
      const customerData = contractData.customer || {};

      // Check if required documents exist (CIN and Permis are mandatory)
      const hasCin = customerData.cin_image_url;
      const hasPermis = customerData.permis_image_url;

      // CIN and Permis are mandatory, Passeport is optional
      if (!hasCin || !hasPermis) {
        const missingDocs = [];
        if (!hasCin) missingDocs.push("CIN");
        if (!hasPermis) missingDocs.push("Permis");
        
        toast({
          title: "⚠️ Documents obligatoires manquants",
          description: `Les documents suivants sont requis: ${missingDocs.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      await downloadContractPackage({
        contractNumber: contract.contract_number || contract.id,
        customerName: contract.customer_name || 'Client',
        cinImageUrl: customerData.cin_image_url || '',
        permisImageUrl: customerData.permis_image_url || '',
        passeportImageUrl: customerData.passeport_image_url || '',
      });

      toast({
        title: "✅ Téléchargement réussi",
        description: "Les documents d'identité ont été téléchargés avec succès.",
      });
    } catch (error) {
      console.error('Error downloading package:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible de télécharger les documents.",
        variant: "destructive",
      });
    }
  };

  // Modernized 2026 Action Group
  const renderActions = (contract: Contract) => (
    <div className="flex items-center gap-1.5 justify-end">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(contract)}
        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-xl"
        title="Voir les détails"
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadFullPDF(contract)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 rounded-xl"
        title="Télécharger Contrat (Complet PDF)"
      >
        <FileText className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleShareWhatsAppFull(contract)}
        className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl"
        title="Partager via WhatsApp (PDF)"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditContract(contract)}
        className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 rounded-xl"
        title="Modifier"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted rounded-xl"
            title="Plus d'actions"
          >
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl">
          <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground px-2 py-1">
            Documents & Options
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleDownloadDocument(contract, 'cin')}
            className="rounded-xl text-xs font-bold cursor-pointer gap-2 py-2"
          >
            <CreditCard className="h-4 w-4 text-purple-600" />
            <span>Télécharger CIN</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDownloadDocument(contract, 'permis')}
            className="rounded-xl text-xs font-bold cursor-pointer gap-2 py-2"
          >
            <UserCheck className="h-4 w-4 text-indigo-600" />
            <span>Télécharger Permis</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDownloadPackage(contract)}
            className="rounded-xl text-xs font-bold cursor-pointer gap-2 py-2"
          >
            <Download className="h-4 w-4 text-teal-600" />
            <span>Package ZIP d'Identité</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-1" />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer">
                <Trash2 className="h-4 w-4" />
                <span>Supprimer le contrat</span>
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-black">Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription className="text-xs font-medium">
                  Êtes-vous sûr de vouloir supprimer le contrat #{contract.contract_number} ? 
                  Cette action est irréversible et supprimera toutes les données associées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl text-xs font-bold">Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDeleteContract(contract.id)}
                  className="bg-destructive hover:bg-destructive/90 rounded-xl text-xs font-black text-destructive-foreground"
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <EnhancedTable
      data={contracts}
      columns={columns}
      title="Liste des contrats"
      description={`${contracts.length} contrat${contracts.length > 1 ? 's' : ''} au total`}
      searchPlaceholder="Rechercher par client, véhicule, numéro..."
      actions={renderActions}
      emptyMessage="Aucun contrat trouvé. Commencez par créer votre premier contrat de location."
      defaultItemsPerPage={25}
      itemsPerPageOptions={[10, 25, 50, 100]}
    />
  );
};

export default ContractsTable;

// توليد نص الرسالة لواتساب
const generateContractText = (contract: Contract) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("fr-FR");
  const formatCurrency = (amount: number) => `${amount.toLocaleString()} MAD`;

  return `Contrat ${contract.contract_number}
Client: ${contract.customer_name}
Véhicule: ${contract.vehicle || "N/A"}
Période: ${formatDate(contract.start_date)} - ${formatDate(contract.end_date)}
Montant: ${formatCurrency(contract.total_amount)}`;
};

// توليد PDF خفيف عبر jsPDF
const generateContractPDFBlob = (contract: Contract): Blob => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const companyName = getCompanyDisplayName();
  doc.text(`${companyName} - Contrat de Location`, pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  let y = 30;
  const line = (label: string, value: string) => {
    doc.text(`${label}: ${value}`, 20, y);
    y += 8;
  };

  line("N° Contrat", `${contract.contract_number}`);
  line("Client", `${contract.customer_name}`);
  if (contract.customer_phone) line("Téléphone", `${contract.customer_phone}`);
  line("Véhicule", `${contract.vehicle || "N/A"}`);
  line("Période", `${new Date(contract.start_date).toLocaleDateString("fr-FR")} - ${new Date(contract.end_date).toLocaleDateString("fr-FR")}`);
  line("Montant", `${(contract.total_amount ?? 0).toLocaleString()} MAD`);
  if (contract.payment_method) line("Mode de Règlement", `${contract.payment_method}`);

  y += 6;
  doc.setFontSize(10);
  doc.text(`Document généré automatiquement par ${companyName}`, pageWidth / 2, y, { align: "center" });

  return doc.output("blob");
};

// بناء رابط واتساب
const buildWhatsappUrl = (text: string, phone?: string) => {
  let base = "https://wa.me/";
  if (phone) {
    const sanitized = phone.replace(/[^\d]/g, "");
    base += sanitized;
  }
  return `${base}?text=${encodeURIComponent(text)}`;
};

// مشاركة عبر واتساب مع محاولة إرفاق PDF على الهاتف
const shareContractViaWhatsApp = async (contract: Contract) => {
  try {
    const text = generateContractText(contract);
    const pdfBlob = generateContractPDFBlob(contract);
    const fileName = `Contrat_${contract.contract_number}.pdf`;
    const file = new File([pdfBlob], fileName, { type: "application/pdf" });

    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({
        title: `Contrat ${contract.contract_number}`,
        text,
        files: [file],
      });
    } else {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const whatsappUrl = buildWhatsappUrl(
        `${text}\n\n📎 تم تنزيل الـPDF تلقائيًا. يرجى إرفاقه يدويًا مع الرسالة.`,
        contract.customer_phone
      );
      window.open(whatsappUrl, "_blank");
    }
  } catch (err) {
    console.error("WhatsApp share failed:", err);
  }
};

// تحويل بيانات العقد المخزّنة إلى شكل ContractPDFData لإعادة بناء الـPDF الكامل
const buildPdfDataFromContract = (contract: Contract): ContractPDFData => {
  const cd = contract.contract_data || {};

  return {
    contractNumber: contract.contract_number,
    customerLastName: cd.customerLastName || "",
    customerFirstName: cd.customerFirstName || "",
    customerAddressMorocco: cd.customerAddressMorocco || "",
    customerPhone: cd.customerPhone || contract.customer_phone || "",
    customerAddressForeign: cd.customerAddressForeign || "",
    customerCin: cd.customerCin || "",
    customerCinDelivered: cd.customerCinDelivered || "",
    customerCinImageUrl: cd.customerCinImageUrl,
    customerLicenseNumber: cd.customerLicenseNumber || "",
    customerLicenseDelivered: cd.customerLicenseDelivered || "",
    customerLicenseImageUrl: cd.customerLicenseImageUrl,
    customerPassportNumber: cd.customerPassportNumber || "",
    customerPassportDelivered: cd.customerPassportDelivered || "",
    customerBirthDate: cd.customerBirthDate || "",
    secondDriverLastName: cd.secondDriverLastName || "",
    secondDriverFirstName: cd.secondDriverFirstName || "",
    secondDriverAddressMorocco: cd.secondDriverAddressMorocco || "",
    secondDriverPhone: cd.secondDriverPhone || "",
    secondDriverAddressForeign: cd.secondDriverAddressForeign || "",
    secondDriverCin: cd.secondDriverCin || "",
    secondDriverCinDelivered: cd.secondDriverCinDelivered || "",
    secondDriverLicenseNumber: cd.secondDriverLicenseNumber || "",
    secondDriverLicenseDelivered: cd.secondDriverLicenseDelivered || "",
    secondDriverPassportNumber: cd.secondDriverPassportNumber || "",
    secondDriverPassportDelivered: cd.secondDriverPassportDelivered || "",
    vehicleBrand: cd.vehicleBrand || "",
    vehicleModel: cd.vehicleModel || "",
    vehicleRegistration: cd.vehicleRegistration || "",
    vehicleYear: cd.vehicleYear || "",
    vehicleKmDepart: cd.vehicleKmDepart || "",
    deliveryLocation: cd.deliveryLocation || "",
    deliveryDateTime: cd.deliveryDateTime || contract.start_date,
    rentalDays: cd.rentalDays || cd.rentalDuration || "",
    emergencyEquipmentDelivery: cd.emergencyEquipmentDelivery || "",
    observationsDelivery: cd.observationsDelivery || "",
    deliveryFuelLevel: cd.delivery_fuel_level ?? contract.delivery_fuel_level ?? 0,
    deliveryDamages: cd.delivery_damages || contract.delivery_damages || [],
    returnDateTime: cd.returnDateTime || contract.end_date,
    returnLocation: cd.returnLocation || "",
    extensionUntil: cd.extensionUntil || "",
    vehicleKmReturn: cd.vehicleKmReturn || "",
    extendedDays: cd.extendedDays || "",
    emergencyEquipmentReturn: cd.emergencyEquipmentReturn || "",
    observationsReturn: cd.observationsReturn || "",
    returnFuelLevel: cd.return_fuel_level ?? contract.return_fuel_level ?? 0,
    returnDamages: cd.return_damages || contract.return_damages || [],
    dailyPrice: cd.dailyPrice || String(contract.daily_rate || ""),
    rentalDuration: cd.rentalDuration || cd.rentalDays || "",
    totalPrice: Number(contract.total_amount ?? cd.totalPrice ?? 0),
    advance: cd.advance || String(contract.advance_payment ?? ""),
    remaining: Number(contract.remaining_amount ?? cd.remaining ?? 0),
    paymentMethod: cd.paymentMethod || contract.payment_method || "",
    deliveryDate: cd.deliveryDate || (cd.deliveryDateTime ? cd.deliveryDateTime.split("T")[0] : ""),
    returnDate: cd.returnDate || (cd.returnDateTime ? cd.returnDateTime.split("T")[0] : ""),
    delivery_agent_signature: cd.delivery_agent_signature || "",
    delivery_tenant_signature: cd.delivery_tenant_signature || "",
    return_agent_signature: cd.return_agent_signature || "",
    return_tenant_signature: cd.return_tenant_signature || "",
  };
};
