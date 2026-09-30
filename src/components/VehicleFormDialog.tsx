import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Vehicle } from "@/hooks/useVehicles";
import { 
  Car, Settings, Calendar, Fuel, Disc, Palette, CreditCard, 
  Image as ImageIcon, FileText, Upload, Trash2, X, Check, Plus, 
  ChevronRight, ChevronLeft, Sparkles, ShieldCheck, Star, Gauge, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>, docUploads?: DocumentUploadType[]) => void;
  vehicle?: Vehicle | null;
}

export type DocumentUploadType = {
  file: File;
  type: string;
  expiry?: string;
  name: string;
};

const DOCUMENT_TYPES = [
  { value: "carte_grise", label: "Carte grise" },
  { value: "assurance", label: "Police d'assurance" },
  { value: "visite_technique", label: "Contrôle / Visite technique" },
  { value: "contrat", label: "Contrat / Facture d'achat" },
  { value: "vignette", label: "Taxe & Vignette annuelle" },
  { value: "autre", label: "Autre pièce justificative" },
];

const POPULAR_BRANDS = [
  "Dacia", "Renault", "Peugeot", "Volkswagen", "Hyundai", "Toyota", 
  "Mercedes-Benz", "BMW", "Audi", "Kia", "Citroën", "Fiat", "Jeep", "Nissan"
];

