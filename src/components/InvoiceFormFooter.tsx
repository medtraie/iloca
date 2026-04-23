
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InvoiceFormFooterProps {
  computedTotalWords: string;
  paymentMethod: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onGeneratePDF: () => void;
}

const InvoiceFormFooter: React.FC<InvoiceFormFooterProps> = ({
  computedTotalWords,
  paymentMethod,
  onChange,
  onGeneratePDF,
}) => (
  <div className="mt-2 space-y-3">
    <div>
      <div className="text-xs">Arrêtée en Lettres :</div>
      <Textarea
        name="totalWords"
        value={computedTotalWords}
        readOnly
        className="mt-1 text-xs bg-gray-100"
      />
    </div>
    <div className="flex items-center gap-2 mt-2">
      <span className="font-semibold text-sm">Modalité de paiement :</span>
      <Input
        name="paymentMethod"
        value={paymentMethod}
        onChange={onChange}
        className="w-40 text-xs"
      />
    </div>
    <div className="flex justify-center mt-6">
      <Button
        type="button"
        onClick={onGeneratePDF}
      >
        Générer une version PDF conforme
      </Button>
    </div>
  </div>
);

export default InvoiceFormFooter;
