
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Vehicle } from "@/hooks/useVehicles";
import { Expense } from "@/types/expense";

interface ExpenseFormFieldsProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors;
  vehicles: Vehicle[];
  expense?: Expense | null;
}

const expenseTypes = [
  { value: 'vignette', label: 'Vignette' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'visite_technique', label: 'Visite technique' },
  { value: 'gps', label: 'GPS' },
  { value: 'credit', label: 'Crédit' },
  { value: 'reparation', label: 'Réparation' }
];

const ExpenseFormFields = ({ register, setValue, errors, vehicles, expense }: ExpenseFormFieldsProps) => {
  return (
    <>
      <div>
        <Label htmlFor="vehicle_id">Véhicule</Label>
        <Select onValueChange={(value) => setValue("vehicle_id", value)} defaultValue={expense?.vehicle_id}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir le véhicule" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.brand} {vehicle.model} {vehicle.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vehicle_id && <p className="text-red-500 text-sm">Ce champ est requis</p>}
      </div>

      <div>
        <Label htmlFor="type">Type de dépense</Label>
        <Select onValueChange={(value) => setValue("type", value)} defaultValue={expense?.type}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir le type de dépense" />
          </SelectTrigger>
          <SelectContent>
            {expenseTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && <p className="text-red-500 text-sm">Ce champ est requis</p>}
      </div>

      <div>
        <Label htmlFor="total_cost">Coût total (DH)</Label>
        <Input
          id="total_cost"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register("total_cost", { 
            required: "Ce champ est requis",
            min: { value: 0.01, message: "Le coût doit être supérieur à zéro" }
          })}
        />
        {errors.total_cost && <p className="text-red-500 text-sm">{errors.total_cost.message?.toString()}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Date de début</Label>
          <Input
            id="start_date"
            type="date"
            {...register("start_date", { required: "Ce champ est requis" })}
          />
          {errors.start_date && <p className="text-red-500 text-sm">Ce champ est requis</p>}
        </div>

        <div>
          <Label htmlFor="end_date">Date de fin</Label>
          <Input
            id="end_date"
            type="date"
            {...register("end_date", { required: "Ce champ est requis" })}
          />
          {errors.end_date && <p className="text-red-500 text-sm">Ce champ est requis</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="document_url">Lien du document (optionnel)</Label>
        <Input
          id="document_url"
          type="url"
          placeholder="https://..."
          {...register("document_url")}
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          placeholder="Toutes notes supplémentaires..."
          {...register("notes")}
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (optionnel)</Label>
        <Input
          id="tags"
          type="text"
          placeholder="urgent, administratif, atelier..."
          {...register("tagsText")}
        />
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="recurring_enabled">Dépense récurrente</Label>
          <Switch
            id="recurring_enabled"
            defaultChecked={Boolean(expense?.recurring_enabled)}
            onCheckedChange={(checked) => setValue("recurring_enabled", checked)}
          />
        </div>
        <div>
          <Label htmlFor="recurring_frequency">Fréquence</Label>
          <Select
            onValueChange={(value) => setValue("recurring_frequency", value)}
            defaultValue={expense?.recurring_frequency || "yearly"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir une fréquence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuelle</SelectItem>
              <SelectItem value="quarterly">Trimestrielle</SelectItem>
              <SelectItem value="yearly">Annuelle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
};

export default ExpenseFormFields;
