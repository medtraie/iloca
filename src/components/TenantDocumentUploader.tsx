
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, ImageOff, Loader2, CheckCircle, XCircle } from "lucide-react";

interface TenantDocumentUploaderProps {
  label: string;
  initialUrl?: string;
  onUploaded: (url: string) => void;
  storagePrefix: string;
}

export default function TenantDocumentUploader({
  label,
  initialUrl,
  onUploaded,
  storagePrefix,
}: TenantDocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(initialUrl || "");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setProgress(0);

    try {
      // Create a local URL for the file since we're using localStorage
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFileUrl(dataUrl);
        setUploading(false);
        setProgress(100);
        onUploaded(dataUrl);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError("Erreur lors de l'envoi du fichier");
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*,.pdf"
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
        >
          <Upload className="h-4 w-4 mr-2" /> Choisir un fichier
        </Button>
        {uploading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
        {fileUrl && (
          fileUrl.endsWith(".pdf") ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">
              Voir pièce jointe (PDF)
            </a>
          ) : (
            <img src={fileUrl} alt="doc" className="h-10 w-10 object-cover border rounded shadow-sm" />
          )
        )}
        {error && (
          <span className="ml-2 text-red-500 text-xs flex items-center">
            <XCircle className="h-4 w-4 mr-1" /> {error}
          </span>
        )}
      </div>
      {uploading && (
        <div className="mt-1">
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
