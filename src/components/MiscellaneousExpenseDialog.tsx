import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useMiscellaneousExpenses, EXPENSE_TYPES } from "@/hooks/useMiscellaneousExpenses";

interface MiscellaneousExpenseDialogProps {
  trigger?: React.ReactNode;
}

const MiscellaneousExpenseDialog = ({ trigger }: MiscellaneousExpenseDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    expense_type: "",
    custom_expense_type: "",
    amount: "",
    payment_method: "",
    expense_date: new Date(),
    notes: "",
    checkName: "",
    checkReference: "",
    checkDate: "",
    checkDepositDate: ""
  });
  
  const { addExpense } = useMiscellaneousExpenses();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.expense_type || !formData.amount || !formData.payment_method) {
      return;
    }

    // If "Autre" is selected, custom_expense_type is required
    if (formData.expense_type === "Autre" && !formData.custom_expense_type.trim()) {
      return;
    }

    const expenseData = {
      expense_type: formData.expense_type,
      custom_expense_type: formData.expense_type === "Autre" ? formData.custom_expense_type : null,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method as 'Espèces' | 'Virement' | 'Chèque',
      expense_date: format(formData.expense_date, 'yyyy-MM-dd'),
      notes: formData.notes || null
    };

    const result = await addExpense(expenseData);
    if (result) {
      setFormData({
        expense_type: "",
        custom_expense_type: "",
        amount: "",
        payment_method: "",
        expense_date: new Date(),
        notes: "",
        checkName: "",
        checkReference: "",
        checkDate: "",
        checkDepositDate: ""
      });
      setOpen(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un Divers
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Ajouter une dépense diverse</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expense_type">Type de dépense *</Label>
            <Select value={formData.expense_type} onValueChange={(value) => handleInputChange('expense_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un type" />
              </SelectTrigger>
              <SelectContent>
                {EXPENSE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.expense_type === "Autre" && (
            <div>
              <Label htmlFor="custom_expense_type">Préciser le type *</Label>
              <Input
                id="custom_expense_type"
                value={formData.custom_expense_type}
                onChange={(e) => handleInputChange('custom_expense_type', e.target.value)}
                placeholder="Spécifiez le type de dépense"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="amount">Montant (MAD) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="payment_method">Mode de paiement *</Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Espèces">Espèces</SelectItem>
                <SelectItem value="Virement">Virement</SelectItem>
                <SelectItem value="Chèque">Chèque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date de dépense *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expense_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expense_date ? format(formData.expense_date, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expense_date}
                  onSelect={(date) => date && handleInputChange('expense_date', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Note (facultatif)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Note sur cette dépense..."
              rows={3}
            />
          </div>

          {formData.payment_method === "Chèque" && (
            <>
              <div>
                <Label htmlFor="checkName">Nom complet *</Label>
                <Input
                  id="checkName"
                  value={formData.checkName}
                  onChange={(e) => handleInputChange('checkName', e.target.value)}
                  placeholder="Nom et prénom"
                  required
                />
              </div>

              <div>
                <Label htmlFor="checkReference">Référence du chèque *</Label>
                <Input
                  id="checkReference"
                  value={formData.checkReference}
                  onChange={(e) => handleInputChange('checkReference', e.target.value)}
                  placeholder="Ex: CHQ-123456"
                  required
                />
              </div>

              <div>
                <Label htmlFor="checkDate">Date du chèque *</Label>
                <Input
                  id="checkDate"
                  type="date"
                  value={formData.checkDate}
                  onChange={(e) => handleInputChange('checkDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="checkDepositDate">Date d'encaissement *</Label>
                <Input
                  id="checkDepositDate"
                  type="date"
                  value={formData.checkDepositDate}
                  onChange={(e) => handleInputChange('checkDepositDate', e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Ajouter
            </Button>
          </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MiscellaneousExpenseDialog;