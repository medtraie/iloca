
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Edit, Trash2, FileText, Calendar, DollarSign, User, Car, Download, CreditCard, UserCheck, Share2 } from "lucide-react";
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
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">{contract.contract_number}</span>
        </div>
      )
    },
    {
      key: 'customer_name',
      label: 'Client',
      sortable: true,
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-foreground">{contract.customer_name}</div>
            {contract.customer_phone && (
              <div className="text-sm text-muted-foreground">{contract.customer_phone}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'vehicle',
      label: 'Véhicule',
      sortable: true,
      render: (contract: Contract) => (
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">{contract.vehicle}</span>
        </div>
      )
    },
    {
      key: 'start_date',
      label: 'Période',
      sortable: true,
      render: (contract: Contract) => {
        const { startDate, endDate } = getEffectiveDates(contract);
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        
        // Get extension and overdue info
        const extensionDays = summary.extensionDays || 0;
        const overdueDays = summary.overdueDays || 0;
        const baseDuration = summary.baseDuration || summary.duration;
        
        // Get financial status to display the right badge
        const financialStatus = contract.status === 'ouvert' && overdueDays > 0 ? 'impaye' : contract.status;
        
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm w-full">
              <div className="text-foreground font-medium">
                {format(startDate, 'dd/MM/yyyy', { locale: fr })}
              </div>
              <div className="text-muted-foreground">
                au {format(endDate, 'dd/MM/yyyy', { locale: fr })}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Durée: {baseDuration} jour{baseDuration > 1 ? 's' : ''}
              </div>
              
              {extensionDays > 0 && (
                <div className="text-xs text-primary font-medium mt-0.5">
                  Prolongé de {extensionDays}j
                </div>
              )}
              
              {overdueDays > 0 && (
                <div className="mt-1 space-y-0.5">
                  <div className="text-xs text-destructive font-semibold">
                    En retard {overdueDays} jour{overdueDays > 1 ? 's' : ''}
                  </div>
                  <div className="text-xs text-destructive">
                    Dépassement depuis le {format(endDate, 'dd/MM', { locale: fr })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'total_amount',
      label: 'Prix/Jour',
      sortable: true,
      render: (contract: Contract) => {
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        
        return (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <div className="flex flex-col text-sm">
              <div className="font-semibold text-foreground">{formatCurrency(contract.daily_rate || 0)}</div>
              <div className="text-xs text-muted-foreground">{summary.duration} jour{summary.duration > 1 ? 's' : ''}</div>
              <div className="text-xs font-semibold text-green-700">{formatCurrency(summary.total)}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'payment_info',
      label: 'Avance / Reste à Payer',
      sortable: false,
      render: (contract: Contract) => {
        // 🚨 CRITICAL DEBUG: Log values used for display
        const advance = contract.advance_payment || 0;
        console.log(`[💰 TABLE DEBUG] Contract ${contract.contract_number || contract.id}:`);
        console.log(`- Raw advance_payment: ${contract.advance_payment} MAD`);
        console.log(`- Used advance: ${advance} MAD`);
        
        const summary = computeContractSummary(contract, { advanceMode: 'field' });
        const remaining = Math.max(0, summary.total - advance);
        
        console.log(`- Summary total: ${summary.total} MAD`);
        console.log(`- Calculated remaining: ${remaining} MAD`);
        
        return (
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col text-sm">
              <div className="text-foreground">
                <span className="font-semibold text-blue-600">{formatCurrency(advance)}</span>
              </div>
              <div className="text-foreground">
                <span className="font-semibold text-orange-600">{formatCurrency(remaining)}</span>
              </div>
              <Badge 
                variant={remaining === 0 ? "default" : advance > 0 ? "secondary" : "destructive"}
                className="text-xs mt-1 w-fit"
              >
                {remaining === 0 ? "Payé" : advance > 0 ? "En cours" : "En attente"}
              </Badge>
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
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

  // تعديل عناصر الإجراءات لإضافة زر تحميل الـPDF المفصل
  const renderActions = (contract: Contract) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewDetails(contract)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700"
        title="Voir les détails"
      >
        <Eye className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadFullPDF(contract)}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-700"
        title="Télécharger Contrat (Complet)"
      >
        <FileText className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleShareWhatsAppFull(contract)}
        className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-700"
        title="Partager via WhatsApp (PDF Complet)"
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEditContract(contract)}
        className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-700"
        title="Modifier"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadDocument(contract, 'cin')}
        className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-700"
        title="Télécharger CIN"
      >
        <CreditCard className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadDocument(contract, 'permis')}
        className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-700"
        title="Télécharger Permis"
      >
        <UserCheck className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleDownloadPackage(contract)}
        className="h-8 w-8 p-0 hover:bg-teal-50 hover:text-teal-700"
        title="Télécharger Documents (CIN + Permis + Passeport)"
      >
        <Download className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le contrat #{contract.contract_number} ? 
              Cette action est irréversible et supprimera toutes les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteContract(contract.id)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
