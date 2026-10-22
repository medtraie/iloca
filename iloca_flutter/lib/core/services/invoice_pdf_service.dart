import 'dart:typed_data';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import '../../models/app_models.dart';
import '../utils/number_to_words.dart';

class InvoicePdfService {
  /// Generates the exact PDF matching Web (`useInvoicePDF.ts`)
  static Future<Uint8List> generateInvoicePdf(InvoiceModel inv) async {
    final pdf = pw.Document();
    final fmt = NumberFormat('#,##0.00', 'fr_FR');
    final amountInWords = NumberToFrenchWords.convert(inv.totalTTC);

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // 1. Header (Company + Doc Type + Beneficiary)
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'BONA TOURS SARL',
                        style: pw.TextStyle(
                          fontSize: 20,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 1.5,
                        ),
                      ),
                      pw.SizedBox(height: 6),
                      pw.Text(
                        'FACTURE',
                        style: pw.TextStyle(
                          fontSize: 14,
                          fontWeight: pw.FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                      pw.SizedBox(height: 10),
                      pw.Table(
                        children: [
                          pw.TableRow(
                            children: [
                              pw.Text('Numéro : ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                              pw.Text(inv.invoiceNumber, style: const pw.TextStyle(fontSize: 10)),
                            ],
                          ),
                          pw.TableRow(
                            children: [
                              pw.Text('Date : ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                              pw.Text(inv.invoiceDate, style: const pw.TextStyle(fontSize: 10)),
                            ],
                          ),
                          pw.TableRow(
                            children: [
                              pw.Text('N° Client : ', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10)),
                              pw.Text(inv.customerName, style: const pw.TextStyle(fontSize: 10)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  // Beneficiary Box
                  pw.Container(
                    width: 200,
                    padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: pw.BoxDecoration(
                      border: pw.Border.all(color: PdfColors.black, width: 1.5),
                    ),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text(
                          inv.customerName,
                          textAlign: pw.TextAlign.right,
                          style: pw.TextStyle(
                            fontSize: 12,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                        if (inv.customerICE.isNotEmpty) ...[
                          pw.SizedBox(height: 6),
                          pw.Text(
                            'ICE: ${inv.customerICE}',
                            textAlign: pw.TextAlign.right,
                            style: const pw.TextStyle(fontSize: 10),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 30),

              // 2. Invoice Table
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.black, width: 1),
                columnWidths: const {
                  0: pw.FixedColumnWidth(60),
                  1: pw.FixedColumnWidth(55),
                  2: pw.FlexColumnWidth(),
                  3: pw.FixedColumnWidth(100),
                  4: pw.FixedColumnWidth(100),
                },
                children: [
                  // Table Header
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                    children: [
                      _th('Quantité', align: pw.TextAlign.center),
                      _th('UDM', align: pw.TextAlign.center),
                      _th('Désignation', align: pw.TextAlign.left),
                      _th('Prix unitaire HT', align: pw.TextAlign.right),
                      _th('Total HT', align: pw.TextAlign.right),
                    ],
                  ),
                  // Table Row
                  pw.TableRow(
                    children: [
                      _td(inv.quantity.toStringAsFixed(inv.quantity.truncateToDouble() == inv.quantity ? 0 : 2), align: pw.TextAlign.center),
                      _td(inv.unit, align: pw.TextAlign.center),
                      _td(inv.description.isNotEmpty ? inv.description : 'Location de véhicule', align: pw.TextAlign.left),
                      _td('${fmt.format(inv.unitPrice)} DH', align: pw.TextAlign.right),
                      _td('${fmt.format(inv.totalHT)} DH', align: pw.TextAlign.right),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 18),

              // 3. Totals Box (Right aligned)
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Container(
                  width: 220,
                  child: pw.Table(
                    children: [
                      pw.TableRow(
                        children: [
                          pw.Text('Total HT :', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                          pw.Text('${fmt.format(inv.totalHT)} DH', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                      pw.TableRow(
                        children: [
                          pw.Text('TVA (20%) :', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                          pw.Text('${fmt.format(inv.tva)} DH', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 10)),
                        ],
                      ),
                      pw.TableRow(
                        children: [
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(top: 4),
                            child: pw.Text('TOTAL TTC :', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                          ),
                          pw.Padding(
                            padding: const pw.EdgeInsets.only(top: 4),
                            child: pw.Text('${fmt.format(inv.totalTTC)} DH', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              pw.SizedBox(height: 25),

              // 4. Amount in Letters & Payment Method
              pw.Text(
                'Arrêtée la présente facture à la somme de :',
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),
              pw.SizedBox(height: 3),
              pw.Text(
                amountInWords,
                style: pw.TextStyle(fontSize: 10, fontStyle: pw.FontStyle.italic),
              ),

              pw.SizedBox(height: 14),

              pw.Text(
                'Modalité de paiement : ${inv.paymentMethod}',
                style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
              ),

              pw.SizedBox(height: 30),

              // 5. Signature & Stamp
              pw.Align(
                alignment: pw.Alignment.centerRight,
                child: pw.Padding(
                  padding: const pw.EdgeInsets.only(right: 20),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(
                        'Pour BONA TOURS SARL',
                        style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold),
                      ),
                      pw.Text(
                        'Cachet et signature autorisée',
                        style: pw.TextStyle(fontSize: 9, fontStyle: pw.FontStyle.italic),
                      ),
                      pw.SizedBox(height: 50),
                    ],
                  ),
                ),
              ),

              pw.Spacer(),

              // 6. Official Footer matching Web exactly
              pw.Divider(color: PdfColors.grey400, thickness: 0.5),
              pw.SizedBox(height: 4),
              pw.Center(
                child: pw.Column(
                  children: [
                    pw.Text(
                      '10 AVENUE DES FAR BUREAU N308 - CASABLANCA',
                      style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'RC: 341955   IF: 18734253   Patente: 3515353P   CNSS: 9928112   ICE: 00003111000011',
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      'Tél: 05 22 22 87 04   Fax: 05 22 47 17 80   E-mail: bonatours308@gmail.com',
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey700),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );

    return await pdf.save();
  }

  static pw.Widget _th(String text, {pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: pw.Text(
        text,
        textAlign: align,
        style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold),
      ),
    );
  }

  static pw.Widget _td(String text, {pw.TextAlign align = pw.TextAlign.left}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: pw.Text(
        text,
        textAlign: align,
        style: const pw.TextStyle(fontSize: 9),
      ),
    );
  }
}
