
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, ImageOff, Loader2, XCircle, Eye } from "lucide-react";

interface ExpenseImageUploaderProps {
  label: string;
  initialUrl?: string;
  onUploaded: (url: string) => void;
  onRemoved?: () => void;
}

export default function ExpenseImageUploader({
  label,
  initialUrl,
  onUploaded,
  onRemoved,
}: ExpenseImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(initialUrl || "");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Veuillez choisir un fichier image valide");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("La taille du fichier est trop importante. Maximum 5 Mo");
      return;
    }

    setError("");
    setUploading(true);
    setProgress(0);

    try {
      // Create a local URL for the image since we're using localStorage
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        setUploading(false);
        setProgress(100);
        onUploaded(dataUrl);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      setError("Erreur lors du téléchargement de l'image");
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setProgress(0);
    if (onRemoved) {
      onRemoved();
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleViewImage = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      
      {!imageUrl && (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={inputRef}
            onChange={handleFileChange}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Téléchargement..." : "Choisir une image"}
          </Button>
        </div>
      )}

      {uploading && (
        <div className="mt-2">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {imageUrl && !uploading && (
        <div className="mt-2">
          <div className="flex items-center gap-2 p-3 border rounded-lg bg-green-50">
            <img 
              src={imageUrl} 
              alt="Image de la charge" 
              className="h-12 w-12 object-cover border rounded shadow-sm"
            />
            <div className="flex-1">
              <p className="text-sm text-green-700 font-medium">Image téléchargée avec succès</p>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleViewImage}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemoveImage}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
