
import React from 'react';
import ContractPDFHeader from './ContractPDFHeader';

interface ContractFormData {
  contractNumber: string;
  // Locataire
  customerLastName: string;
  customerFirstName: string;
  customerAddressMorocco: string;
  customerPhone: string;
  customerAddressForeign: string;
  customerCin: string;
  customerCinDelivered: string;
  customerLicenseNumber: string;
  customerLicenseDelivered: string;
  customerPassportNumber: string;
  customerPassportDelivered: string;
  customerBirthDate: string;
  
  // 2ème Conducteur
  secondDriverLastName: string;
  secondDriverFirstName: string;
  secondDriverAddressMorocco: string;
  secondDriverPhone: string;
  secondDriverAddressForeign: string;
  secondDriverCin: string;
  secondDriverCinDelivered: string;
  secondDriverLicenseNumber: string;
  secondDriverLicenseDelivered: string;
  secondDriverPassportNumber: string;
  secondDriverPassportDelivered: string;
  
  // Véhicule - Livraison
  vehicleBrand: string;
  vehicleModel: string;
  vehicleRegistration: string;
  vehicleYear: string;
  vehicleKmDepart: string;
  deliveryLocation: string;
  deliveryDateTime: string;
  rentalDays: string;
  emergencyEquipmentDelivery: string;
  observationsDelivery: string;
  deliveryFuelLevel: number;
  
  // Véhicule - Reprise
  returnDateTime: string;
  returnLocation: string;
  extensionUntil: string;
  vehicleKmReturn: string;
  extendedDays: string;
  emergencyEquipmentReturn: string;
  observationsReturn: string;
  returnFuelLevel: number;
  
  // Facturation
  dailyPrice: string;
  rentalDuration: string;
  totalPrice: number;
  advance: string;
  remaining: number;
  paymentMethod: string;
  
  // Signatures
  deliveryDate: string;
  returnDate: string;
}

interface ContractFormPDFProps {
  data: ContractFormData;
}

