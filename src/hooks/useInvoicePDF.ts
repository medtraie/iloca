
import { useCallback } from "react";

export interface InvoicePDFData {
  companyName: string;
  invoiceType: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerNumber: string;
  beneficiaryName: string;
  beneficiaryICE: string;
  quantity: string;
  unit: string;
  description: string;
  unitPrice: string;
  totalHT: string;
  tva: string;
  totalTTC: string;
  totalWords: string;
  paymentMethod: string;
}

export const useInvoicePDF = () => {
  const generateInvoicePDF = useCallback(async (data: InvoicePDFData) => {
    // Minimal PDF-ish print-friendly layout, black/white, inspired by the scanned invoice
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.companyName} - ${data.invoiceType}</title>
        <meta charset="UTF-8"/>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background: #fff;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 40px 60px;
            font-size: 14px;
            width: 210mm;
            min-height: 297mm;
            box-sizing: border-box;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
          }
          .company-name {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          .doc-type {
            font-weight: 600;
            font-size: 18px;
            letter-spacing: 2px;
            margin-top: 12px;
          }
          .table-info {
            margin-top: 16px;
            font-size: 14px;
          }
          .beneficiary-box {
            border: 2px solid #000;
            padding: 12px 20px;
            text-align: right;
            font-weight: bold;
            font-size: 15px;
            min-width: 280px;
            margin-top: 8px;
          }
          .beneficiary-ice {
            font-size: 13px;
            margin-top: 10px;
            font-weight: 400;
          }
          .meta-table {
            margin-top: 8px;
            font-size: 14px;
          }
          .meta-table td {
            padding: 4px 16px 4px 0;
          }
          .invoice-table {
            width: 100%;
            margin-top: 40px;
            border-collapse: collapse;
            font-size: 14px;
          }
          .invoice-table thead th {
            border: 1px solid #000;
            background: #f5f5f5;
            font-weight: 600;
            font-size: 14px;
            padding: 10px 12px;
          }
          .invoice-table td {
            border: 1px solid #000;
            padding: 12px;
            font-size: 14px;
            vertical-align: top;
          }
          .invoice-table td.description {
            white-space: pre-line;
            line-height: 1.6;
          }
          .totals-box {
            width: 350px;
            float: right;
            margin-top: 20px;
            margin-bottom: 40px;
            font-size: 14px;
          }
          .totals-box table {
            width: 100%;
          }
          .totals-box td {
            text-align: right;
            padding: 8px 0;
            font-size: 14px;
          }
          .total-label {
            font-weight: 600;
          }
          .letters {
            margin-top: 40px;
            font-size: 14px;
            font-style: italic;
            line-height: 1.5;
          }
          .payment-method {
            margin-top: 20px;
            font-size: 14px;
          }
          .company-stamp {
            font-size: 14px;
            text-align: right;
            margin-top: 50px;
            margin-right: 12px;
          }
          .custom-invoice-footer {
            width: 100%;
            text-align: center;
            position: absolute;
            bottom: 40px;
            left: 0;
            right: 0;
            font-size: 13px;
            font-family: Arial, Helvetica, sans-serif;
          }
          .custom-invoice-footer .footer-main {
            font-weight: bold;
            letter-spacing: 1px;
            font-size: 14px;
          }
          .custom-invoice-footer .footer-details {
            font-size: 12px;
            margin-top: 6px;
            margin-bottom: 6px;
          }
          .custom-invoice-footer .footer-contact {
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company-name">${data.companyName}</div>
            <div class="doc-type">${data.invoiceType}</div>
            <table class="meta-table">
              <tr>
                <td><strong>Numéro:</strong></td>
                <td>${data.invoiceNumber}</td>
              </tr>
              <tr>
                <td><strong>Date:</strong></td>
                <td>${new Date(data.invoiceDate).toLocaleDateString("fr-FR")}</td>
              </tr>
              <tr>
                <td><strong>N° Client:</strong></td>
                <td>${data.customerNumber}</td>
              </tr>
            </table>
          </div>
          <div class="beneficiary-box">
            ${data.beneficiaryName}
            <div class="beneficiary-ice">ICE: ${data.beneficiaryICE}</div>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>Quantité</th>
              <th>UDM</th>
              <th>Désignation</th>
              <th>Prix unitaire HT</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">${data.quantity}</td>
              <td style="text-align: center;">${data.unit}</td>
              <td class="description">${data.description}</td>
              <td style="text-align: right;">${parseFloat(data.unitPrice).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
              <td style="text-align: right;">${parseFloat(data.totalHT).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals-box">
          <table>
            <tr>
              <td class="total-label">Total HT:</td>
              <td>${parseFloat(data.totalHT).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</td>
            </tr>
            <tr>
              <td class="total-label">TVA 20%:</td>
              <td>${parseFloat(data.tva).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</td>
            </tr>
            <tr>
              <td class="total-label">Total TTC:</td>
              <td><b>${parseFloat(data.totalTTC).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</b></td>
            </tr>
          </table>
        </div>

        <div style="clear: both;"></div>
        <div class="letters">
          <strong>Arrêtée en Lettres :</strong> ${data.totalWords}
        </div>
        <div class="payment-method">
          <strong>Modalité de paiement :</strong> ${data.paymentMethod}
        </div>
        <div class="company-stamp">
          <em>SFTLOCATION SARL</em><br/>
          <em>Location de Voiture</em>
        </div>

        <!-- ==== Custom Invoice Footer ==== -->
        <div class="custom-invoice-footer">
          <div class="footer-main">
            10 AVENUE DES FAR BUREAU N308-CASABLANCA
          </div>
          <div class="footer-details">
            RC: 341955 &nbsp; IF: 18734253 &nbsp; P3515353P &nbsp; CNSS: 9928112 &nbsp; CE 00003111000011
          </div>
          <div class="footer-contact">
            Tel: 05 22 22 87 04 &nbsp; Fax: 05 22 47 1780 &nbsp; E-mail: bonatoun308@gmall.com
          </div>
        </div>
      </body>
      </html>
    `;

    // فتح نافذة جديدة للطباعة/ PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("تعذر فتح نافذة لطباعة الفاتورة!");
      return false;
    }
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);

    return true;
  }, []);

  return { generateInvoicePDF };
};
