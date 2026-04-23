
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  nationalite: string;
  type: "Locataire Principal" | "Chauffeur secondaire";
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
  nationalities: string[];
  onAddNationality: (value: string) => void;
}

export default function TenantTypeFields({ nationalite, type, errors, onChange, nationalities, onAddNationality }: Props) {
  const [newNationality, setNewNationality] = useState("");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="nationalite" className="flex items-center gap-2">
          <Globe className="h-4 w-4" /> Nationalité *
        </Label>
        <Select value={nationalite} onValueChange={(value) => onChange("nationalite", value)}>
          <SelectTrigger className={errors.nationalite ? "border-red-500" : ""}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {nationalities.map(nationality => (
              <SelectItem key={nationality} value={nationality}>
                {nationality}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.nationalite && (
          <p className="text-red-500 text-sm">{errors.nationalite}</p>
        )}

        {/* إضافة جنسية جديدة */}
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Ajouter une nationalité..."
            value={newNationality}
            onChange={(e) => setNewNationality(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const v = newNationality.trim();
              if (!v) return;
              onAddNationality(v);
              setNewNationality("");
            }}
          >
            Ajouter
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type de locataire</Label>
        <Select value={type} onValueChange={(value) => onChange("type", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Locataire Principal">Locataire Principal</SelectItem>
            <SelectItem value="Chauffeur secondaire">Chauffeur secondaire</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
