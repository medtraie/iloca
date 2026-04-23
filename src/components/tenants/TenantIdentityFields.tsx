
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Calendar, Car } from "lucide-react";
import TenantDocumentUploader from "../TenantDocumentUploader";

interface Props {
  cin: string;
  dateCin: string;
  permis: string;
  datePermis: string;
  passeport: string;
  cinImageUrl: string;
  permisImageUrl: string;
  passeportImageUrl: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function TenantIdentityFields({
  cin,
  dateCin,
  permis,
  datePermis,
  passeport,
  cinImageUrl,
  permisImageUrl,
  passeportImageUrl,
  errors,
  onChange,
}: Props) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cin" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> CIN *
          </Label>
          <Input
            id="cin"
            value={cin}
            onChange={(e) => onChange("cin", e.target.value)}
            placeholder="AB123456"
            className={errors.cin ? "border-red-500" : ""}
          />
          {errors.cin && <p className="text-red-500 text-sm">{errors.cin}</p>}
          <div className="pt-2">
            <TenantDocumentUploader
              label="Image du CIN/PDF (optionnel)"
              initialUrl={cinImageUrl}
              storagePrefix="cin"
              onUploaded={(url) => onChange("cinImageUrl", url)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateCin" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Date CIN *
          </Label>
          <Input
            id="dateCin"
            type="date"
            value={dateCin}
            onChange={(e) => onChange("dateCin", e.target.value)}
            className={errors.dateCin ? "border-red-500" : ""}
          />
          {errors.dateCin && <p className="text-red-500 text-sm">{errors.dateCin}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="permis" className="flex items-center gap-2">
            <Car className="h-4 w-4" /> Permis *
          </Label>
          <Input
            id="permis"
            value={permis}
            onChange={(e) => onChange("permis", e.target.value)}
            placeholder="P1234567"
            className={errors.permis ? "border-red-500" : ""}
          />
          {errors.permis && <p className="text-red-500 text-sm">{errors.permis}</p>}
          <div className="pt-2">
            <TenantDocumentUploader
              label="Image du Permis/PDF (optionnel)"
              initialUrl={permisImageUrl}
              storagePrefix="permis"
              onUploaded={(url) => onChange("permisImageUrl", url)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="datePermis" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Date Permis *
          </Label>
          <Input
            id="datePermis"
            type="date"
            value={datePermis}
            onChange={(e) => onChange("datePermis", e.target.value)}
            className={errors.datePermis ? "border-red-500" : ""}
          />
          {errors.datePermis && <p className="text-red-500 text-sm">{errors.datePermis}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passeport" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Passeport (optionnel)
        </Label>
        <Input
          id="passeport"
          value={passeport}
          onChange={(e) => onChange("passeport", e.target.value)}
          placeholder="P00123456"
        />
        <div className="pt-2">
          <TenantDocumentUploader
            label="Image du Passeport/PDF (optionnel)"
            initialUrl={passeportImageUrl}
            storagePrefix="passeport"
            onUploaded={(url) => onChange("passeportImageUrl", url)}
          />
        </div>
      </div>
    </div>
  );
}
