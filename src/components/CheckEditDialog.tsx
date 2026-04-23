import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Payment, CheckDepositStatus, CheckDirection } from "@/types/payment";
import { useToast } from "@/hooks/use-toast";

interface CheckEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: Payment | null;
  onSave: (updatedCheck: Payment) => void;
}

const CheckEditDialog = ({ open, onOpenChange, check, onSave }: CheckEditDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Payment | null>(null);

  useEffect(() => {
    if (open && check) {
      setFormData({ ...check });
    }
  }, [open, check]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    onSave(formData);
    toast({
      title: "✅ Chèque modifié",
      description: "Les informations du chèque ont été mises à jour avec succès.",
    });
    onOpenChange(false);
  };

  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le chèque</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkName">Nom complet</Label>
              <Input
                id="checkName"
                value={formData.checkName || ''}
                onChange={(e) => setFormData({ ...formData, checkName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkReference">Référence du chèque</Label>
              <Input
                id="checkReference"
                value={formData.checkReference || ''}
                onChange={(e) => setFormData({ ...formData, checkReference: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (MAD)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDate">Date du chèque</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkDepositDate">Date d'encaissement</Label>
              <Input
                id="checkDepositDate"
                type="date"
                value={formData.checkDepositDate || ''}
                onChange={(e) => setFormData({ ...formData, checkDepositDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkDirection">Direction</Label>
              <Select
                value={formData.checkDirection || 'reçu'}
                onValueChange={(value: CheckDirection) => 
                  setFormData({ ...formData, checkDirection: value })
                }
              >
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
              <Label htmlFor="checkDepositStatus">Statut d'encaissement</Label>
              <Select
                value={formData.checkDepositStatus || 'non encaissé'}
                onValueChange={(value: CheckDepositStatus) => 
                  setFormData({ ...formData, checkDepositStatus: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encaissé">Encaissé</SelectItem>
                  <SelectItem value="non encaissé">Non encaissé</SelectItem>
                  <SelectItem value="partiellement encaissé">Partiellement encaissé</SelectItem>
                  <SelectItem value="retourné">Retourné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.checkDepositStatus === "partiellement encaissé" && (
              <div className="space-y-2">
                <Label htmlFor="partiallyCollectedAmount">Montant encaissé partiel (MAD)</Label>
                <Input
                  id="partiallyCollectedAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.partiallyCollectedAmount || 0}
                  onChange={(e) => setFormData({ ...formData, partiallyCollectedAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
            {formData.checkDepositStatus === "retourné" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="checkReturnReason">Motif du retour</Label>
                  <Input
                    id="checkReturnReason"
                    value={formData.checkReturnReason || ""}
                    onChange={(e) => setFormData({ ...formData, checkReturnReason: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkReturnDate">Date du retour</Label>
                  <Input
                    id="checkReturnDate"
                    type="date"
                    value={formData.checkReturnDate || ""}
                    onChange={(e) => setFormData({ ...formData, checkReturnDate: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="contractNumber">N° Contrat</Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckEditDialog;
