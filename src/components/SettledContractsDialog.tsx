import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History, CheckCircle, Eye, FileText, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Contract } from '@/hooks/useContracts';
import type { Payment } from '@/types/payment';
import { PaymentHistoryDialog } from './PaymentHistoryDialog';

interface SettledContractsDialogProps {
  settledContracts: Contract[];
  payments: Payment[];
  children: React.ReactNode;
}

export function SettledContractsDialog({
  settledContracts,
  payments,
  children
}: SettledContractsDialogProps) {
  
  const handleDownloadSettlementHistory = () => {
    const csvContent = [
      ['N° Contrat', 'Client', 'Date de Création', 'Date de Soldage', 'Montant Total', 'Nb Paiements'].join(','),
      ...settledContracts.map(contract => {
        const contractPayments = payments.filter(p => p.contractId === contract.id);
        const lastPaymentDate = contractPayments.length > 0 
          ? contractPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0].paymentDate
          : contract.created_at;
        
        return [
          contract.contract_number,
          contract.customer_name,
          format(parseISO(contract.created_at), 'dd/MM/yyyy', { locale: fr }),
          format(parseISO(lastPaymentDate), 'dd/MM/yyyy', { locale: fr }),
          `${contract.total_amount} MAD`,
          contractPayments.length.toString()
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_contrats_soldes_${format(new Date(), 'dd-MM-yyyy', { locale: fr })}.csv`;
    link.click();
  };

  const getContractPaymentSummary = (contractId: string) => {
    const contractPayments = payments.filter(p => p.contractId === contractId);
    const totalPaid = contractPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const contract = settledContracts.find(c => c.id === contractId);
    const totalAmount = contract?.total_amount || 0;
    const advancePayment = contract?.advance_payment || 0;
    
    return {
      totalPaid: totalPaid + advancePayment,
      remainingAmount: Math.max(0, totalAmount - (totalPaid + advancePayment)),
      totalAmount,
      payments: contractPayments
    };
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des Contrats Soldés ({settledContracts.length})
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSettlementHistory}
              disabled={settledContracts.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {settledContracts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium">N° Contrat</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Période</th>
                    <th className="text-left p-3 font-medium">Montant</th>
                    <th className="text-left p-3 font-medium">Paiements</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settledContracts.map((contract) => {
                    const startDate = contract.start_date ? parseISO(contract.start_date) : null;
                    const endDate = contract.end_date ? parseISO(contract.end_date) : null;
                    const summary = getContractPaymentSummary(contract.id);
                    
                    return (
                      <tr key={contract.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{contract.contract_number}</div>
                          <div className="text-sm text-gray-500">
                            {format(parseISO(contract.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{contract.customer_name}</div>
                          {contract.customer_phone && (
                            <div className="text-sm text-gray-500">{contract.customer_phone}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {startDate && endDate ? (
                              <>
                                <div>{format(startDate, 'dd/MM/yyyy', { locale: fr })}</div>
                                <div className="text-gray-500">
                                  au {format(endDate, 'dd/MM/yyyy', { locale: fr })}
                                </div>
                              </>
                            ) : (
                              'Dates non définies'
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-green-600">
                            {contract.total_amount.toLocaleString()} MAD
                          </div>
                          <div className="text-sm text-gray-500">
                            Avance: {(contract.advance_payment || 0).toLocaleString()} MAD
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{summary.payments.length} paiement{summary.payments.length > 1 ? 's' : ''}</div>
                            <div className="text-gray-500">
                              Total: {summary.totalPaid.toLocaleString()} MAD
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Soldé
                          </Badge>
                        </td>
                        <td className="p-3">
                          <PaymentHistoryDialog
                            contractId={contract.id}
                            contractNumber={contract.contract_number}
                            customerName={contract.customer_name}
                            payments={payments}
                            totalAmount={summary.totalAmount}
                            totalPaid={summary.totalPaid}
                            remainingAmount={summary.remainingAmount}
                          >
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Détails
                            </Button>
                          </PaymentHistoryDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun contrat soldé
                </h3>
                <p className="text-gray-500">
                  Les contrats entièrement payés apparaîtront ici
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}