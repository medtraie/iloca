
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceFormTableProps {
  form: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  computedTotalHT: string;
}

const InvoiceFormTable: React.FC<InvoiceFormTableProps> = ({
  form,
  handleChange,
  computedTotalHT,
}) => (
  <div className="overflow-x-auto mt-4">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100 text-xs">
          <th className="border px-2 py-1 w-12">Quantité</th>
          <th className="border px-2 py-1 w-12">UDM</th>
          <th className="border px-2 py-1">Désignation</th>
          <th className="border px-2 py-1 w-28">Prix unitaire HT</th>
          <th className="border px-2 py-1 w-24">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border px-2 py-1">
            <Input name="quantity" value={form.quantity} onChange={handleChange} className="text-xs" />
          </td>
          <td className="border px-2 py-1">
            <Input name="unit" value={form.unit} onChange={handleChange} className="text-xs" />
          </td>
          <td className="border px-2 py-1 min-w-[220px]">
            <Textarea name="description" value={form.description} onChange={handleChange} className="text-xs h-16" />
          </td>
          <td className="border px-2 py-1">
            <Input name="unitPrice" value={form.unitPrice} onChange={handleChange} className="text-xs" />
          </td>
          {/* Total HT cell now shows only computed value (readonly) */}
          <td className="border px-2 py-1">
            <Input name="totalHT" value={computedTotalHT} readOnly className="text-xs bg-gray-100" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

export default InvoiceFormTable;
