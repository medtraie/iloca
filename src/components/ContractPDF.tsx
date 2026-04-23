
import ContractPDFHeader from './ContractPDFHeader';
import { SignatureRenderer } from './SignatureRenderer';

interface DamagePoint {
  id?: string;
  x: number;
  y: number;
}

interface ContractData {
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCIN: string;
  customerLicense: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear: string;
  startDate: string;
  endDate: string;
  dailyRate: number;
  totalDays: number;
  totalAmount: number;
  deposit: number;
  remainingAmount: number;
  startKm: number;
  endKm?: number;
  
  // Interactive elements
  delivery_fuel_level?: number;
  return_fuel_level?: number;
  delivery_damages?: DamagePoint[];
  return_damages?: DamagePoint[];
  
  // Signatures
  deliveryDate?: string;
  returnDate?: string;
  delivery_agent_signature?: string;
  delivery_tenant_signature?: string;
  return_agent_signature?: string;
  return_tenant_signature?: string;
}

interface ContractPDFProps {
  data: ContractData;
}

const ContractPDF = ({ data }: ContractPDFProps) => {

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white text-black print:p-4">
      {/* Header */}
      <ContractPDFHeader contractNumber={data.contractNumber} />
      
      {/* Contract content */}
      <div className="space-y-6">
        {/* Client Information */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            INFORMATIONS CLIENT
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Nom complet :</span> {data.customerName}
            </div>
            <div>
              <span className="font-semibold">Téléphone :</span> {data.customerPhone}
            </div>
            <div className="md:col-span-2">
              <span className="font-semibold">Adresse :</span> {data.customerAddress}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            INFORMATIONS VÉHICULE
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Marque :</span> {data.vehicleBrand}
            </div>
            <div>
              <span className="font-semibold">Modèle :</span> {data.vehicleModel}
            </div>
            <div>
              <span className="font-semibold">Immatriculation :</span> {data.vehiclePlate}
            </div>
            <div>
              <span className="font-semibold">Année :</span> {data.vehicleYear}
            </div>
            <div>
              <span className="font-semibold">Kilométrage de départ :</span> {data.startKm.toLocaleString()} km
            </div>
            {data.endKm && (
              <div>
                <span className="font-semibold">Kilométrage de retour :</span> {data.endKm.toLocaleString()} km
              </div>
            )}
          </div>
        </div>

        {/* Rental Period */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            PÉRIODE DE LOCATION
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="font-semibold">Date de début :</span> {new Date(data.startDate).toLocaleDateString('fr-FR')}
            </div>
            <div>
              <span className="font-semibold">Date de fin :</span> {new Date(data.endDate).toLocaleDateString('fr-FR')}
            </div>
            <div>
              <span className="font-semibold">Nombre de jours :</span> {data.totalDays} jour{data.totalDays > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            INFORMATIONS FINANCIÈRES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-semibold">Tarif journalier :</span> {data.dailyRate} DH
            </div>
            <div>
              <span className="font-semibold">Montant total :</span> {data.totalAmount} DH
            </div>
            <div>
              <span className="font-semibold">Caution versée :</span> {data.deposit} DH
            </div>
            <div>
              <span className="font-semibold">Montant restant :</span> {data.remainingAmount} DH
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div>
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            CONDITIONS GÉNÉRALES
          </h3>
          <div className="space-y-2 text-sm">
            <p>• Le locataire s'engage à utiliser le véhicule conformément aux règles de circulation en vigueur.</p>
            <p>• Tout dommage causé au véhicule sera à la charge du locataire.</p>
            <p>• Le véhicule doit être rendu dans le même état qu'au moment de la prise en charge.</p>
            <p>• Le locataire est responsable des contraventions et infractions commises pendant la période de location.</p>
            <p>• En cas de retard de restitution, des frais supplémentaires seront facturés.</p>
          </div>
        </div>

        {/* Vehicle Damage Diagrams */}
        {(data.delivery_damages?.length > 0 || data.return_damages?.length > 0) && (
          <div>
            <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
              ÉTAT DU VÉHICULE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.delivery_damages?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dommages à la livraison</h4>
                  <div className="relative border border-gray-300 rounded p-2">
                    <img 
                      src="/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png"
                      alt="Schéma véhicule - Livraison"
                      className="w-full max-w-xs mx-auto"
                    />
                    {data.delivery_damages.map((damage, index) => (
                      <div
                        key={index}
                        className="absolute w-2 h-2 bg-red-500 border border-white rounded-full"
                        style={{
                          left: `${damage.x}%`,
                          top: `${damage.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {data.return_damages?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Dommages au retour</h4>
                  <div className="relative border border-gray-300 rounded p-2">
                    <img 
                      src="/lovable-uploads/b28228b7-89d0-46f1-88ae-39cdf67d2bde.png"
                      alt="Schéma véhicule - Retour"
                      className="w-full max-w-xs mx-auto"
                    />
                    {data.return_damages.map((damage, index) => (
                      <div
                        key={index}
                        className="absolute w-2 h-2 bg-red-500 border border-white rounded-full"
                        style={{
                          left: `${damage.x}%`,
                          top: `${damage.y}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fuel Levels */}
        {(data.delivery_fuel_level || data.return_fuel_level) && (
          <div>
            <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
              NIVEAU DE CARBURANT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.delivery_fuel_level && (
                <div className="text-center">
                  <h4 className="font-semibold mb-2">À la livraison</h4>
                  <div className="mx-auto" style={{ width: '120px', height: '120px' }}>
                    <div className="relative w-full h-full border-4 border-gray-300 rounded-full overflow-hidden">
                      <div 
                        className="absolute bottom-0 w-full bg-blue-500 transition-all"
                        style={{ height: `${data.delivery_fuel_level}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-bold">
                        {data.delivery_fuel_level}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {data.return_fuel_level && (
                <div className="text-center">
                  <h4 className="font-semibold mb-2">Au retour</h4>
                  <div className="mx-auto" style={{ width: '120px', height: '120px' }}>
                    <div className="relative w-full h-full border-4 border-gray-300 rounded-full overflow-hidden">
                      <div 
                        className="absolute bottom-0 w-full bg-blue-500 transition-all"
                        style={{ height: `${data.return_fuel_level}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center font-bold">
                        {data.return_fuel_level}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12">
          <h3 className="text-lg font-bold mb-3 border-b-2 border-black pb-1">
            SIGNATURES
          </h3>
          
          {/* Delivery Signatures */}
          <div className="mb-8">
            <h4 className="font-semibold mb-4">Signatures à la livraison - Date: {data.deliveryDate}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-gray-300 p-4 rounded">
                <p className="font-semibold text-center mb-2">Signature de l'agent</p>
                <div className="h-20 flex items-center justify-center">
                  <SignatureRenderer 
                    signatureData={data.delivery_agent_signature}
                    width={200}
                    height={80}
                  />
                </div>
                <p className="text-xs text-center mt-2">Lu et approuvé</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="font-semibold text-center mb-2">Signature du locataire</p>
                <div className="h-20 flex items-center justify-center">
                  <SignatureRenderer 
                    signatureData={data.delivery_tenant_signature}
                    width={200}
                    height={80}
                  />
                </div>
                <p className="text-xs text-center mt-2">Lu et approuvé</p>
              </div>
            </div>
          </div>

          {/* Return Signatures */}
          <div>
            <h4 className="font-semibold mb-4">Signatures au retour - Date: {data.returnDate}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-gray-300 p-4 rounded">
                <p className="font-semibold text-center mb-2">Signature de l'agent</p>
                <div className="h-20 flex items-center justify-center">
                  <SignatureRenderer 
                    signatureData={data.return_agent_signature}
                    width={200}
                    height={80}
                  />
                </div>
                <p className="text-xs text-center mt-2">Lu et approuvé</p>
              </div>
              <div className="border border-gray-300 p-4 rounded">
                <p className="font-semibold text-center mb-2">Signature du locataire</p>
                <div className="h-20 flex items-center justify-center">
                  <SignatureRenderer 
                    signatureData={data.return_tenant_signature}
                    width={200}
                    height={80}
                  />
                </div>
                <p className="text-xs text-center mt-2">Lu et approuvé</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractPDF;
