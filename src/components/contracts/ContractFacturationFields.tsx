
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  calculateTotalPrice: () => number;
  calculateRemaining: () => number;
}

export default function ContractFacturationFields({ formData, handleInputChange, calculateTotalPrice, calculateRemaining }: Props) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
        <h3 className="text-lg font-bold">FACTURATION</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dailyPrice" className="text-sm">Prix par Jour *</Label>
          <div className="flex">
            <Input id="dailyPrice" name="dailyPrice" type="number" value={formData.dailyPrice} onChange={handleInputChange} className="text-sm" required />
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">DH</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rentalDuration" className="text-sm font-semibold text-green-700">📊 Durée de Location</Label>
          <Input 
            id="rentalDuration" 
            name="rentalDuration" 
            type="number" 
            value={formData.rentalDays || formData.rentalDuration || ""} 
            className="text-sm font-bold bg-green-50 border-green-300 text-green-800"
            readOnly
            placeholder={`= ${formData.rentalDays || '0'} jours`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="totalPrice" className="text-sm">Prix total</Label>
          <div className="flex">
            <Input value={calculateTotalPrice()} className="text-sm bg-gray-100" readOnly />
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">DH</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="advance" className="text-sm">Avance</Label>
          <div className="flex">
            <Input id="advance" name="advance" type="number" value={formData.advance} onChange={handleInputChange} className="text-sm" />
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">DH</span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="remaining" className="text-sm">Reste</Label>
          <div className="flex">
            <Input value={calculateRemaining()} className="text-sm bg-gray-100" readOnly />
            <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-l-0 border-gray-300 rounded-r-md">DH</span>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <div className="space-y-2">
          <Label htmlFor="paymentMethod" className="text-sm">Mode de Règlement *</Label>
          <select 
            id="paymentMethod" 
            name="paymentMethod" 
            value={formData.paymentMethod || ""} 
            onChange={handleInputChange} 
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            <option value="">Sélectionner...</option>
            <option value="Espèces">Espèces</option>
            <option value="Virement">Virement</option>
            <option value="Chèque">Chèque</option>
          </select>
        </div>
      </div>
      <div className="mt-6 p-4 bg-blue-50 rounded border-l-4 border-blue-500">
        <p className="text-sm text-gray-700">
          <strong>Le locataire du véhicule SFTLOCATION</strong> reconnaît avoir lu et accepté les conditions
          générales stipulées au verso du présent contrat, il est le seul responsable en cas de
          violation de code de la route marocaine.
        </p>
      </div>
    </div>
  );
}
