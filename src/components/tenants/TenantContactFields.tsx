
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Phone, MapPin } from "lucide-react";

interface Props {
  telephone: string;
  adresse: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function TenantContactFields({ telephone, adresse, errors, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="telephone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Téléphone *
        </Label>
        <Input
          id="telephone"
          value={telephone}
          onChange={(e) => onChange("telephone", e.target.value)}
          placeholder="+212 612-345678"
          className={errors.telephone ? "border-red-500" : ""}
        />
        {errors.telephone && <p className="text-red-500 text-sm">{errors.telephone}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="adresse" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" /> Adresse *
        </Label>
        <Input
          id="adresse"
          value={adresse}
          onChange={(e) => onChange("adresse", e.target.value)}
          placeholder="Adresse complète"
          className={errors.adresse ? "border-red-500" : ""}
        />
        {errors.adresse && <p className="text-red-500 text-sm">{errors.adresse}</p>}
      </div>
    </div>
  );
}
