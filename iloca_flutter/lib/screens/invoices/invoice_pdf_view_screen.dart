import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../../core/services/invoice_pdf_service.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/whatsapp_helper.dart';
import '../../models/app_models.dart';

/// Official Full-Screen A4 Invoice PDF Viewer (100% Web Parity)
class OfficialInvoicePdfViewScreen extends StatelessWidget {
  final InvoiceModel invoice;

  const OfficialInvoicePdfViewScreen({
    super.key,
    required this.invoice,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors2026.abyss,
      appBar: AppBar(
        backgroundColor: AppColors2026.obsidian,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Facture #${invoice.invoiceNumber}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              invoice.customerName,
              style: const TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Partager sur WhatsApp',
            icon: const Icon(LucideIcons.share2, color: AppColors2026.emeraldNeon),
            onPressed: () async {
              final pdfBytes = await InvoicePdfService.generateInvoicePdf(invoice);
              await WhatsAppHelper.sharePdf(
                bytes: pdfBytes,
                filename: 'Facture_${invoice.invoiceNumber.replaceAll("/", "_")}.pdf',
                subject: 'Facture BonaTours #${invoice.invoiceNumber}',
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: PdfPreview(
        build: (PdfPageFormat format) => InvoicePdfService.generateInvoicePdf(invoice),
        canChangeOrientation: false,
        canChangePageFormat: false,
        canDebug: false,
        allowPrinting: true,
        allowSharing: true,
        maxPageWidth: 700,
        pdfFileName: 'Facture_${invoice.invoiceNumber.replaceAll("/", "_")}.pdf',
        loadingWidget: const Center(
          child: CircularProgressIndicator(color: AppColors2026.cyanNeon),
        ),
      ),
    );
  }
}
