
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, User, Phone, MapPin, CreditCard, Car, Globe, X, Check, FileText, Sparkles, Loader2 } from "lucide-react";
import { Tenant } from "@/pages/Customers";
import TenantDocumentUploader from "./TenantDocumentUploader";
import { useToast } from "@/hooks/use-toast";

interface TenantFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => boolean | Promise<boolean>;
  tenant?: Tenant | null;
  nationalities?: string[];
}

const TenantFormDialog = ({
  isOpen,
  onClose,
  onSubmit,
  tenant,
  nationalities = [],
}: TenantFormDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const [newNationality, setNewNationality] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // قائمة جنسيات محلية مع قيم افتراضية
  const [localNationalities, setLocalNationalities] = useState<string[]>([]);
  useEffect(() => {
    const defaultNats = ["Marocaine", "Française", "Espagnole", "Italienne", "Allemande", "Belge", "Canadienne", "Américaine", "Britannique", "Émiratie", "Saoudienne"];
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
    setIsSubmitting(false);
  }, [tenant, isOpen]);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = "Le nom est requis";
    if (!formData.prenom.trim()) newErrors.prenom = "Le prénom est requis";
    if (!formData.telephone.trim()) newErrors.telephone = "Le numéro de téléphone est requis";
    if (!formData.cin.trim()) newErrors.cin = "Le numéro CIN est requis";
    if (!formData.permis.trim()) newErrors.permis = "Le numéro de permis est requis";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstKey = Object.keys(newErrors)[0];
      setTimeout(() => {
        const el = document.getElementById(firstKey);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // @ts-ignore
          el.focus?.();
        }
      }, 50);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Champs requis manquants",
        description: "Veuillez remplir les informations obligatoires (Nom, Prénom, Téléphone, CIN, Permis).",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onSubmit(formData);
      if (success) {
        onClose();
      }
    } catch (err) {
      console.error("Error submitting tenant:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNationality = () => {
    const value = newNationality.trim();
    if (!value) return;
    setLocalNationalities((prev) => (prev.includes(value) ? prev : [...prev, value]));
    handleFieldChange("nationalite", value);
    setNewNationality("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[96vw] sm:max-w-4xl p-0 overflow-hidden border border-primary/20 bg-background shadow-2xl max-h-[92vh] flex flex-col rounded-2xl">
        <div className="bg-card/95 backdrop-blur-xl flex flex-col h-full max-h-[92vh]">
          {/* Header (Sticky / Shrink-0) */}
          <div className="relative h-20 sm:h-24 bg-primary/10 border-b border-primary/15 flex items-center justify-between px-6 sm:px-8 shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 relative z-10">
              <div className="p-2.5 sm:p-3 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                <User className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-black tracking-tight uppercase leading-none">
                  {tenant ? "Modifier le" : "Nouveau"} <span className="text-primary">Locataire</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                  {tenant ? "Mise à jour des coordonnées et documents" : "Enregistrement d'un client dans le système"}
                </p>
              </div>
            </div>
          </div>

          {/* Form Scrollable Body */}
          <form id="tenant-form" onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
            {/* Section 1: Informations Personnelles */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                <User className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Informations Personnelles
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom" className="text-xs font-bold uppercase text-muted-foreground">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => handleFieldChange("nom", e.target.value)}
                    placeholder="Nom de famille"
                    className={`bg-background/50 border-primary/20 h-10 ${errors.nom ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.nom && <p className="text-destructive text-xs font-medium">{errors.nom}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prenom" className="text-xs font-bold uppercase text-muted-foreground">
                    Prénom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => handleFieldChange("prenom", e.target.value)}
                    placeholder="Prénom"
                    className={`bg-background/50 border-primary/20 h-10 ${errors.prenom ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.prenom && <p className="text-destructive text-xs font-medium">{errors.prenom}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateNaissance" className="text-xs font-bold uppercase text-muted-foreground">
                    Date de naissance
                  </Label>
                  <Input
                    id="dateNaissance"
                    type="date"
                    value={formData.dateNaissance}
                    onChange={(e) => handleFieldChange("dateNaissance", e.target.value)}
                    className="bg-background/50 border-primary/20 h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalite" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-primary" /> Nationalité
                  </Label>
                  <Select value={formData.nationalite} onValueChange={(val) => handleFieldChange("nationalite", val)}>
                    <SelectTrigger className="bg-background/50 border-primary/20 h-10">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {localNationalities.map((nat) => (
                        <SelectItem key={nat} value={nat}>
                          {nat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type" className="text-xs font-bold uppercase text-muted-foreground">
                    Type de locataire
                  </Label>
                  <Select value={formData.type} onValueChange={(val: any) => handleFieldChange("type", val)}>
                    <SelectTrigger className="bg-background/50 border-primary/20 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Locataire Principal">Locataire Principal</SelectItem>
                      <SelectItem value="Chauffeur secondaire">Chauffeur secondaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">
                    Autre nationalité
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajouter une nationalité"
                      value={newNationality}
                      onChange={(e) => setNewNationality(e.target.value)}
                      className="bg-background/50 border-primary/20 h-10 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNationality();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddNationality}
                      className="h-10 px-3 shrink-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Coordonnées */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                <Phone className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Contact & Coordonnées
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-primary" /> Téléphone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => handleFieldChange("telephone", e.target.value)}
                    placeholder="+212 612-345678"
                    className={`bg-background/50 border-primary/20 h-10 ${errors.telephone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  />
                  {errors.telephone && <p className="text-destructive text-xs font-medium">{errors.telephone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Adresse
                  </Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => handleFieldChange("adresse", e.target.value)}
                    placeholder="Adresse complète (Ville, Quartier...)"
                    className="bg-background/50 border-primary/20 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pièces d'identité & Permis */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Pièces d'identité & Permis de Conduire
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Carte d'identité Nationale (CIN) */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" /> CIN (Carte d'Identité) <span className="text-destructive">*</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="cin" className="text-[11px] font-semibold text-muted-foreground">N° CIN *</Label>
                      <Input
                        id="cin"
                        value={formData.cin}
                        onChange={(e) => handleFieldChange("cin", e.target.value)}
                        placeholder="Ex: AB123456"
                        className={`bg-background border-primary/20 h-9 font-mono ${errors.cin ? "border-destructive" : ""}`}
                      />
                      {errors.cin && <p className="text-destructive text-[11px]">{errors.cin}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="dateCin" className="text-[11px] font-semibold text-muted-foreground">Date délivrance</Label>
                      <Input
                        id="dateCin"
                        type="date"
                        value={formData.dateCin}
                        onChange={(e) => handleFieldChange("dateCin", e.target.value)}
                        className="bg-background border-primary/20 h-9"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10">
                    <TenantDocumentUploader
                      label="Document CIN (Image ou PDF)"
                      initialUrl={formData.cinImageUrl}
                      storagePrefix="cin"
                      onUploaded={(url) => handleFieldChange("cinImageUrl", url)}
                    />
                  </div>
                </div>

                {/* Permis de Conduire */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                      <Car className="h-4 w-4 text-primary" /> Permis de Conduire <span className="text-destructive">*</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="permis" className="text-[11px] font-semibold text-muted-foreground">N° Permis *</Label>
                      <Input
                        id="permis"
                        value={formData.permis}
                        onChange={(e) => handleFieldChange("permis", e.target.value)}
                        placeholder="Ex: P1234567"
                        className={`bg-background border-primary/20 h-9 font-mono ${errors.permis ? "border-destructive" : ""}`}
                      />
                      {errors.permis && <p className="text-destructive text-[11px]">{errors.permis}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="datePermis" className="text-[11px] font-semibold text-muted-foreground">Date délivrance</Label>
                      <Input
                        id="datePermis"
                        type="date"
                        value={formData.datePermis}
                        onChange={(e) => handleFieldChange("datePermis", e.target.value)}
                        className="bg-background border-primary/20 h-9"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10">
                    <TenantDocumentUploader
                      label="Document Permis (Image ou PDF)"
                      initialUrl={formData.permisImageUrl}
                      storagePrefix="permis"
                      onUploaded={(url) => handleFieldChange("permisImageUrl", url)}
                    />
                  </div>
                </div>

                {/* Passeport (Optionnel) */}
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> Passeport (Optionnel pour clients étrangers)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="passeport" className="text-[11px] font-semibold text-muted-foreground">N° Passeport</Label>
                      <Input
                        id="passeport"
                        value={formData.passeport}
                        onChange={(e) => handleFieldChange("passeport", e.target.value)}
                        placeholder="Ex: A01234567"
                        className="bg-background border-primary/20 h-9 font-mono"
                      />
                    </div>

                    <div className="pt-1">
                      <TenantDocumentUploader
                        label="Document Passeport (Image ou PDF)"
                        initialUrl={formData.passeportImageUrl}
                        storagePrefix="passeport"
                        onUploaded={(url) => handleFieldChange("passeportImageUrl", url)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Footer (Sticky / Shrink-0) */}
          <div className="p-4 sm:px-8 border-t border-border/40 bg-card/90 backdrop-blur shrink-0 flex items-center justify-end gap-3 z-10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-6 font-semibold"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              form="tenant-form"
              disabled={isSubmitting}
              className="h-10 px-6 font-bold shadow-md shadow-primary/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {tenant ? "Mettre à jour" : "Enregistrer le locataire"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantFormDialog;

