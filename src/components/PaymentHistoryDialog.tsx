import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download, Eye, CreditCard, Banknote, CheckCircle, Clock, Building2, Coins } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Payment } from '@/types/payment';

interface PaymentHistoryDialogProps {
  contractId: string;
  contractNumber: string;
  customerName: string;
  payments: Payment[];
  totalAmount: number;
  totalPaid: number;
  remainingAmount: number;
  children: React.ReactNode;
}

export function PaymentHistoryDialog({
  contractId,
  contractNumber,
  customerName,
  payments,
  totalAmount,
  totalPaid,
  remainingAmount,
  children
}: PaymentHistoryDialogProps) {
  const contractPayments = payments.filter(payment => payment.contractId === contractId);
  
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Espèces':
        return <Banknote className="w-4 h-4 text-green-600" />;
      case 'Chèque':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'Virement':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      default:
        return <CreditCard className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Espèces':
        return 'bg-green-100 text-green-800';
      case 'Chèque':
        return 'bg-blue-100 text-blue-800';
      case 'Virement':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownloadHistory = () => {
    const csvContent = [
      ['Date', 'Montant', 'Méthode', 'Référence', 'Nom sur Chèque'].join(','),
      ...contractPayments.map(payment => [
        format(parseISO(payment.paymentDate), 'dd/MM/yyyy HH:mm', { locale: fr }),
        `${payment.amount} MAD`,
        payment.paymentMethod,
        payment.checkReference || '-',
        payment.checkName || '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_paiements_${contractNumber}_${customerName.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const isFullyPaid = remainingAmount <= 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Détails des Paiements - Contrat {contractNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résumé du Contrat</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Client</div>
                  <div className="font-semibold">{customerName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Montant Total</div>
                  <div className="font-semibold text-blue-600">{totalAmount.toLocaleString()} MAD</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Payé</div>
                  <div className="font-semibold text-green-600">{totalPaid.toLocaleString()} MAD</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Reste à Payer</div>
                  <div className={`font-semibold ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remainingAmount.toLocaleString()} MAD
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Statut:</span>
                <Badge className={isFullyPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {isFullyPaid ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Contrat Soldé
                    </>
                  ) : (
                    'Paiement en Cours'
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Historique des Paiements</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadHistory}
                disabled={contractPayments.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </CardHeader>
            <CardContent>
              {contractPayments.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Table Header */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border border-border p-4 text-left font-bold text-foreground">Date de Paiement</th>
                          <th className="border border-border p-4 text-left font-bold text-foreground">Montant Payé</th>
                          <th className="border border-border p-4 text-left font-bold text-foreground">MODE DE PAIEMENT</th>
                          <th className="border border-border p-4 text-left font-bold text-foreground">STATUT</th>
                          <th className="border border-border p-4 text-left font-bold text-foreground">Détails/Référence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contractPayments
                          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                          .map((payment, index) => (
                            <tr key={payment.id} className="hover:bg-accent/30 transition-colors">
                              <td className="border border-border p-4">
                                <div className="font-semibold text-base">
                                  {format(parseISO(payment.paymentDate), 'dd/MM/yyyy', { locale: fr })}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  à {format(parseISO(payment.paymentDate), 'HH:mm', { locale: fr })}
                                </div>
                              </td>
                              <td className="border border-border p-4">
                                <div className="text-2xl font-bold text-primary">
                                  {payment.amount.toLocaleString()} MAD
                                </div>
                              </td>
                              <td className="border border-border p-4">
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Mode de Paiement
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getPaymentMethodIcon(payment.paymentMethod)}
                                    <Badge className={`${getPaymentMethodColor(payment.paymentMethod)} text-base px-4 py-2 font-bold border-2`}>
                                      {payment.paymentMethod}
                                    </Badge>
                                  </div>
                                </div>
                              </td>
                              <td className="border border-border p-4">
                                <div className="flex flex-col gap-2">
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Statut du Paiement
                                  </div>
                                  {payment.paymentMethod === 'Chèque' && payment.checkDepositStatus ? (
                                    <Badge className={`${
                                      payment.checkDepositStatus === 'encaissé' 
                                        ? 'bg-green-100 text-green-800 border-green-400' 
                                        : 'bg-orange-100 text-orange-800 border-orange-400'
                                    } text-base px-4 py-2 font-bold border-2`}>
                                      {payment.checkDepositStatus === 'encaissé' ? (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-2 inline" />
                                          Encaissé
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="w-4 h-4 mr-2 inline" />
                                          Non Encaissé
                                        </>
                                      )}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-green-100 text-green-800 border-green-400 border-2 text-base px-4 py-2 font-bold">
                                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                                      Paiement Reçu
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="border border-border p-4">
                                {payment.paymentMethod === 'Chèque' && payment.checkReference ? (
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                                      <div>
                                        <div className="font-bold text-sm text-foreground">
                                          N° Chèque: {payment.checkReference}
                                        </div>
                                        {payment.checkName && (
                                          <div className="text-sm text-muted-foreground mt-1">
                                            Émetteur: {payment.checkName}
                                          </div>
                                        )}
                                        {payment.checkDepositDate && (
                                          <div className="text-sm text-muted-foreground mt-1">
                                            Date de dépôt: {format(parseISO(payment.checkDepositDate), 'dd/MM/yyyy', { locale: fr })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : payment.paymentMethod === 'Virement' ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm">Virement bancaire</span>
                                  </div>
                                ) : payment.paymentMethod === 'Espèces' ? (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Coins className="w-4 h-4" />
                                    <span className="text-sm">Paiement en espèces</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <div className="text-lg font-medium mb-1">Aucun paiement enregistré</div>
                  <div className="text-sm">Ce contrat n'a pas encore de paiements</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settlement Summary */}
          {isFullyPaid && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Contrat Entièrement Soldé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-green-700">
                  Ce contrat a été entièrement soldé. Tous les paiements ont été reçus et traités.
                </div>
                <div className="mt-2 text-sm text-green-600">
                  Total des paiements: {contractPayments.length} transaction{contractPayments.length > 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}