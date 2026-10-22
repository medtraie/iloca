import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import '../../core/services/contract_pdf_service.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/whatsapp_helper.dart';
import '../../models/app_models.dart';

/// Official Full-Screen A4 Contract PDF Viewer (100% Web Parity)
class OfficialContractPdfViewScreen extends StatelessWidget {
  final ContractModel contract;

  const OfficialContractPdfViewScreen({
    super.key,
    required this.contract,
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
              'Contrat #${contract.contractNumber}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              contract.customerName,
              style: const TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Partager sur WhatsApp',
            icon: const Icon(LucideIcons.share2, color: AppColors2026.emeraldNeon),
            onPressed: () async {
              final pdfBytes = await ContractPdfService.generateContractPdf(contract);
              await WhatsAppHelper.sharePdf(
                bytes: pdfBytes,
                filename: 'Contrat_${contract.contractNumber.replaceAll("/", "_")}.pdf',
                subject: 'Contrat BonaTours #${contract.contractNumber}',
                phone: contract.customerPhone,
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: PdfPreview(
        build: (PdfPageFormat format) => ContractPdfService.generateContractPdf(contract),
        canChangeOrientation: false,
        canChangePageFormat: false,
        canDebug: false,
        allowPrinting: true,
        allowSharing: true,
        maxPageWidth: 700,
        pdfFileName: 'Contrat_${contract.contractNumber.replaceAll("/", "_")}.pdf',
        loadingWidget: const Center(
          child: CircularProgressIndicator(color: AppColors2026.cyanNeon),
        ),
      ),
    );
  }
}
