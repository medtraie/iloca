
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

interface Props {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleDateChange?: (field: string, date: Date | undefined) => void;
}

export default function ContractLocataireFields({ formData, handleInputChange, handleDateChange }: Props) {
  const handleDateSelect = (field: string) => (date: Date | undefined) => {
    if (handleDateChange) {
      handleDateChange(field, date);
    }
  };

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="bg-gray-800 text-white p-2 rounded mb-4 text-center">
        <h3 className="text-lg font-bold">LOCATAIRE</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locataire Principal */}
        <div className="space-y-4">
          <h4 className="font-semibold text-center text-gray-700 border-b pb-2">Locataire</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerLastName" className="text-sm">Nom *</Label>
              <Input id="customerLastName" name="customerLastName" value={formData.customerLastName || ""} onChange={handleInputChange} className="text-sm" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerFirstName" className="text-sm">Prénom</Label>
              <Input id="customerFirstName" name="customerFirstName" value={formData.customerFirstName || ""} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerAddressMorocco" className="text-sm">Adresse au Maroc</Label>
            <Input id="customerAddressMorocco" name="customerAddressMorocco" value={formData.customerAddressMorocco || ""} onChange={handleInputChange} className="text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-sm">Tél.</Label>
              <Input id="customerPhone" name="customerPhone" value={formData.customerPhone || ""} onChange={handleInputChange} className="text-sm" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerAddressForeign" className="text-sm">Adresse à l'Étranger</Label>
              <Input id="customerAddressForeign" name="customerAddressForeign" value={formData.customerAddressForeign || ""} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerCin" className="text-sm">C.I.N. N°</Label>
              <Input id="customerCin" name="customerCin" value={formData.customerCin || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.customerCinDelivered ? new Date(formData.customerCinDelivered) : undefined}
                onChange={handleDateSelect("customerCinDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerLicenseNumber" className="text-sm">Permis N°</Label>
              <Input id="customerLicenseNumber" name="customerLicenseNumber" value={formData.customerLicenseNumber || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.customerLicenseDelivered ? new Date(formData.customerLicenseDelivered) : undefined}
                onChange={handleDateSelect("customerLicenseDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerPassportNumber" className="text-sm">Passeport N°</Label>
              <Input id="customerPassportNumber" name="customerPassportNumber" value={formData.customerPassportNumber || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.customerPassportDelivered ? new Date(formData.customerPassportDelivered) : undefined}
                onChange={handleDateSelect("customerPassportDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Date de Naissance</Label>
            <DatePicker
              value={formData.customerBirthDate ? new Date(formData.customerBirthDate) : undefined}
              onChange={handleDateSelect("customerBirthDate")}
              placeholder="Choisir date de naissance"
              className="text-sm"
            />
          </div>
        </div>
        {/* 2ème Conducteur */}
        <div className="space-y-4">
          <h4 className="font-semibold text-center text-gray-700 border-b pb-2">2ème Conducteur</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="secondDriverLastName" className="text-sm">Nom</Label>
              <Input id="secondDriverLastName" name="secondDriverLastName" value={formData.secondDriverLastName || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondDriverFirstName" className="text-sm">Prénom</Label>
              <Input id="secondDriverFirstName" name="secondDriverFirstName" value={formData.secondDriverFirstName || ""} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondDriverAddressMorocco" className="text-sm">Adresse au Maroc</Label>
            <Input id="secondDriverAddressMorocco" name="secondDriverAddressMorocco" value={formData.secondDriverAddressMorocco || ""} onChange={handleInputChange} className="text-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="secondDriverPhone" className="text-sm">Tél.</Label>
              <Input id="secondDriverPhone" name="secondDriverPhone" value={formData.secondDriverPhone || ""} onChange={handleInputChange} className="text-sm" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondDriverAddressForeign" className="text-sm">Adresse à l'Étranger</Label>
              <Input id="secondDriverAddressForeign" name="secondDriverAddressForeign" value={formData.secondDriverAddressForeign || ""} onChange={handleInputChange} className="text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="secondDriverCin" className="text-sm">C.I.N. N°</Label>
              <Input id="secondDriverCin" name="secondDriverCin" value={formData.secondDriverCin || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.secondDriverCinDelivered ? new Date(formData.secondDriverCinDelivered) : undefined}
                onChange={handleDateSelect("secondDriverCinDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="secondDriverPassportNumber" className="text-sm">Passeport N°</Label>
              <Input id="secondDriverPassportNumber" name="secondDriverPassportNumber" value={formData.secondDriverPassportNumber || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.secondDriverPassportDelivered ? new Date(formData.secondDriverPassportDelivered) : undefined}
                onChange={handleDateSelect("secondDriverPassportDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="secondDriverLicenseNumber" className="text-sm">Permis N°</Label>
              <Input id="secondDriverLicenseNumber" name="secondDriverLicenseNumber" value={formData.secondDriverLicenseNumber || ""} onChange={handleInputChange} className="text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Délivré le</Label>
              <DatePicker
                value={formData.secondDriverLicenseDelivered ? new Date(formData.secondDriverLicenseDelivered) : undefined}
                onChange={handleDateSelect("secondDriverLicenseDelivered")}
                placeholder="Choisir une date"
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
