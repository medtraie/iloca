
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SignaturePadSimple } from "@/components/SignaturePadSimple";

interface Props {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignatureChange?: (type: string, signatureData: string) => void;
  readOnly?: boolean;
}

export default function ContractSignatureFields({ 
  formData, 
  handleInputChange, 
  onSignatureChange,
  readOnly = false 
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Signatures à la livraison */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h4 className="font-semibold text-center mb-4">Signatures à la livraison</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Date :</Label>
            <Input 
              name="deliveryDate" 
              type="date" 
              value={formData.deliveryDate} 
              onChange={handleInputChange} 
              className="text-sm"
              readOnly={readOnly}
            />
            <SignaturePadSimple
              id="delivery-agent-signature"
              value={formData.delivery_agent_signature}
              onChange={(signatureData) => onSignatureChange?.('delivery_agent_signature', signatureData)}
              title="Lu et approuvé - Signature de l'agent à la livraison"
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Date :</Label>
            <Input 
              name="deliveryDate" 
              type="date" 
              value={formData.deliveryDate} 
              onChange={handleInputChange} 
              className="text-sm"
              readOnly={readOnly}
            />
            <SignaturePadSimple
              id="delivery-tenant-signature"
              value={formData.delivery_tenant_signature}
              onChange={(signatureData) => onSignatureChange?.('delivery_tenant_signature', signatureData)}
              title="Lu et approuvé - Signature du locataire à la livraison"
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
      {/* Signatures au retour */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h4 className="font-semibold text-center mb-4">Signatures au retour</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Date :</Label>
            <Input 
              name="returnDate" 
              type="date" 
              value={formData.returnDate} 
              onChange={handleInputChange} 
              className="text-sm"
              readOnly={readOnly}
            />
            <SignaturePadSimple
              id="return-agent-signature"
              value={formData.return_agent_signature}
              onChange={(signatureData) => onSignatureChange?.('return_agent_signature', signatureData)}
              title="Lu et approuvé - Signature de l'agent au retour"
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Date :</Label>
            <Input 
              name="returnDate" 
              type="date" 
              value={formData.returnDate} 
              onChange={handleInputChange} 
              className="text-sm"
              readOnly={readOnly}
            />
            <SignaturePadSimple
              id="return-tenant-signature"
              value={formData.return_tenant_signature}
              onChange={(signatureData) => onSignatureChange?.('return_tenant_signature', signatureData)}
              title="Lu et approuvé - Signature du locataire au retour"
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