const VehicleFormDialog: React.FC<VehicleFormDialogProps> = ({ open, onOpenChange, onSave, vehicle }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    registration: "",
    year: "",
    marque: "",
    modele: "",
    immatriculation: "",
    annee: "",
    type_carburant: "Essence",
    boite_vitesse: "Manuelle",
    kilometrage: "",
    couleur: "Blanc",
    prix_par_jour: "",
    etat_vehicule: "disponible",
    km_depart: "",
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState<DocumentUploadType[]>([]);
  const [docType, setDocType] = useState("carte_grise");
  const [docExpiry, setDocExpiry] = useState("");
  const [docName, setDocName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize form state
  useEffect(() => {
    if (open && vehicle) {
      setFormData({
        brand: vehicle.brand || vehicle.marque || "",
        model: vehicle.model || vehicle.modele || "",
        registration: vehicle.registration || vehicle.immatriculation || "",
        year: vehicle.year?.toString() || vehicle.annee?.toString() || "",
        marque: vehicle.marque || vehicle.brand || "",
        modele: vehicle.modele || vehicle.model || "",
        immatriculation: vehicle.immatriculation || vehicle.registration || "",
        annee: vehicle.annee?.toString() || vehicle.year?.toString() || "",
        type_carburant: vehicle.type_carburant || "Essence",
        boite_vitesse: vehicle.boite_vitesse || "Manuelle",
        kilometrage: vehicle.kilometrage?.toString() || "0",
        couleur: vehicle.couleur || "Blanc",
        prix_par_jour: vehicle.prix_par_jour?.toString() || "200",
        etat_vehicule: vehicle.etat_vehicule || "disponible",
        km_depart: vehicle.km_depart?.toString() || "0",
      });
      setPhotos(Array.isArray(vehicle.photos) ? vehicle.photos : []);
      setActiveStep(1);
    } else if (open) {
      setFormData({
        brand: "",
        model: "",
        registration: "",
        year: new Date().getFullYear().toString(),
        marque: "",
        modele: "",
        immatriculation: "",
        annee: new Date().getFullYear().toString(),
        type_carburant: "Essence",
        boite_vitesse: "Manuelle",
        kilometrage: "0",
        couleur: "Blanc",
        prix_par_jour: "250",
        etat_vehicule: "disponible",
        km_depart: "0",
      });
      setPhotos([]);
      setDocs([]);
      setActiveStep(1);
    }
  }, [open, vehicle]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];

    for (const file of files) {
      const compressedDataUrl = await new Promise<string>((resolve) => {
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
            resolve(canvas.toDataURL("image/jpeg", 0.75));
          };
          img.onerror = () => {
            resolve(event.target?.result as string);
          };
          img.src = event.target?.result as string;
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      if (compressedDataUrl) {
        urls.push(compressedDataUrl);
      }
    }
    
    setPhotos((prev) => [...prev, ...urls]);
    setUploading(false);
    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetCoverPhoto = (index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  const handleDocAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) return;
    const file = e.target.files[0];
    setDocs(prev => [
      ...prev,
      {
        file,
        type: docType,
        expiry: docExpiry,
        name: docName || file.name,
      }
    ]);
    setDocType("carte_grise");
    setDocExpiry("");
    setDocName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveDoc = (idx: number) => {
    setDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const marque = formData.marque.trim() || formData.brand.trim();
    if (!marque) {
      setActiveStep(1);
      return;
    }

    const vehicleData = {
      brand: marque,
      model: formData.modele || formData.model || undefined,
      registration: formData.immatriculation || formData.registration || undefined,
      year: formData.annee ? parseInt(formData.annee) : undefined,
      marque: marque,
      modele: formData.modele || formData.model || undefined,
      immatriculation: formData.immatriculation || formData.registration || undefined,
      annee: formData.annee ? parseInt(formData.annee) : undefined,
      type_carburant: formData.type_carburant,
      boite_vitesse: formData.boite_vitesse,
      kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : 0,
      couleur: formData.couleur,
      prix_par_jour: formData.prix_par_jour ? parseFloat(formData.prix_par_jour) : 200,
      etat_vehicule: formData.etat_vehicule,
      km_depart: formData.km_depart ? parseInt(formData.km_depart) : 0,
      documents: [],
      photos: photos,
    };

    onSave(vehicleData, docs);
    onOpenChange(false);
  };

  const steps = [
    { id: 1, label: "Identité & Style", icon: Car, desc: "Marque, modèle & matricule" },
    { id: 2, label: "Télémétrie & Tarifs", icon: Gauge, desc: "Compteur, carburant & prix" },
    { id: 3, label: "Studio Photos", icon: ImageIcon, desc: "Galerie & couverture" },
    { id: 4, label: "Documents Légaux", icon: ShieldCheck, desc: "Assurance & conformité" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl p-0 overflow-hidden border border-border/60 bg-card/95 backdrop-blur-2xl shadow-2xl rounded-3xl max-h-[92vh] flex flex-col">
        <DialogTitle className="sr-only">
          {vehicle ? "Modifier le véhicule" : "Ajouter un nouveau véhicule"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulaire complet d'enregistrement et de configuration d'un véhicule de flotte.
        </DialogDescription>

        {/* 2026 Header Wizard Banner */}
        <div className="relative p-6 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent border-b border-border/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
                <Car className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    Fleet Studio 2026
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">• Étape {activeStep}/4</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
                  {vehicle ? "Configuration du Véhicule" : "Nouveau Véhicule de Flotte"}
                </h2>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              aria-label="Fermer"
              className="rounded-xl h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Stepper Navigation Bar */}
          <div className="grid grid-cols-4 gap-2 mt-5 pt-3 border-t border-border/30">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const isCompleted = activeStep > step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
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

        {/* Wizard Form Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          <AnimatePresence mode="wait">
            {/* STEP 1: IDENTITÉ & STYLE */}
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
                    <Car className="w-4 h-4 text-accent" />
                    Identité & Caractéristiques du Véhicule
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Définissez la marque, le modèle et l'immatriculation officielle.
                  </p>
                </div>

                {/* Quick Brand Selector Pills */}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                    Sélection rapide de marque
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_BRANDS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, marque: b, brand: b }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          (formData.marque || formData.brand).toLowerCase() === b.toLowerCase()
                            ? "bg-accent text-accent-foreground shadow-sm scale-105 font-black"
                            : "bg-muted/40 hover:bg-muted/70 text-foreground border border-border/40"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marque" className="text-xs font-bold uppercase text-foreground">
                      Marque *
                    </Label>
                    <Input
                      id="marque"
                      name="marque"
                      value={formData.marque || formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value, brand: e.target.value }))}
                      required
                      placeholder="Ex: DACIA, RENAULT, PEUGEOT..."
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modele" className="text-xs font-bold uppercase text-foreground">
                      Modèle *
                    </Label>
                    <Input
                      id="modele"
                      name="modele"
                      value={formData.modele || formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value, model: e.target.value }))}
                      placeholder="Ex: CLIO 5, 208 GT, DUSTER..."
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="immatriculation" className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <span>Immatriculation / Matricule *</span>
                      <span className="text-[10px] font-normal text-muted-foreground">(Ex: 12345-A-6)</span>
                    </Label>
                    <Input
                      id="immatriculation"
                      name="immatriculation"
                      value={formData.immatriculation || formData.registration}
                      onChange={(e) => setFormData(prev => ({ ...prev, immatriculation: e.target.value, registration: e.target.value }))}
                      placeholder="Ex: 54321-B-26"
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-black tracking-wider text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="annee" className="text-xs font-bold uppercase text-foreground">
                      Année de fabrication / modèle
                    </Label>
                    <Input
                      id="annee"
                      name="annee"
                      type="number"
                      min="1990"
                      max={new Date().getFullYear() + 2}
                      value={formData.annee || formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, annee: e.target.value, year: e.target.value }))}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="couleur" className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-accent" />
                      Couleur extérieure
                    </Label>
                    <Input
                      id="couleur"
                      name="couleur"
                      value={formData.couleur}
                      onChange={handleInputChange}
                      placeholder="Ex: Noir Métallisé, Blanc Nacré, Gris Shark..."
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-foreground">
                      Statut Opérationnel Initial
                    </Label>
                    <Select 
                      value={formData.etat_vehicule} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, etat_vehicule: val }))}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/60">
                        <SelectItem value="disponible">🟢 Disponible (Prêt à louer)</SelectItem>
                        <SelectItem value="loue">🔵 En Location (Actuellement loué)</SelectItem>
                        <SelectItem value="maintenance">🟡 En Maintenance / Révision</SelectItem>
                        <SelectItem value="horsService">🔴 Hors Service (Immobilisé)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: TÉLÉMÉTRIE & TARIFICATION */}
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
                    <Gauge className="w-4 h-4 text-accent" />
                    Télémétrie, Mécanique & Tarification
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configurez le tarif journalier de location et l'odomètre.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prix par jour */}
                  <div className="sm:col-span-2 p-5 rounded-3xl bg-accent/10 border border-accent/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prix_par_jour" className="text-xs font-black uppercase text-accent tracking-wider">
                        Tarif Journalier Standard (DH / Jour) *
                      </Label>
                      <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded-full bg-accent/20">
                        Prix de base recommandé
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="prix_par_jour"
                        name="prix_par_jour"
                        type="number"
                        min="0"
                        step="10"
                        value={formData.prix_par_jour}
                        onChange={handleInputChange}
                        className="h-14 rounded-2xl bg-background border-accent/40 font-black text-2xl text-accent pl-4 pr-16"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-sm text-accent">
                        MAD / j
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-accent" /> Type de Carburant
                    </Label>
                    <Select 
                      value={formData.type_carburant} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, type_carburant: val }))}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold">
                        <SelectValue placeholder="Carburant" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/60">
                        <SelectItem value="Essence">⛽ Essence (Sans Plomb)</SelectItem>
                        <SelectItem value="Diesel">🛢️ Diesel (Gazole)</SelectItem>
                        <SelectItem value="Hybride">⚡ Hybride</SelectItem>
                        <SelectItem value="Electrique">🔋 100% Électrique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                      <Disc className="w-3.5 h-3.5 text-accent" /> Boîte de Vitesse
                    </Label>
                    <Select 
                      value={formData.boite_vitesse} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, boite_vitesse: val }))}
                    >
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-border/60 font-bold">
                        <SelectValue placeholder="Boîte" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-border/60">
                        <SelectItem value="Manuelle">🕹️ Manuelle</SelectItem>
                        <SelectItem value="Automatique">⚡ Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kilometrage" className="text-xs font-bold uppercase text-foreground">
                      Compteur Kilométrique Actuel (KM)
                    </Label>
                    <Input
                      id="kilometrage"
                      name="kilometrage"
                      type="number"
                      min="0"
                      value={formData.kilometrage}
                      onChange={handleInputChange}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="km_depart" className="text-xs font-bold uppercase text-foreground">
                      Kilométrage Initial d'Achat (KM)
                    </Label>
                    <Input
                      id="km_depart"
                      name="km_depart"
                      type="number"
                      min="0"
                      value={formData.km_depart}
                      onChange={handleInputChange}
                      className="h-12 rounded-2xl bg-muted/30 border-border/60 font-mono"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: STUDIO PHOTOS */}
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
                    <ImageIcon className="w-4 h-4 text-accent" />
                    Studio Photo HD & Couverture
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ajoutez des photos de haute qualité. La première photo servira de couverture principale.
                  </p>
                </div>

                {/* Upload Zone */}
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                    id="vehicle-photo-upload"
                    className="hidden"
                  />
                  <label 
                    htmlFor="vehicle-photo-upload"
                    className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-accent/40 hover:border-accent rounded-3xl bg-accent/5 hover:bg-accent/10 cursor-pointer transition-all p-6 text-center"
                  >
                    <Upload className="w-8 h-8 mb-2 text-accent group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-foreground">
                      Glissez vos photos ici ou cliquez pour parcourir
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Formats acceptés: JPG, PNG, WEBP (Compression HD automatique)
                    </p>
                  </label>
                  {uploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-3xl flex items-center justify-center font-bold text-xs text-accent uppercase animate-pulse">
                      Optimisation et chargement des photos...
                    </div>
                  )}
                </div>

                {/* Photos Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase text-muted-foreground">
                      Photos enregistrées ({photos.length})
                    </Label>
                    {photos.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        ★ Cliquez sur l'étoile pour définir la photo de couverture
                      </span>
                    )}
                  </div>

                  {photos.length === 0 ? (
                    <div className="p-8 text-center rounded-3xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground text-xs">
                      Aucune photo ajoutée pour l'instant. Ajoutez-en au moins une pour une présentation optimale.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {photos.map((url, idx) => (
                        <div 
                          key={idx} 
                          className="relative aspect-4/3 rounded-2xl overflow-hidden border border-border/60 bg-muted group shadow-xs"
                        >
                          <img src={url} alt={`Aperçu ${idx}`} className="w-full h-full object-cover" />
                          
                          {/* Cover Badge */}
                          {idx === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-black flex items-center gap-1 shadow-md">
                              <Star className="w-3 h-3 fill-current" /> Couverture
                            </div>
                          )}

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {idx !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleSetCoverPhoto(idx)}
                                title="Définir comme couverture"
                                className="p-2 rounded-xl bg-accent text-accent-foreground hover:scale-110 transition-transform shadow-md"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              title="Supprimer la photo"
                              className="p-2 rounded-xl bg-destructive text-destructive-foreground hover:scale-110 transition-transform shadow-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 4: DOCUMENTS & CONFORMITÉ */}
            {activeStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent" />
                    Documents Légaux & Alertes d'Échéance
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Attachez les pièces obligatoires (Assurance, Carte grise, Visite technique) avec suivi de validité.
                  </p>
                </div>

                {/* Add Document Box */}
                <div className="p-5 rounded-3xl bg-muted/30 border border-border/60 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Type de document</Label>
                      <Select value={docType} onValueChange={setDocType}>
                        <SelectTrigger className="h-11 rounded-xl bg-background border-border/60 text-xs font-bold">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/60">
                          {DOCUMENT_TYPES.map((dt) => (
                            <SelectItem key={dt.value} value={dt.value} className="text-xs font-medium">
                              {dt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Date d'échéance / Expiration</Label>
                      <Input
                        type="date"
                        value={docExpiry}
                        onChange={(e) => setDocExpiry(e.target.value)}
                        className="h-11 rounded-xl bg-background border-border/60 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Nom & Pièce jointe</Label>
                      <div className="flex gap-2">
                        <Input
                          value={docName}
                          onChange={(e) => setDocName(e.target.value)}
                          placeholder="Ex: Police RMA 2026..."
                          className="h-11 rounded-xl bg-background border-border/60 text-xs font-medium"
                        />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleDocAdd}
                          className="hidden"
                          id="new-doc-upload"
                        />
                        <label 
                          htmlFor="new-doc-upload"
                          className="h-11 px-3.5 flex items-center justify-center bg-accent text-accent-foreground rounded-xl cursor-pointer hover:bg-accent/90 transition-all shrink-0 font-bold text-xs shadow-md shadow-accent/20"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Joindre
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staged Docs List */}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-muted-foreground">
                    Documents prêts à être sauvegardés ({docs.length})
                  </Label>

                  {docs.length === 0 ? (
                    <div className="p-6 text-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground text-xs">
                      Aucun document en attente. Vous pourrez également en ajouter plus tard depuis la fiche détaillée du véhicule.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docs.map((doc, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-black text-foreground">{doc.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                                  {DOCUMENT_TYPES.find(dt => dt.value === doc.type)?.label || doc.type}
                                </span>
                                {doc.expiry && (
                                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Expire le: {doc.expiry}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDoc(idx)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Wizard Footer Navigation Controls */}
        <div className="p-5 sm:p-6 bg-card border-t border-border/40 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (activeStep > 1) {
                setActiveStep(prev => prev - 1);
              } else {
                onOpenChange(false);
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
            {activeStep < 4 ? (
              <Button
                type="button"
                onClick={() => {
                  if (activeStep === 1 && !(formData.marque.trim() || formData.brand.trim())) {
                    return;
                  }
                  setActiveStep(prev => prev + 1);
                }}
                className="h-11 px-6 rounded-2xl font-black text-xs bg-foreground text-background hover:bg-foreground/90 shadow-sm"
              >
                Suivant <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => handleSubmit()}
                disabled={uploading}
                className="h-11 px-8 rounded-2xl font-black text-xs bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20"
              >
                <Check className="w-4 h-4 mr-1.5 stroke-[3]" />
                {vehicle ? "Enregistrer les modifications" : "Créer le véhicule"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormDialog;