const ContractFormPDF = ({ data }: ContractFormPDFProps) => {
  const formatDate = (dateTime: string) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleDateString('fr-FR');
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return `${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const FuelGaugeDisplay = ({ level }: { level: number }) => (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Carburant:</span>
      <div className="w-20 h-4 border border-black relative">
        <div 
          className="h-full bg-black" 
          style={{ width: `${level}%` }}
        />
      </div>
      <span className="text-sm">{level}%</span>
    </div>
  );

  const VehicleDiagramDisplay = () => (
    <div className="border border-black p-2">
      <div className="text-center text-xs mb-2">État du véhicule</div>
      <div className="w-32 h-20 border border-black mx-auto relative">
        <div className="absolute inset-2 border border-gray-400"></div>
        <div className="text-xs text-center mt-8">Schéma véhicule</div>
      </div>
    </div>
  );

  const readValue = (key: string): string => {
    try {
      const v = localStorage.getItem(key);
      if (!v) return '';
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    } catch {
      return '';
    }
  };
  const companyName = readValue('companyName') || 'SFTLOCATION';
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-black print:p-4 print:text-xs">
      <ContractPDFHeader contractNumber={data.contractNumber} />
      
      {/* LOCATAIRE Section */}
      <div className="mb-6">
        <div className="bg-black text-white p-2 text-center mb-3">
          <h3 className="font-bold">LOCATAIRE</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Locataire Principal */}
          <div>
            <h4 className="font-semibold text-center border-b border-black pb-1 mb-3">Locataire</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Nom:</strong> {data.customerLastName}</div>
                <div><strong>Prénom:</strong> {data.customerFirstName}</div>
              </div>
              <div><strong>Adresse au Maroc:</strong> {data.customerAddressMorocco}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Tél.:</strong> {data.customerPhone}</div>
                <div><strong>Adresse à l'Étranger:</strong> {data.customerAddressForeign}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>C.I.N. N°:</strong> {data.customerCin}</div>
                <div><strong>Délivré le:</strong> {data.customerCinDelivered}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Permis N°:</strong> {data.customerLicenseNumber}</div>
                <div><strong>Délivré le:</strong> {data.customerLicenseDelivered}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Passeport N°:</strong> {data.customerPassportNumber}</div>
                <div><strong>Délivré le:</strong> {data.customerPassportDelivered}</div>
              </div>
              <div><strong>Date de Naissance:</strong> {formatDate(data.customerBirthDate)}</div>
            </div>
          </div>

          {/* 2ème Conducteur */}
          <div>
            <h4 className="font-semibold text-center border-b border-black pb-1 mb-3">2ème Conducteur</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Nom:</strong> {data.secondDriverLastName}</div>
                <div><strong>Prénom:</strong> {data.secondDriverFirstName}</div>
              </div>
              <div><strong>Adresse au Maroc:</strong> {data.secondDriverAddressMorocco}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Tél.:</strong> {data.secondDriverPhone}</div>
                <div><strong>Adresse à l'Étranger:</strong> {data.secondDriverAddressForeign}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>C.I.N. N°:</strong> {data.secondDriverCin}</div>
                <div><strong>Délivré le:</strong> {data.secondDriverCinDelivered}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Passeport N°:</strong> {data.secondDriverPassportNumber}</div>
                <div><strong>Délivré le:</strong> {data.secondDriverPassportDelivered}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Permis N°:</strong> {data.secondDriverLicenseNumber}</div>
                <div><strong>Délivré le:</strong> {data.secondDriverLicenseDelivered}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VÉHICULE Section */}
      <div className="mb-6">
        <div className="bg-black text-white p-2 text-center mb-3">
          <h3 className="font-bold">VÉHICULE</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Livraison du Véhicule */}
          <div>
            <h4 className="font-semibold text-center border-b border-black pb-1 mb-3">Livraison du Véhicule</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Marque:</strong> {data.vehicleBrand}</div>
                <div><strong>Modèle:</strong> {data.vehicleModel}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Immatricule:</strong> {data.vehicleRegistration}</div>
                <div><strong>Année:</strong> {data.vehicleYear}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Km Départ:</strong> {data.vehicleKmDepart}</div>
                <div><strong>Lieu de Livraison:</strong> {data.deliveryLocation}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Date et Heure:</strong> {formatDateTime(data.deliveryDateTime)}</div>
                <div><strong>Nombre de Jour:</strong> {data.rentalDays}</div>
              </div>
              
              <div className="mt-3">
                <VehicleDiagramDisplay />
              </div>
              
              <div className="mt-3">
                <FuelGaugeDisplay level={data.deliveryFuelLevel} />
              </div>
              
              <div><strong>Roues de secours et accessoires:</strong><br/>{data.emergencyEquipmentDelivery}</div>
              <div><strong>Observations:</strong><br/>{data.observationsDelivery}</div>
            </div>
          </div>

          {/* Reprise du Véhicule */}
          <div>
            <h4 className="font-semibold text-center border-b border-black pb-1 mb-3">Reprise du Véhicule</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Date et Heure:</strong> {formatDateTime(data.returnDateTime)}</div>
                <div><strong>Lieu de Récupération:</strong> {data.returnLocation}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Prolongation au:</strong> {formatDate(data.extensionUntil)}</div>
                <div><strong>Km de Retour:</strong> {data.vehicleKmReturn}</div>
              </div>
              <div><strong>Nombre de Jour Prolongé:</strong> {data.extendedDays}</div>
              
              <div className="mt-3">
                <VehicleDiagramDisplay />
              </div>
              
              <div className="mt-3">
                <FuelGaugeDisplay level={data.returnFuelLevel} />
              </div>
              
              <div><strong>Roues de secours et accessoires:</strong><br/>{data.emergencyEquipmentReturn}</div>
              <div><strong>Observations:</strong><br/>{data.observationsReturn}</div>
            </div>
          </div>
        </div>
      </div>

      {/* FACTURATION Section */}
      <div className="mb-6">
        <div className="bg-black text-white p-2 text-center mb-3">
          <h3 className="font-bold">FACTURATION</h3>
        </div>
        
        <div className="grid grid-cols-5 gap-4 text-sm mb-4">
          <div><strong>Prix par Jour:</strong><br/>{data.dailyPrice} DH</div>
          <div><strong>Durée:</strong><br/>{data.rentalDuration} jour(s)</div>
          <div><strong>Prix total:</strong><br/>{data.totalPrice} DH</div>
          <div><strong>Avance:</strong><br/>{data.advance} DH</div>
          <div><strong>Reste:</strong><br/>{data.remaining} DH</div>
        </div>
        
        <div className="text-sm">
          <div><strong>Mode de Règlement:</strong> {data.paymentMethod}</div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
          <p>
            <strong>Le locataire du véhicule {companyName}</strong> reconnaît avoir lu et accepté les conditions 
            générales stipulées au verso du présent contrat, il est le seul responsable en cas de 
            violation de code de la route marocaine.
          </p>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-center mb-3">Signatures à la livraison</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm mb-2">Date: {formatDate(data.deliveryDate)}</div>
              <div className="border-2 border-black h-16 flex items-center justify-center">
                <span className="text-xs">Lu et approuvé<br/>Signature de l'agent<br/>à la livraison</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm mb-2">Date: {formatDate(data.deliveryDate)}</div>
              <div className="border-2 border-black h-16 flex items-center justify-center">
                <span className="text-xs">Lu et approuvé<br/>Signature du locataire<br/>à la livraison</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-center mb-3">Signatures au retour</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm mb-2">Date: {formatDate(data.returnDate)}</div>
              <div className="border-2 border-black h-16 flex items-center justify-center">
                <span className="text-xs">Lu et approuvé<br/>Signature de l'agent<br/>au retour</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm mb-2">Date: {formatDate(data.returnDate)}</div>
              <div className="border-2 border-black h-16 flex items-center justify-center">
                <span className="text-xs">Lu et approuvé<br/>Signature du locataire<br/>au retour</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractFormPDF;
