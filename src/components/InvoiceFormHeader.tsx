
import React from "react";
import { Input } from "@/components/ui/input";

interface InvoiceFormHeaderProps {
  form: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const InvoiceFormHeader: React.FC<InvoiceFormHeaderProps> = ({ form, handleChange }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
    <div className="w-full">
      <Input
        name="companyName"
        value={form.companyName}
        onChange={handleChange}
        className="font-bold text-xl border-none p-0"
        style={{ fontWeight: 700, fontSize: 24 }}
      />
      <div className="flex gap-2 items-center mt-2">
        <span className="font-semibold text-sm">Document:</span>
        <Input
          name="invoiceType"
          value={form.invoiceType}
          onChange={handleChange}
          className="w-28"
        />
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        <div className="space-x-2 text-sm flex items-center">
          <span>Numéro:</span>
          <Input
            name="invoiceNumber"
            value={form.invoiceNumber}
            onChange={handleChange}
            className="inline w-24 ml-1"
          />
        </div>
        <div className="space-x-2 text-sm flex items-center">
          <span>Date:</span>
          <Input
            name="invoiceDate"
            type="date"
            value={form.invoiceDate}
            onChange={handleChange}
            className="inline w-36 ml-1"
          />
        </div>
        <div className="space-x-2 text-sm flex items-center">
          <span>N° Client:</span>
          <Input
            name="customerNumber"
            value={form.customerNumber}
            onChange={handleChange}
            className="inline w-20 ml-1"
          />
        </div>
      </div>
    </div>
    <div className="text-left md:text-right border border-black p-2 rounded font-bold text-sm w-full md:w-[230px] shrink-0">
      <Input
        name="beneficiaryName"
        value={form.beneficiaryName}
        onChange={handleChange}
        className="font-semibold text-sm border-none p-0"
      />
      <div className="text-xs">
        ICE:
        <Input
          name="beneficiaryICE"
          value={form.beneficiaryICE}
          onChange={handleChange}
          className="inline w-[140px] ml-1 text-xs border-none p-0 bg-transparent"
        />
      </div>
    </div>
  </div>
);

export default InvoiceFormHeader;
