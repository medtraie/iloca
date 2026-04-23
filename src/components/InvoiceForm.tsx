
import React, { useState } from "react";
import { useInvoicePDF } from "@/hooks/useInvoicePDF";
import { useInvoices } from "@/hooks/useInvoices";
import { numberToFrenchWords } from "@/utils/numberToFrenchWords";
import InvoiceFormHeader from "./InvoiceFormHeader";
import InvoiceFormTable from "./InvoiceFormTable";
import InvoiceFormTotals from "./InvoiceFormTotals";
import InvoiceFormFooter from "./InvoiceFormFooter";

const initialData = {
  companyName: "BONA TOURS SARL",
  invoiceType: "FACTURE",
  invoiceNumber: "0084/2025",
  invoiceDate: "2025-05-29",
  customerNumber: "419",
  beneficiaryName: "ASSURANCE ATLANTIQUE SUD",
  beneficiaryICE: "001642233600044",
  quantity: "1",
  unit: "J",
  description: "LOCATION COURTE DUREE BMW 320D\nPERIODE DU 27/05/2025 AU 28/05/2025",
  unitPrice: "1000.00",
  totalHT: "1000.00",
  tva: "200.00",
  totalTTC: "1200.00",
  totalWords: "MILLE DEUX CENT DIRHAMS ET ZERO CENTIMES",
  paymentMethod: "CHEQUE"
};

interface InvoiceFormProps {
  onInvoiceCreated?: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onInvoiceCreated }) => {
  const [form, setForm] = useState(initialData);
  const { generateInvoicePDF } = useInvoicePDF();
  const { addInvoice } = useInvoices();

  // Reactive compute for arithmetics
  const quantity = parseFloat(form.quantity.replace(",", ".")) || 0;
  const unitPrice = parseFloat(form.unitPrice.replace(",", ".")) || 0;

  // Auto compute Total HT
  const computedTotalHT = (quantity * unitPrice).toFixed(2);

  // TVA is fixed at 20%
  const computedTVA = (parseFloat(computedTotalHT) * 0.2).toFixed(2);

  // Total TTC = HT + TVA
  const computedTotalTTC = (parseFloat(computedTotalHT) + parseFloat(computedTVA)).toFixed(2);

  // French words for total TTC
  const computedTotalWords = numberToFrenchWords(computedTotalTTC);

  // Controlled form state handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // PDF generation handler
  const handleGeneratePDF = async () => {
    const invoiceData = {
      invoiceNumber: form.invoiceNumber,
      customerName: form.beneficiaryName,
      customerICE: form.beneficiaryICE,
      invoiceDate: form.invoiceDate,
      description: form.description,
      totalHT: parseFloat(computedTotalHT),
      tva: parseFloat(computedTVA),
      totalTTC: parseFloat(computedTotalTTC),
      paymentMethod: form.paymentMethod,
      status: 'pending' as const
    };
    
    // Save invoice to localStorage
    const result = await addInvoice(invoiceData);
    
    if (result) {
      // Generate PDF
      generateInvoicePDF({
        ...form,
        totalHT: computedTotalHT,
        tva: computedTVA,
        totalTTC: computedTotalTTC,
        totalWords: computedTotalWords,
      });
      
      // Notify parent component
      if (onInvoiceCreated) {
        onInvoiceCreated();
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-card rounded-xl shadow-lg p-6 border border-border mt-8">
      <form className="space-y-5">
        <InvoiceFormHeader form={form} handleChange={handleChange} />
        <InvoiceFormTable form={form} handleChange={handleChange} computedTotalHT={computedTotalHT} />
        <InvoiceFormTotals computedTotalHT={computedTotalHT} computedTVA={computedTVA} computedTotalTTC={computedTotalTTC} />
        <InvoiceFormFooter
          computedTotalWords={computedTotalWords}
          paymentMethod={form.paymentMethod}
          onChange={handleChange}
          onGeneratePDF={handleGeneratePDF}
        />
      </form>
    </div>
  );
};

export default InvoiceForm;
