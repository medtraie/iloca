
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Phone, MapPin, CreditCard, Car, Globe } from "lucide-react";
import { Tenant } from "@/pages/Customers";
import TenantDocumentUploader from "./TenantDocumentUploader";
import TenantPersonalInfoFields from "./tenants/TenantPersonalInfoFields";
import TenantContactFields from "./tenants/TenantContactFields";
import TenantIdentityFields from "./tenants/TenantIdentityFields";
import TenantTypeFields from "./tenants/TenantTypeFields";
import { useToast } from "@/hooks/use-toast";

interface TenantFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>) => boolean;
  tenant?: Tenant | null;
  nationalities?: string[];
}

const TenantFormDialog = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  tenant,
  nationalities = []
}: TenantFormDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    dateNaissance: "",
    telephone: "",
    adresse: "",
    cin: "",
    dateCin: "",
    permis: "",
    datePermis: "",
    passeport: "",
    nationalite: "Marocaine",
    type: "Locataire Principal" as "Locataire Principal" | "Chauffeur secondaire",
    cinImageUrl: "",
    permisImageUrl: "",
    passeportImageUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // قائمة جنسيات محلية مع قيم افتراضية
  const [localNationalities, setLocalNationalities] = useState<string[]>([]);
  useEffect(() => {
    const defaultNats = ["Marocaine", "Française", "Espagnole", "Italienne", "Allemande"];
    const unique = Array.from(new Set([...(nationalities || []), ...defaultNats]));
    setLocalNationalities(unique);
  }, [nationalities, isOpen]);

  useEffect(() => {
    if (tenant) {
      setFormData({
        nom: tenant.nom || "",
        prenom: tenant.prenom || "",
        dateNaissance: tenant.dateNaissance || "",
        telephone: tenant.telephone || "",
        adresse: tenant.adresse || "",
        cin: tenant.cin || "",
        dateCin: tenant.dateCin || "",
        permis: tenant.permis || "",
        datePermis: tenant.datePermis || "",
        passeport: tenant.passeport || "",
        nationalite: tenant.nationalite || "Marocaine",
        type: tenant.type || "Locataire Principal",
        cinImageUrl: tenant.cinImageUrl || "",
        permisImageUrl: tenant.permisImageUrl || "",
        passeportImageUrl: tenant.passeportImageUrl || "",
      });
    } else {
      setFormData({
        nom: "",
        prenom: "",
        dateNaissance: "",
        telephone: "",
        adresse: "",
        cin: "",
        dateCin: "",
        permis: "",
        datePermis: "",
        passeport: "",
        nationalite: "Marocaine",
        type: "Locataire Principal",
        cinImageUrl: "",
        permisImageUrl: "",
        passeportImageUrl: "",
      });
    }
    setErrors({});
  }, [tenant, isOpen]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = "Le nom est requis";
    if (!formData.prenom.trim()) newErrors.prenom = "Le prénom est requis";
    if (!formData.dateNaissance) newErrors.dateNaissance = "La date de naissance est requise";
    if (!formData.telephone.trim()) newErrors.telephone = "Le téléphone est requis";
    if (!formData.adresse.trim()) newErrors.adresse = "L'adresse est requise";
    if (!formData.cin.trim()) newErrors.cin = "Le CIN est requis";
    if (!formData.dateCin) newErrors.dateCin = "La date CIN est requise";
    if (!formData.permis.trim()) newErrors.permis = "Le permis est requis";
    if (!formData.datePermis) newErrors.datePermis = "La date permis est requise";
    if (!formData.nationalite) newErrors.nationalite = "La nationalité est requise";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstKey = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstKey);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // حاول تركيز المؤشر إذا كان إدخالاً
          // @ts-ignore
          el.focus?.();
        }
      }, 0);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erreur",
        description: "Veuillez compléter les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    const success = onSubmit(formData);
    if (success) {
      onClose();
    }
  };

  const handleAddNationality = (newNat: string) => {
    const value = newNat.trim();
    if (!value) return;
    setLocalNationalities(prev => (prev.includes(value) ? prev : [...prev, value]));
    handleFieldChange("nationalite", value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {tenant ? "Modifier le locataire" : "Ajouter un nouveau locataire"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <TenantPersonalInfoFields
            nom={formData.nom}
            prenom={formData.prenom}
            dateNaissance={formData.dateNaissance}
            errors={errors}
            onChange={handleFieldChange}
          />

          <TenantContactFields
            telephone={formData.telephone}
            adresse={formData.adresse}
            errors={errors}
            onChange={handleFieldChange}
          />

          <TenantIdentityFields
            cin={formData.cin}
            dateCin={formData.dateCin}
            permis={formData.permis}
            datePermis={formData.datePermis}
            passeport={formData.passeport}
            cinImageUrl={formData.cinImageUrl}
            permisImageUrl={formData.permisImageUrl}
            passeportImageUrl={formData.passeportImageUrl}
            errors={errors}
            onChange={handleFieldChange}
          />

          <TenantTypeFields
            nationalite={formData.nationalite}
            type={formData.type}
            errors={errors}
            onChange={handleFieldChange}
            nationalities={localNationalities}
            onAddNationality={handleAddNationality}
          />

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {tenant ? "Mettre à jour" : "Ajouter"} le locataire
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TenantFormDialog;
