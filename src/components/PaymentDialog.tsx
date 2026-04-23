import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, CreditCard, Coins, Banknote, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CheckDepositStatus, CheckDirection } from "@/types/payment";

interface PaymentDialogProps {
  children: React.ReactNode;
  contractId: string;
  contractNumber: string;
  customerName: string;
  remainingAmount: number;
  onPayment: (contractId: string, paymentData: PaymentData) => void;
}

export interface PaymentData {
  amount: number;
  paymentMethod: 'Espèces' | 'Virement' | 'Chèque';
  isFullPayment: boolean;
  checkReference?: string;
  checkName?: string;
  checkDepositDate?: string;
  checkDirection?: CheckDirection;
  checkDepositStatus?: CheckDepositStatus;
  checkReturnReason?: string;
  checkReturnDate?: string;
  partiallyCollectedAmount?: number;
}

export const PaymentDialog = ({ 
  children, 
  contractId, 
  contractNumber, 
  customerName, 
  remainingAmount, 
  onPayment 
}: PaymentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<'Espèces' | 'Virement' | 'Chèque'>('Espèces');
  const [checkReference, setCheckReference] = useState<string>("");
  const [checkName, setCheckName] = useState<string>("");
  const [checkDepositDate, setCheckDepositDate] = useState<Date>();
  const [checkDirection, setCheckDirection] = useState<CheckDirection>('reçu');
  const [checkDepositStatus, setCheckDepositStatus] = useState<CheckDepositStatus>('non encaissé');
  const [checkReturnReason, setCheckReturnReason] = useState<string>("");
  const [checkReturnDate, setCheckReturnDate] = useState<Date>();
  const [partiallyCollectedAmount, setPartiallyCollectedAmount] = useState<string>("");
  const { toast } = useToast();

  const handleSubmit = () => {
    const paymentAmount = parseFloat(amount);
    
    // Validation
    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: "Montant invalide",
        description: "Veuillez saisir un montant valide",
        variant: "destructive"
      });
      return;
    }

    if (paymentAmount > remainingAmount) {
      toast({
        title: "Montant trop élevé",
        description: `Le montant ne peut pas dépasser ${remainingAmount.toLocaleString()} MAD`,
        variant: "destructive"
      });
      return;
    }

    // Validation for check fields
    if (paymentMethod === 'Chèque') {
      if (!checkReference.trim()) {
        toast({
          title: "Référence requise",
          description: "Veuillez saisir la référence du chèque",
          variant: "destructive"
        });
        return;
      }
      if (!checkName.trim()) {
        toast({
          title: "Nom complet requis",
          description: "Veuillez saisir le nom complet",
          variant: "destructive"
        });
        return;
      }
      if (!checkDepositDate) {
        toast({
          title: "Date d'encaissement requise",
          description: "Veuillez sélectionner la date d'encaissement du chèque",
          variant: "destructive"
        });
        return;
      }
      if (checkDepositStatus === "retourné") {
        if (!checkReturnReason.trim()) {
          toast({
            title: "Motif requis",
            description: "Veuillez préciser le motif du retour du chèque",
            variant: "destructive"
          });
          return;
        }
        if (!checkReturnDate) {
          toast({
            title: "Date de retour requise",
            description: "Veuillez sélectionner la date de retour du chèque",
            variant: "destructive"
          });
          return;
        }
      }
      if (checkDepositStatus === "partiellement encaissé") {
        const partial = parseFloat(partiallyCollectedAmount);
        if (!partial || partial <= 0 || partial >= paymentAmount) {
          toast({
            title: "Montant partiel invalide",
            description: "Le montant partiel doit être supérieur à 0 et inférieur au montant du chèque",
            variant: "destructive"
          });
          return;
        }
      }
    }

    // Prepare payment data
    const paymentData: PaymentData = {
      amount: paymentAmount,
      paymentMethod,
      isFullPayment: paymentAmount === remainingAmount,
      checkReference: paymentMethod === 'Chèque' ? checkReference : undefined,
      checkName: paymentMethod === 'Chèque' ? checkName : undefined,
      checkDepositDate: paymentMethod === 'Chèque' && checkDepositDate ? format(checkDepositDate, 'yyyy-MM-dd') : undefined,
      checkDirection: paymentMethod === 'Chèque' ? checkDirection : undefined,
      checkDepositStatus: paymentMethod === 'Chèque' ? checkDepositStatus : undefined,
      checkReturnReason: paymentMethod === 'Chèque' && checkDepositStatus === "retourné" ? checkReturnReason : undefined,
      checkReturnDate: paymentMethod === 'Chèque' && checkDepositStatus === "retourné" && checkReturnDate ? format(checkReturnDate, 'yyyy-MM-dd') : undefined,
      partiallyCollectedAmount: paymentMethod === 'Chèque' && checkDepositStatus === "partiellement encaissé" ? parseFloat(partiallyCollectedAmount) : undefined
    };

    onPayment(contractId, paymentData);
    
    // Reset form and close dialog
    setAmount("");
    setPaymentMethod('Espèces');
    setCheckReference("");
    setCheckName("");
    setCheckDepositDate(undefined);
    setCheckDirection('reçu');
    setCheckDepositStatus('non encaissé');
    setCheckReturnReason("");
    setCheckReturnDate(undefined);
    setPartiallyCollectedAmount("");
    setOpen(false);
  };

  const handleFullPayment = () => {
    setAmount(remainingAmount.toString());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Enregistrer un Paiement
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contract Info */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Contrat :</span>
                  <span className="font-medium">{contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Client :</span>
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reste à payer :</span>
                  <span className="font-bold text-red-600">{remainingAmount.toLocaleString()} MAD</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant du Règlement (MAD)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={remainingAmount}
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFullPayment}
                  className="px-3 whitespace-nowrap"
                >
                  Tout
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Mode de Règlement</Label>
              <Select value={paymentMethod} onValueChange={(value: 'Espèces' | 'Virement' | 'Chèque') => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Espèces">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      Espèces
                    </div>
                  </SelectItem>
                  <SelectItem value="Virement">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4" />
                      Virement
                    </div>
                  </SelectItem>
                  <SelectItem value="Chèque">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Chèque
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Check-specific fields */}
            {paymentMethod === 'Chèque' && (
              <div className="space-y-4 p-4 bg-muted rounded-lg border border-input">
                <div className="space-y-2">
                  <Label htmlFor="checkReference">Référence n°</Label>
                  <Input
                    id="checkReference"
                    type="text"
                    value={checkReference}
                    onChange={(e) => setCheckReference(e.target.value)}
                    placeholder="Ex: CHQ-123456"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkName">Nom complet</Label>
                  <Input
                    id="checkName"
                    type="text"
                    value={checkName}
                    onChange={(e) => setCheckName(e.target.value)}
                    placeholder="Ex: Mohammed Benali"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'encaissement *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !checkDepositDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {checkDepositDate ? format(checkDepositDate, "PPP", { locale: fr }) : "Sélectionner la date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkDepositDate}
                        onSelect={setCheckDepositDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={checkDirection} onValueChange={(value: CheckDirection) => setCheckDirection(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reçu">Reçu</SelectItem>
                      <SelectItem value="envoyé">Envoyé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Statut d'encaissement</Label>
                  <Select value={checkDepositStatus} onValueChange={(value: CheckDepositStatus) => setCheckDepositStatus(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non encaissé">Non encaissé</SelectItem>
                      <SelectItem value="encaissé">Encaissé</SelectItem>
                      <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                      <SelectItem value="retourné">Retourné</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {checkDepositStatus === "partiellement encaissé" && (
                  <div className="space-y-2">
                    <Label>Montant encaissé partiel (MAD)</Label>
                    <Input
                      type="number"
                      min="0"
                      max={amount || "0"}
                      step="0.01"
                      value={partiallyCollectedAmount}
                      onChange={(e) => setPartiallyCollectedAmount(e.target.value)}
                      placeholder="Ex: 2500"
                    />
                  </div>
                )}
                {checkDepositStatus === "retourné" && (
                  <>
                    <div className="space-y-2">
                      <Label>Motif du retour</Label>
                      <Input
                        value={checkReturnReason}
                        onChange={(e) => setCheckReturnReason(e.target.value)}
                        placeholder="Provision insuffisante..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date du retour</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !checkReturnDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkReturnDate ? format(checkReturnDate, "PPP", { locale: fr }) : "Sélectionner la date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={checkReturnDate}
                            onSelect={setCheckReturnDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
