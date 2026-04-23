
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Calendar } from "lucide-react";

interface Props {
  nom: string;
  prenom: string;
  dateNaissance: string;
  errors: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

export default function TenantPersonalInfoFields({ nom, prenom, dateNaissance, errors, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="nom" className="flex items-center gap-2">
          <User className="h-4 w-4" /> Nom *
        </Label>
        <Input
          id="nom"
          value={nom}
          onChange={(e) => onChange("nom", e.target.value)}
          placeholder="Nom de famille"
          className={errors.nom ? "border-red-500" : ""}
        />
        {errors.nom && <p className="text-red-500 text-sm">{errors.nom}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="prenom" className="flex items-center gap-2">
          <User className="h-4 w-4" /> Prénom *
        </Label>
        <Input
          id="prenom"
          value={prenom}
          onChange={(e) => onChange("prenom", e.target.value)}
          placeholder="Prénom"
          className={errors.prenom ? "border-red-500" : ""}
        />
        {errors.prenom && <p className="text-red-500 text-sm">{errors.prenom}</p>}
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="dateNaissance" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Date de naissance *
        </Label>
        <Input
          id="dateNaissance"
          type="date"
          value={dateNaissance}
          onChange={(e) => onChange("dateNaissance", e.target.value)}
          className={errors.dateNaissance ? "border-red-500" : ""}
        />
        {errors.dateNaissance && <p className="text-red-500 text-sm">{errors.dateNaissance}</p>}
      </div>
    </div>
  );
}

