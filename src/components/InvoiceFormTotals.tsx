
import React from "react";
import { Input } from "@/components/ui/input";

interface InvoiceFormTotalsProps {
  computedTotalHT: string;
  computedTVA: string;
  computedTotalTTC: string;
}

const InvoiceFormTotals: React.FC<InvoiceFormTotalsProps> = ({
  computedTotalHT,
  computedTVA,
  computedTotalTTC,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
    <div />
    <div className="text-right space-y-1">
      <div>
        <span>Total HT:</span>
        <Input
          name="totalHT"
          value={computedTotalHT}
          readOnly
          className="inline w-24 ml-2 bg-gray-100"
        /> MAD
      </div>
      <div>
        <span>TVA 20%: </span>
        <Input
          name="tva"
          value={computedTVA}
          readOnly
          className="inline w-24 ml-2 bg-gray-100"
        /> MAD
      </div>
      <div>
        <span>Total TTC: </span>
        <Input
          name="totalTTC"
          value={computedTotalTTC}
          readOnly
          className="inline w-24 ml-2 bg-gray-100"
        /> MAD
      </div>
    </div>
  </div>
);

export default InvoiceFormTotals;
