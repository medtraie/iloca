
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Customer } from "@/hooks/useCustomers";
import { UserPlus, User, Phone, IdCard, MapPin, FileText, X, Check } from "lucide-react";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
}

const CustomerFormDialog = ({ open, onOpenChange, onSave }: CustomerFormDialogProps) => {
  const [formData, setFormData] = useState({
    last_name: "",
    first_name: "",
    address_morocco: "",
    phone: "",
    address_foreign: "",
    cin: "",
    cin_delivered: "",
    license_number: "",
    license_delivered: "",
    passport_number: "",
    passport_delivered: "",
    birth_date: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.last_name.trim()) {
      return;
    }

    onSave(formData);
    onOpenChange(false);
    
    // Reset form
    setFormData({
      last_name: "",
      first_name: "",
      address_morocco: "",
      phone: "",
      address_foreign: "",
      cin: "",
      cin_delivered: "",
      license_number: "",
      license_delivered: "",
      passport_number: "",
      passport_delivered: "",
      birth_date: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="bg-card/95 backdrop-blur-xl border border-primary/10 rounded-[var(--radius)] shadow-2xl overflow-hidden">
          <div className="relative h-32 bg-primary/10 flex items-center px-8">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <UserPlus className="h-32 w-32" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <UserPlus className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">Nouveau Client</h2>
                <p className="text-muted-foreground font-medium">Ajouter un nouveau profil client au système</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informations Personnelles */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                  <User className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Identité</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-xs font-bold uppercase text-muted-foreground ml-1">Nom de famille *</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-medium"
                      placeholder="Ex: BENNANI"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-xs font-bold uppercase text-muted-foreground ml-1">Prénom</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-medium"
                      placeholder="Ex: Amine"
                    />
                  </div>
                </div>
              </div>

              {/* Contact et Adresse */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Contact & Adresse</h4>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold uppercase text-muted-foreground ml-1">Numéro de téléphone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-medium"
                      placeholder="+212 600-000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_morocco" className="text-xs font-bold uppercase text-muted-foreground ml-1">Adresse au Maroc</Label>
                    <Input
                      id="address_morocco"
                      name="address_morocco"
                      value={formData.address_morocco}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-medium"
                      placeholder="Adresse complète..."
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="md:col-span-2 space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                  <IdCard className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Documents Officiels</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cin" className="text-xs font-bold uppercase text-muted-foreground ml-1">N° CIN</Label>
                    <Input
                      id="cin"
                      name="cin"
                      value={formData.cin}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-bold"
                      placeholder="Ex: AB123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_number" className="text-xs font-bold uppercase text-muted-foreground ml-1">N° Permis de conduire</Label>
                    <Input
                      id="license_number"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-12 rounded-[var(--radius)] focus:border-primary/30 transition-all font-bold"
                      placeholder="Ex: 01/123456"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-primary/10">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-[var(--radius)] font-bold uppercase tracking-wider flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
              <Button 
                type="submit"
                className="h-12 px-10 rounded-[var(--radius)] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                <Check className="h-5 w-5" />
                Enregistrer
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerFormDialog;
