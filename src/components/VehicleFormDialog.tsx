import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Vehicle } from "@/hooks/useVehicles";
import { 
  Car, 
  Settings, 
  Calendar, 
  Fuel, 
  Disc, 
  Palette, 
  CreditCard, 
  Info, 
  Image as ImageIcon, 
  FileText, 
  Upload, 
  Trash2, 
  X, 
  Check,
  Plus
} from "lucide-react";

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>, docUploads?: DocumentUploadType[]) => void;
  vehicle?: Vehicle | null;
}

type DocumentUploadType = {
  file: File;
  type: string;
  expiry?: string;
  name: string;
};

const DOCUMENT_TYPES = [
  { value: "carte_grise", label: "Carte grise" },
  { value: "assurance", label: "Assurance" },
  { value: "visite_technique", label: "Visite technique" },
  { value: "contrat", label: "Contrat" },
  { value: "autre", label: "Autre" },
];

const VehicleFormDialog = ({ open, onOpenChange, onSave, vehicle }: VehicleFormDialogProps) => {
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

  // Reset form when dialog opens/closes or when vehicle changes
  useEffect(() => {
    if (open && vehicle) {
      // Editing existing vehicle
      setFormData({
        brand: vehicle.brand || "",
        model: vehicle.model || "",
        registration: vehicle.registration || "",
        year: vehicle.year?.toString() || "",
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
    } else if (open) {
      // Creating new vehicle
      setFormData({
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
        kilometrage: "0",
        couleur: "Blanc",
        prix_par_jour: "200",
        etat_vehicule: "disponible",
        km_depart: "0",
      });
    }
  }, [open, vehicle]);

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // When editing, fill current photos list.
  useEffect(() => {
    if (open && vehicle && vehicle.photos) {
      setPhotos(vehicle.photos);
    } else if (open) {
      setPhotos([]);
    }
  }, [open, vehicle]);

  const [docsUploading, setDocsUploading] = useState(false);
  const [docs, setDocs] = useState<DocumentUploadType[]>([]);
  const [docType, setDocType] = useState("carte_grise");
  const [docExpiry, setDocExpiry] = useState("");
  const [docName, setDocName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset docs section when dialog is opened
  useEffect(() => {
    if (open) {
      setDocs([]);
      setDocType("carte_grise");
      setDocExpiry("");
      setDocName("");
    }
  }, [open, vehicle]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    const urls: string[] = [];

    for (const file of files) {
      // Create data URL for local storage
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      urls.push(dataUrl);
    }
    
    setPhotos((prev) => [...prev, ...urls]);
    setUploading(false);
    // Clear input value so same file can be uploaded again if needed
    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
    // Reset after add
    setDocType("carte_grise");
    setDocExpiry("");
    setDocName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveDoc = (idx: number) => {
    setDocs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.marque.trim()) {
      return;
    }
    const vehicleData = {
      brand: formData.marque,
      model: formData.modele || undefined,
      registration: formData.immatriculation || undefined,
      year: formData.annee ? parseInt(formData.annee) : undefined,
      marque: formData.marque,
      modele: formData.modele || undefined,
      immatriculation: formData.immatriculation || undefined,
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

    // تمرير الوثائق ليتم رفعها وربطها عند الحفظ
    onSave(vehicleData, docs);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none max-h-[95vh] flex flex-col">
        <div className="bg-card/95 backdrop-blur-xl border border-primary/10 rounded-[var(--radius)] shadow-2xl overflow-hidden flex flex-col">
          <div className="relative h-28 bg-primary/10 flex items-center px-8 shrink-0">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Car className="h-24 w-24" />
            </div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">
                  {vehicle ? "Modifier Véhicule" : "Nouveau Véhicule"}
                </h2>
                <p className="text-muted-foreground font-medium">Gestion des détails et caractéristiques techniques</p>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informations Générales */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                  <Settings className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Caractéristiques</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="marque" className="text-xs font-bold uppercase text-muted-foreground ml-1">Marque *</Label>
                    <Input
                      id="marque"
                      name="marque"
                      value={formData.marque}
                      onChange={handleInputChange}
                      required
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30 font-bold"
                      placeholder="Ex: DACIA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modele" className="text-xs font-bold uppercase text-muted-foreground ml-1">Modèle</Label>
                    <Input
                      id="modele"
                      name="modele"
                      value={formData.modele}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30"
                      placeholder="Ex: LOGAN"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="immatriculation" className="text-xs font-bold uppercase text-muted-foreground ml-1">Immatriculation</Label>
                    <Input
                      id="immatriculation"
                      name="immatriculation"
                      value={formData.immatriculation}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30 font-bold"
                      placeholder="Ex: 12345-A-6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annee" className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Année
                    </Label>
                    <Input
                      id="annee"
                      name="annee"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.annee}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                      <Fuel className="h-3 w-3" /> Carburant
                    </Label>
                    <Select 
                      value={formData.type_carburant} 
                      onValueChange={(value) => setFormData(prev => ({...prev, type_carburant: value}))}
                    >
                      <SelectTrigger className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[var(--radius)] border-primary/10">
                        <SelectItem value="essence">Essence</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="hybride">Hybride</SelectItem>
                        <SelectItem value="electrique">Électrique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                      <Disc className="h-3 w-3" /> Boîte
                    </Label>
                    <Select 
                      value={formData.boite_vitesse} 
                      onValueChange={(value) => setFormData(prev => ({...prev, boite_vitesse: value}))}
                    >
                      <SelectTrigger className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)]">
                        <SelectValue placeholder="Boîte" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[var(--radius)] border-primary/10">
                        <SelectItem value="manuelle">Manuelle</SelectItem>
                        <SelectItem value="automatique">Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* État et Tarification */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">État & Tarification</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prix_par_jour" className="text-xs font-bold uppercase text-primary ml-1">Prix par jour (MAD)</Label>
                    <Input
                      id="prix_par_jour"
                      name="prix_par_jour"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.prix_par_jour}
                      onChange={handleInputChange}
                      className="bg-primary/5 border-primary/20 h-11 rounded-[var(--radius)] focus:border-primary font-black text-primary text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Statut Actuel</Label>
                    <Select 
                      value={formData.etat_vehicule} 
                      onValueChange={(value) => setFormData(prev => ({...prev, etat_vehicule: value}))}
                    >
                      <SelectTrigger className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[var(--radius)] border-primary/10">
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="loue">Loué</SelectItem>
                        <SelectItem value="maintenance">En maintenance</SelectItem>
                        <SelectItem value="horsService">Hors service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kilometrage" className="text-xs font-bold uppercase text-muted-foreground ml-1">Kilométrage Actuel</Label>
                    <Input
                      id="kilometrage"
                      name="kilometrage"
                      type="number"
                      min="0"
                      value={formData.kilometrage}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="couleur" className="text-xs font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1">
                      <Palette className="h-3 w-3" /> Couleur
                    </Label>
                    <Input
                      id="couleur"
                      name="couleur"
                      value={formData.couleur}
                      onChange={handleInputChange}
                      className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30"
                      placeholder="Ex: Blanc"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="km_depart" className="text-xs font-bold uppercase text-muted-foreground ml-1">Kilométrage Initial (Achat)</Label>
                  <Input
                    id="km_depart"
                    name="km_depart"
                    type="number"
                    min="0"
                    value={formData.km_depart}
                    onChange={handleInputChange}
                    className="bg-background/40 border-primary/10 h-11 rounded-[var(--radius)] focus:border-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Photos du véhicule</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    disabled={uploading}
                    id="photo-upload"
                    className="hidden"
                  />
                  <label 
                    htmlFor="photo-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/20 rounded-[var(--radius)] bg-primary/5 hover:bg-primary/10 hover:border-primary/40 cursor-pointer transition-all group"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-primary/60 group-hover:scale-110 transition-transform" />
                      <p className="text-sm font-bold text-primary/70">Cliquez pour ajouter des photos</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                    </div>
                  </label>
                  {uploading && <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-[var(--radius)] flex items-center justify-center animate-pulse text-xs font-black text-primary uppercase">Téléchargement...</div>}
                </div>

                <div className="grid grid-cols-3 gap-3 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-[var(--radius)] overflow-hidden border border-primary/10">
                      <img src={url} alt={`vehicle-photo-${idx}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute inset-0 bg-destructive/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  ))}
                  {photos.length === 0 && (
                    <div className="col-span-3 h-32 flex flex-col items-center justify-center border border-dashed border-primary/10 rounded-[var(--radius)] bg-muted/30 text-muted-foreground italic text-xs">
                      Aucune photo ajoutée
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/10">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Documents du véhicule</h4>
              </div>
              
              <div className="bg-primary/5 border border-primary/10 rounded-[var(--radius)] p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Type</Label>
                    <Select value={docType} onValueChange={setDocType}>
                      <SelectTrigger className="bg-background border-primary/10 h-11 rounded-[var(--radius)] font-medium">
                        <SelectValue placeholder="Choisir le type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[var(--radius)] border-primary/10">
                        {DOCUMENT_TYPES.map(dt => (
                          <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Expiration</Label>
                    <Input
                      type="date"
                      value={docExpiry}
                      onChange={e => setDocExpiry(e.target.value)}
                      className="bg-background border-primary/10 h-11 rounded-[var(--radius)] font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Nom du document</Label>
                    <div className="flex gap-2">
                      <Input
                        value={docName}
                        onChange={e => setDocName(e.target.value)}
                        placeholder="Ex: Carte Grise"
                        className="bg-background border-primary/10 h-11 rounded-[var(--radius)] font-medium"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleDocAdd}
                        className="hidden"
                        id="doc-upload"
                      />
                      <label 
                        htmlFor="doc-upload"
                        className="h-11 w-12 flex items-center justify-center bg-primary text-primary-foreground rounded-[var(--radius)] cursor-pointer hover:opacity-90 transition-opacity shrink-0 shadow-lg shadow-primary/20"
                      >
                        <Plus className="h-6 w-6" />
                      </label>
                    </div>
                  </div>
                </div>

                {docs.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-black uppercase tracking-widest text-primary/60">Documents à enregistrer :</h5>
                    <div className="grid grid-cols-1 gap-2">
                      {docs.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background/60 rounded-[var(--radius)] border border-primary/10 group">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold truncate max-w-[200px]">{doc.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-black text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {DOCUMENT_TYPES.find(dt => dt.value === doc.type)?.label ?? doc.type}
                                </span>
                                {doc.expiry && (
                                  <span className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5">
                                    <Calendar className="h-2.5 w-2.5" /> {doc.expiry}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => handleRemoveDoc(idx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 shrink-0 border-t border-primary/10">
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
                disabled={uploading || docsUploading}
                className="h-12 px-10 rounded-[var(--radius)] font-black uppercase tracking-widest bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {docsUploading ? (
                  <>
                    <Upload className="h-5 w-5 animate-bounce" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    {vehicle ? "Mettre à jour" : "Enregistrer"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormDialog;
