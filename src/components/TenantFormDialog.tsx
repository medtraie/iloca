import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, Phone, MapPin, CreditCard, Globe, X, Check, FileText, 
  Sparkles, Loader2, Calendar, ShieldCheck, Upload, Trash2, 
  ChevronRight, ChevronLeft, Image as ImageIcon, Plus, Star 
} from "lucide-react";
import { Tenant } from "@/types/appData";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface TenantFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">) => boolean | Promise<boolean>;
  tenant?: Tenant | null;
  nationalities?: string[];
}

const POPULAR_NATIONALITIES = [
  "Marocaine", "Française", "Espagnole", "Italienne", "Allemande", 
  "Belge", "Canadienne", "Américaine", "Britannique", "Émiratie", "Saoudienne", "Néerlandaise"
];

const TenantFormDialog: React.FC<TenantFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tenant,
  nationalities = [],
}) => {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<number>(1);
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
    tenantImageUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenant && isOpen) {
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
        tenantImageUrl: tenant.tenantImageUrl || "",
      });
      setActiveStep(1);
    } else if (isOpen) {
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
        tenantImageUrl: "",
      });
      setActiveStep(1);
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

  const handleImageUpload = (field: "cinImageUrl" | "permisImageUrl" | "passeportImageUrl" | "tenantImageUrl", e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > height && width > maxDim) {
          height *= maxDim / width;
          width = maxDim;
        } else if (height > maxDim) {
          width *= maxDim / height;
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        handleFieldChange(field, canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => {
        handleFieldChange(field, event.target?.result as string);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nom.trim()) newErrors.nom = "Le nom est obligatoire";
    if (!formData.prenom.trim()) newErrors.prenom = "Le prénom est obligatoire";
    if (!formData.telephone.trim()) newErrors.telephone = "Le numéro de téléphone est obligatoire";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.cin.trim() && !formData.passeport.trim()) {
      newErrors.cin = "Veuillez renseigner le CIN ou le numéro de passeport";
    }
    if (!formData.permis.trim()) {
      newErrors.permis = "Le numéro de permis de conduire est obligatoire";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateStep1()) {
      setActiveStep(1);
      return;
    }
    if (!validateStep2()) {
      setActiveStep(2);
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onSubmit({
        nom: formData.nom.trim().toUpperCase(),
        prenom: formData.prenom.trim(),
        dateNaissance: formData.dateNaissance,
        telephone: formData.telephone.trim(),
        adresse: formData.adresse.trim(),
        cin: formData.cin.trim().toUpperCase(),
        dateCin: formData.dateCin,
        permis: formData.permis.trim().toUpperCase(),
        datePermis: formData.datePermis,
        passeport: formData.passeport.trim().toUpperCase(),
        nationalite: formData.nationalite,
        type: formData.type,
        cinImageUrl: formData.cinImageUrl,
        permisImageUrl: formData.permisImageUrl,
        passeportImageUrl: formData.passeportImageUrl,
        tenantImageUrl: formData.tenantImageUrl,
      });

      if (success !== false) {
        onClose();
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, label: "Profil & Contact", icon: User, desc: "Identité & coordonnées" },
    { id: 2, label: "Pièces & Permis", icon: CreditCard, desc: "CIN, permis & passeport" },
    { id: 3, label: "Scans & Photo", icon: ShieldCheck, desc: "Documents & justificatifs" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl p-0 overflow-hidden border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl rounded-3xl max-h-[92vh] flex flex-col">
        <DialogTitle className="sr-only">
          {tenant ? "Modifier le locataire" : "Nouveau locataire"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulaire complet d'enregistrement et d'onboarding client.
        </DialogDescription>

        {/* 2026 Header Wizard Banner */}
        <div className="relative p-6 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
                <User className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    CRM Onboarding 2026
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">• Étape {activeStep}/3</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
                  {tenant ? "Fiche Client & Identité" : "Nouveau Client / Locataire"}
                </h2>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fermer"
              className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-3 border-t border-border/30">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isCompleted = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id === 2 && !validateStep1()) return;
                    if (step.id === 3 && (!validateStep1() || !validateStep2())) return;
                    setActiveStep(step.id);
                  }}
                  className={`flex items-center gap-2 p-2 rounded-2xl transition-all text-left ${
                    isActive 
                      ? "bg-foreground text-background shadow-md" 
                      : isCompleted
                        ? "bg-accent/15 text-accent hover:bg-accent/20"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                    isActive 
                      ? "bg-background text-foreground" 
                      : isCompleted 
                        ? "bg-accent text-accent-foreground" 
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                  </div>
                  <div className="hidden sm:block min-w-0">
                    <p className="text-xs font-black truncate leading-tight">{step.label}</p>
                    <p className={`text-[10px] truncate ${isActive ? "text-background/70" : "text-muted-foreground"}`}>
                      {step.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Wizard Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: PROFIL & CONTACT */}
            {activeStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    Informations Personnelles & Coordonnées
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saisissez l'identité du client et son rôle dans la location.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Type de Client */}
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs font-bold uppercase text-foreground">Type de locataire *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleFieldChange("type", "Locataire Principal")}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          formData.type === "Locataire Principal"
                            ? "bg-accent/15 border-accent text-accent font-black shadow-xs"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black">Locataire Principal</p>
                          <p className="text-[10px] opacity-80">Signataire du contrat</p>
                        </div>
                        {formData.type === "Locataire Principal" && <Check className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleFieldChange("type", "Chauffeur secondaire")}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          formData.type === "Chauffeur secondaire"
                            ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-black shadow-xs"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-black">Chauffeur Secondaire</p>
                          <p className="text-[10px] opacity-80">Conducteur additionnel</p>
                        </div>
                        {formData.type === "Chauffeur secondaire" && <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-xs font-bold uppercase text-foreground">
                      Nom de famille *
                    </Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => handleFieldChange("nom", e.target.value)}
                      placeholder="Ex: BENALI"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold uppercase"
                    />
                    {errors.nom && <p className="text-destructive text-xs font-bold">{errors.nom}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prenom" className="text-xs font-bold uppercase text-foreground">
                      Prénom *
                    </Label>
                    <Input
                      id="prenom"
                      value={formData.prenom}
                      onChange={(e) => handleFieldChange("prenom", e.target.value)}
                      placeholder="Ex: Mohamed"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                    {errors.prenom && <p className="text-destructive text-xs font-bold">{errors.prenom}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telephone" className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-accent" />
                      Numéro de Téléphone / WhatsApp *
                    </Label>
                    <Input
                      id="telephone"
                      value={formData.telephone}
                      onChange={(e) => handleFieldChange("telephone", e.target.value)}
                      placeholder="Ex: 06 12 34 56 78"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-bold"
                    />
                    {errors.telephone && <p className="text-destructive text-xs font-bold">{errors.telephone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateNaissance" className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Date de Naissance
                    </Label>
                    <Input
                      id="dateNaissance"
                      type="date"
                      value={formData.dateNaissance}
                      onChange={(e) => handleFieldChange("dateNaissance", e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  {/* Nationalité Chips */}
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-accent" />
                      Nationalité du locataire
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_NATIONALITIES.map((nat) => (
                        <button
                          key={nat}
                          type="button"
                          onClick={() => handleFieldChange("nationalite", nat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            formData.nationalite === nat
                              ? "bg-accent text-accent-foreground shadow-xs scale-105 font-black"
                              : "bg-muted/40 hover:bg-muted/70 text-foreground border border-border/40"
                          }`}
                        >
                          {nat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="adresse" className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Adresse de résidence (Maroc ou Étranger)
                    </Label>
                    <Input
                      id="adresse"
                      value={formData.adresse}
                      onChange={(e) => handleFieldChange("adresse", e.target.value)}
                      placeholder="Ex: 12 Rue Hassan II, Casablanca"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PIÈCES & PERMIS */}
            {activeStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-accent" />
                    Pièces d'Identité & Permis de Conduire
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Informations légales obligatoires pour la rédaction du contrat de location.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* CIN */}
                  <div className="space-y-2">
                    <Label htmlFor="cin" className="text-xs font-bold uppercase text-foreground">
                      Numéro CIN (Carte Nationale) *
                    </Label>
                    <Input
                      id="cin"
                      value={formData.cin}
                      onChange={(e) => handleFieldChange("cin", e.target.value)}
                      placeholder="Ex: AB123456"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-black uppercase text-sm"
                    />
                    {errors.cin && <p className="text-destructive text-xs font-bold">{errors.cin}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateCin" className="text-xs font-bold uppercase text-foreground">
                      Date de délivrance / Validité CIN
                    </Label>
                    <Input
                      id="dateCin"
                      type="date"
                      value={formData.dateCin}
                      onChange={(e) => handleFieldChange("dateCin", e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  {/* Permis de conduire */}
                  <div className="space-y-2">
                    <Label htmlFor="permis" className="text-xs font-bold uppercase text-foreground">
                      Numéro de Permis de Conduire *
                    </Label>
                    <Input
                      id="permis"
                      value={formData.permis}
                      onChange={(e) => handleFieldChange("permis", e.target.value)}
                      placeholder="Ex: 12/345678"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-black uppercase text-sm"
                    />
                    {errors.permis && <p className="text-destructive text-xs font-bold">{errors.permis}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="datePermis" className="text-xs font-bold uppercase text-foreground">
                      Date de délivrance Permis
                    </Label>
                    <Input
                      id="datePermis"
                      type="date"
                      value={formData.datePermis}
                      onChange={(e) => handleFieldChange("datePermis", e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  {/* Passeport */}
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="passeport" className="text-xs font-bold uppercase text-foreground">
                      Numéro de Passeport (Obligatoire pour les clients étrangers / MRE)
                    </Label>
                    <Input
                      id="passeport"
                      value={formData.passeport}
                      onChange={(e) => handleFieldChange("passeport", e.target.value)}
                      placeholder="Ex: FA1234567"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-black uppercase"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: SCANS & PHOTO */}
            {activeStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    Scans Numériques & Pièces Justificatives
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attachez les photos de la CIN, du permis et la photo de profil du locataire.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Scan CIN */}
                  <div className="p-4 rounded-3xl bg-muted/20 border border-border/50 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-black uppercase text-foreground">Scan CIN</span>
                    <div className="w-full aspect-4/3 rounded-2xl bg-muted/40 border border-dashed border-border/60 overflow-hidden flex items-center justify-center relative group">
                      {formData.cinImageUrl ? (
                        <>
                          <img src={formData.cinImageUrl} alt="Scan CIN" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleFieldChange("cinImageUrl", "")}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center p-3">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-bold text-muted-foreground">Importer CIN</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload("cinImageUrl", e)} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Scan Permis */}
                  <div className="p-4 rounded-3xl bg-muted/20 border border-border/50 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-black uppercase text-foreground">Scan Permis</span>
                    <div className="w-full aspect-4/3 rounded-2xl bg-muted/40 border border-dashed border-border/60 overflow-hidden flex items-center justify-center relative group">
                      {formData.permisImageUrl ? (
                        <>
                          <img src={formData.permisImageUrl} alt="Scan Permis" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleFieldChange("permisImageUrl", "")}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center p-3">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-bold text-muted-foreground">Importer Permis</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload("permisImageUrl", e)} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Scan Passeport */}
                  <div className="p-4 rounded-3xl bg-muted/20 border border-border/50 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-black uppercase text-foreground">Scan Passeport</span>
                    <div className="w-full aspect-4/3 rounded-2xl bg-muted/40 border border-dashed border-border/60 overflow-hidden flex items-center justify-center relative group">
                      {formData.passeportImageUrl ? (
                        <>
                          <img src={formData.passeportImageUrl} alt="Scan Passeport" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleFieldChange("passeportImageUrl", "")}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center p-3">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-bold text-muted-foreground">Importer Passeport</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload("passeportImageUrl", e)} />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Photo Client */}
                  <div className="p-4 rounded-3xl bg-muted/20 border border-border/50 flex flex-col items-center text-center space-y-3">
                    <span className="text-xs font-black uppercase text-foreground">Photo Profil</span>
                    <div className="w-full aspect-4/3 rounded-2xl bg-muted/40 border border-dashed border-border/60 overflow-hidden flex items-center justify-center relative group">
                      {formData.tenantImageUrl ? (
                        <>
                          <img src={formData.tenantImageUrl} alt="Photo Client" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleFieldChange("tenantImageUrl", "")}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-destructive"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center p-3">
                          <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-bold text-muted-foreground">Photo Client</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload("tenantImageUrl", e)} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-5 sm:p-6 bg-card border-t border-border/40 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (activeStep > 1) {
                setActiveStep((prev) => prev - 1);
              } else {
                onClose();
              }
            }}
            className="h-11 px-5 rounded-2xl font-bold text-xs border-border/60"
          >
            {activeStep > 1 ? (
              <>
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Précédent
              </>
            ) : (
              "Annuler"
            )}
          </Button>

          <div className="flex items-center gap-2">
            {activeStep < 3 ? (
              <Button
                type="button"
                onClick={() => {
                  if (activeStep === 1 && !validateStep1()) return;
                  if (activeStep === 2 && !validateStep2()) return;
                  setActiveStep((prev) => prev + 1);
                }}
                className="h-11 px-6 rounded-2xl font-black text-xs bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              >
                Suivant <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="h-11 px-8 rounded-2xl font-black text-xs bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
                    {tenant ? "Enregistrer les modifications" : "Créer le locataire"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TenantFormDialog;
