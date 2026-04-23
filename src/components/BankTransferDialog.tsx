import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Banknote, CreditCard, Send, Building2 } from "lucide-react";
import { TransferAnimation3D } from "./TransferAnimation3D";

interface BankTransfer {
  id: string;
  date: string;
  type: 'cash' | 'check' | 'bank_to_cash';
  amount: number;
  fees: number;
  netAmount: number;
  reference?: string;
  clientName?: string;
  contractNumber?: string;
  checkDate?: string;
  checkDepositDate?: string;
  createdAt: string;
}

interface BankTransferDialogProps {
  totalCash: number;
  totalChecks: number;
  bankBalance: number;
  onTransfer: (transfer: BankTransfer) => void;
  children: React.ReactNode;
}

export const BankTransferDialog = ({ 
  totalCash, 
  totalChecks, 
  bankBalance, 
  onTransfer, 
  children 
}: BankTransferDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [transferType, setTransferType] = useState<'cash' | 'check' | 'bank_to_cash'>('bank_to_cash');
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    fees: '',
    reference: '',
    clientName: '',
    contractNumber: '',
    checkDate: '',
    checkDepositDate: ''
  });

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      fees: '',
      reference: '',
      clientName: '',
      contractNumber: '',
      checkDate: '',
      checkDepositDate: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    const fees = parseFloat(formData.fees) || 0;
    
    if (!amount || amount <= 0) {
      toast({
        title: "Erreur",
        description: "Le montant doit être supérieur à 0",
        variant: "destructive"
      });
      return;
    }

    const maxAmount = transferType === 'cash' ? totalCash : transferType === 'check' ? totalChecks : bankBalance;
    if (amount > maxAmount) {
      toast({
        title: "Erreur",
        description: `Le montant ne peut pas dépasser ${maxAmount.toLocaleString()} MAD (solde disponible)`,
        variant: "destructive"
      });
      return;
    }

    if (fees >= amount) {
      toast({
        title: "Erreur",
        description: "Les frais ne peuvent pas être supérieurs ou égaux au montant",
        variant: "destructive"
      });
      return;
    }

    const transfer: BankTransfer = {
      id: crypto.randomUUID(),
      date: formData.date,
      type: transferType,
      amount,
      fees,
      netAmount: amount - fees,
      reference: transferType === 'check' ? formData.reference : undefined,
      clientName: transferType === 'check' ? formData.clientName : undefined,
      contractNumber: transferType === 'check' ? formData.contractNumber : undefined,
      checkDate: transferType === 'check' ? formData.checkDate : undefined,
      checkDepositDate: transferType === 'check' ? formData.checkDepositDate : undefined,
      createdAt: new Date().toISOString()
    };

    // Show animation
    setShowAnimation(true);
    
    // After animation, complete transfer
    setTimeout(() => {
      onTransfer(transfer);
      setShowAnimation(false);
      setOpen(false);
      resetForm();
      
      const transferDirection = transferType === 'bank_to_cash' 
        ? 'de la banque vers les espèces' 
        : transferType === 'cash' 
        ? 'des espèces vers la banque' 
        : 'du chèque vers la banque';
        
      toast({
        title: "Transfert réussi",
        description: `${amount.toLocaleString()} MAD transférés ${transferDirection} (net: ${(amount - fees).toLocaleString()} MAD)`,
        variant: "default"
      });
    }, 3000);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (isOpen) {
          setShowPreview(true);
        } else {
          setShowPreview(false);
          setShowAnimation(false);
        }
      }}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Transfert vers Banque
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              {showAnimation ? (
                <div className="p-8">
                  <TransferAnimation3D type={transferType === 'bank_to_cash' ? 'cash' : transferType} amount={parseFloat(formData.amount)} />
                  <div className="text-center mt-4">
                    <p className="text-lg font-semibold">Transfert en cours...</p>
                    <p className="text-sm text-gray-600">
                      {transferType === 'bank_to_cash' ? 'Banque → Espèces' : 
                       transferType === 'cash' ? 'Espèces → Banque' : 
                       'Chèque → Banque'}
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type de transfert */}
                  <div>
                    <Label>Type de transfert</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        type="button"
                        variant={transferType === 'bank_to_cash' ? 'default' : 'outline'}
                        onClick={() => setTransferType('bank_to_cash')}
                        className="flex-1"
                      >
                        <Building2 className="w-4 h-4 mr-2" />
                        Banque → Espèces
                      </Button>
                      <Button
                        type="button"
                        variant={transferType === 'cash' ? 'default' : 'outline'}
                        onClick={() => setTransferType('cash')}
                        className="flex-1"
                      >
                        <Banknote className="w-4 h-4 mr-2" />
                        Espèces → Banque
                      </Button>
                      <Button
                        type="button"
                        variant={transferType === 'check' ? 'default' : 'outline'}
                        onClick={() => setTransferType('check')}
                        className="flex-1"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Chèque → Banque
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Solde disponible: {
                        transferType === 'cash' ? totalCash.toLocaleString() : 
                        transferType === 'check' ? totalChecks.toLocaleString() : 
                        bankBalance.toLocaleString()
                      } MAD
                    </p>
                  </div>

                  {/* Date */}
                  <div>
                    <Label htmlFor="date">Date d'opération</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Montant */}
                  <div>
                    <Label htmlFor="amount">Montant à transférer (MAD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      max={transferType === 'cash' ? totalCash : transferType === 'check' ? totalChecks : bankBalance}
                    />
                  </div>

                  {/* Frais bancaires */}
                  <div>
                    <Label htmlFor="fees">Frais bancaires (MAD) - Optionnel</Label>
                    <Input
                      id="fees"
                      type="number"
                      step="0.01"
                      value={formData.fees}
                      onChange={(e) => setFormData(prev => ({ ...prev, fees: e.target.value }))}
                    />
                  </div>

                  {/* Champs spécifiques aux chèques */}
                  {transferType === 'check' && (
                    <>
                      <div>
                        <Label htmlFor="reference">Référence du chèque</Label>
                        <Input
                          id="reference"
                          value={formData.reference}
                          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="Ex: CHQ-123456"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="clientName">Nom et prénom du client</Label>
                        <Input
                          id="clientName"
                          value={formData.clientName}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                          placeholder="Ex: Mohammed Benali"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="contractNumber">Contrat payé par chèque</Label>
                        <Input
                          id="contractNumber"
                          value={formData.contractNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
                          placeholder="Ex: C001"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="checkDate">Date du chèque</Label>
                        <Input
                          id="checkDate"
                          type="date"
                          value={formData.checkDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, checkDate: e.target.value }))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="checkDepositDate">Date d'encaissement *</Label>
                        <Input
                          id="checkDepositDate"
                          type="date"
                          value={formData.checkDepositDate}
                          onChange={(e) => setFormData(prev => ({ ...prev, checkDepositDate: e.target.value }))}
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* Résumé */}
                  {formData.amount && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Résumé du transfert:</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Montant brut:</span>
                          <span>{parseFloat(formData.amount).toLocaleString()} MAD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frais bancaires:</span>
                          <span>{(parseFloat(formData.fees) || 0).toLocaleString()} MAD</span>
                        </div>
                        <div className="flex justify-between font-semibold border-t pt-1">
                          <span>Montant net crédité:</span>
                          <span className="text-green-600">
                            {(parseFloat(formData.amount) - (parseFloat(formData.fees) || 0)).toLocaleString()} MAD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                      Annuler
                    </Button>
                    <Button type="submit" className="flex-1">
                      Effectuer le transfert
                    </Button>
                  </div>
                </form>
              )}
            </div>

            {/* Animation and Preview Section */}
            <div className="space-y-4">
              {(showPreview || showAnimation) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-center">Aperçu du Transfert</h3>
                  <TransferAnimation3D 
                    type={transferType === 'bank_to_cash' ? 'cash' : transferType} 
                    amount={formData.amount ? parseFloat(formData.amount) : 1000} 
                  />
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-600">
                      Simulation: {transferType === 'bank_to_cash' ? 'Banque → Espèces' : 
                                   transferType === 'cash' ? 'Espèces → Banque' : 
                                   'Chèque → Banque'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Bank Transfer History Table */}
              <div className="bg-card border rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">Historique des Transferts</h3>
                </div>
                <div className="p-4">
                  <div className="text-center text-gray-500 py-8">
                    <Send className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Pas de transferts récents</p>
                    <p className="text-sm">Les transferts effectués apparaîtront ici</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};