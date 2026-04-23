
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash, Download, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VehicleDocument {
  id: string;
  name: string;
  document_type: string;
  file_url: string;
  expiry_date?: string;
}

interface VehicleDocumentManagerProps {
  vehicleId: string;
}

const documentTypes = [
  { value: "carte_grise", label: "Carte Grise" },
  { value: "assurance", label: "Assurance" },
  { value: "visite_technique", label: "Visite Technique" },
  { value: "contrat", label: "Contrat" },
  { value: "autre", label: "Autre" },
];

const VehicleDocumentManager = ({ vehicleId }: VehicleDocumentManagerProps) => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("autre");
  const [expiry, setExpiry] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = fileInputRef.current;
    if (!fileInput?.files || fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    setUploading(true);

    try {
      // In a real app without Supabase, you'd upload to your own server
      // For now, we'll simulate the upload process
      const mockUrl = URL.createObjectURL(file);
      
      const newDoc: VehicleDocument = {
        id: Date.now().toString(),
        name: file.name,
        document_type: docType,
        file_url: mockUrl,
        expiry_date: expiry || undefined,
      };

      setDocs(prev => [...prev, newDoc]);
      
      toast({
        title: "Succès",
        description: "Fichier téléchargé avec succès"
      });

      setExpiry("");
      setDocType("autre");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement du fichier",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDocs(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: "Succès",
      description: "Fichier supprimé avec succès"
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Documents du véhicule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpload} className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
          <div className="flex-1">
            <Label>Type de document</Label>
            <select
              className="w-full border rounded px-2 py-1 mt-1"
              value={docType}
              onChange={e => setDocType(e.target.value)}
              required
            >
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Date d'expiration</Label>
            <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
          </div>
          <div>
            <Label>Télécharger fichier</Label>
            <Input type="file" ref={fileInputRef} required />
          </div>
          <Button type="submit" disabled={uploading} className="mt-6">
            {uploading ? <Loader2 className="animate-spin" /> : "Télécharger"}
          </Button>
        </form>
        <ul className="space-y-4">
          {docs.length === 0 && (
            <li className="text-gray-500">Aucun fichier téléchargé pour ce véhicule</li>
          )}
          {docs.map((doc: VehicleDocument) => (
            <li key={doc.id} className="flex flex-col md:flex-row md:items-center gap-2 border p-2 rounded">
              <div className="flex items-center gap-2 flex-1">
                <FileText className="text-blue-500" />
                <span className="font-semibold">{doc.name}</span>
                <span className="text-xs text-gray-400">{doc.document_type}</span>
                {doc.expiry_date && (
                  <span className="text-xs text-orange-600">
                    Expire le: {new Date(doc.expiry_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    <Download className="w-4 h-4 mr-1" /> Voir
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(doc.id)}
                >
                  <Trash className="w-4 h-4 mr-1" /> Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default VehicleDocumentManager;
