import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/services/invoice_pdf_service.dart';
import '../../core/theme/app_theme_2026.dart';
import '../../core/utils/whatsapp_helper.dart';
import '../../core/widgets/spatial_glass_widgets.dart';
import '../../models/app_models.dart';
import '../../providers/app_state_provider.dart';
import 'invoice_form_dialog.dart';

/// 100% Web Parity Factures Screen (Matching Factures.tsx + InvoicesTable.tsx)
class InvoicesScreen extends StatefulWidget {
  final AppStateProvider appState;

  const InvoicesScreen({super.key, required this.appState});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  String _search = '';
  String _statusFilter = 'all'; // 'all' | 'pending' | 'paid' | 'overdue'

  void _openInvoiceForm([InvoiceModel? existing]) {
    Navigator.of(context).push(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (ctx) => InvoiceFormDialog(
          appState: widget.appState,
          existingInvoice: existing,
        ),
      ),
    );
  }

  Future<void> _shareWhatsApp(InvoiceModel inv) async {
    final currencyFmt = NumberFormat('#,##0.00', 'fr_FR');
    final message = '''*BONATOURS SARL - FACTURE N° ${inv.invoiceNumber}*
Date: ${inv.invoiceDate}
Client: ${inv.customerName}
${inv.customerICE.isNotEmpty ? "ICE: ${inv.customerICE}\n" : ""}Prestation: ${inv.description}
Total HT: ${currencyFmt.format(inv.totalHT)} DH
TVA (20%): ${currencyFmt.format(inv.tva)} DH
*TOTAL TTC: ${currencyFmt.format(inv.totalTTC)} DH*
Règlement: ${inv.paymentMethod}
Statut: ${inv.isPaid ? "PAYÉE" : "EN ATTENTE"}

_Document officiel généré via BonaTours Cockpit._''';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors2026.obsidianSurface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(LucideIcons.receipt, color: AppColors2026.cyanNeon, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Facture #${inv.invoiceNumber}',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              ListTile(
                leading: const Icon(LucideIcons.messageSquare, color: AppColors2026.emeraldNeon),
                title: const Text('Partager Résumé WhatsApp'),
                subtitle: const Text('Envoi du récapitulatif par message'),
                onTap: () {
                  Navigator.pop(ctx);
                  WhatsAppHelper.shareTextMessage(phone: '', message: message);
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.fileText, color: AppColors2026.cyanBright),
                title: const Text('Partager PDF Facture'),
                subtitle: const Text('Document PDF identique au Web'),
                onTap: () async {
                  Navigator.pop(ctx);
                  final pdfBytes = await InvoicePdfService.generateInvoicePdf(inv);
                  await WhatsAppHelper.sharePdf(
                    bytes: pdfBytes,
                    filename: 'Facture_${inv.invoiceNumber.replaceAll("/", "_")}.pdf',
                    subject: 'Facture BonaTours #${inv.invoiceNumber}',
                  );
                },
              ),
              ListTile(
                leading: const Icon(LucideIcons.printer, color: AppColors2026.amberSolar),
                title: const Text('Télécharger / Imprimer PDF'),
                subtitle: const Text('Sauvegarder ou imprimer le document'),
                onTap: () async {
                  Navigator.pop(ctx);
                  final pdfBytes = await InvoicePdfService.generateInvoicePdf(inv);
                  await WhatsAppHelper.printOrDownloadPdf(
                    bytes: pdfBytes,
                    filename: 'Facture_${inv.invoiceNumber.replaceAll("/", "_")}',
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(InvoiceModel inv) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors2026.obsidianSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: BorderSide(color: AppColors2026.roseLaser.withOpacity(0.4)),
        ),
        title: const Row(
          children: [
            Icon(LucideIcons.alertTriangle, color: AppColors2026.roseLaser, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Supprimer la facture ?',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
              ),
            ),
          ],
        ),
        content: Text(
          'Êtes-vous sûr de vouloir supprimer définitivement la facture #${inv.invoiceNumber} au nom de "${inv.customerName}" ?',
          style: const TextStyle(fontSize: 13, color: AppColors2026.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors2026.roseLaser,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await widget.appState.deleteInvoice(inv.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final allInvoices = widget.appState.invoices;
    final currencyFmt = NumberFormat('#,##0', 'fr_FR');

    // Telemetry stats
    double totalBilledTTC = 0;
    double totalPaid = 0;
    double totalPending = 0;
    double totalOverdue = 0;
    int paidCount = 0;
    int pendingCount = 0;
    int overdueCount = 0;

    for (final inv in allInvoices) {
      totalBilledTTC += inv.totalTTC;
      if (inv.isPaid) {
        totalPaid += inv.totalTTC;
        paidCount++;
      } else if (inv.isOverdue) {
        totalOverdue += inv.totalTTC;
        overdueCount++;
      } else {
        totalPending += inv.totalTTC;
        pendingCount++;
      }
    }

    // Filter
    final filtered = allInvoices.where((inv) {
      if (_statusFilter == 'paid' && !inv.isPaid) return false;
      if (_statusFilter == 'pending' && !inv.isPending) return false;
      if (_statusFilter == 'overdue' && !inv.isOverdue) return false;

      if (_search.trim().isNotEmpty) {
        final q = _search.toLowerCase();
        return inv.invoiceNumber.toLowerCase().contains(q) ||
            inv.customerName.toLowerCase().contains(q) ||
            inv.customerICE.toLowerCase().contains(q) ||
            inv.description.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: Padding(
        padding: const EdgeInsets.only(bottom: 90),
        child: FloatingActionButton.extended(
          heroTag: 'new_invoice_fab_btn',
          onPressed: () => _openInvoiceForm(),
          backgroundColor: AppColors2026.cyanNeon,
          foregroundColor: AppColors2026.abyss,
          icon: const Icon(LucideIcons.filePlus2, size: 18),
          label: const Text(
            'Nouvelle Facture',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors2026.cyanNeon,
        onRefresh: () async => await widget.appState.refreshAllData(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 6, 16, 120),
          children: [
            // 1. STATS OVERVIEW CARDS (Matching InvoiceStatsCards.tsx)
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _InvoiceKpiTile(
                    title: 'Total Facturé',
                    value: '${currencyFmt.format(totalBilledTTC.round())} DH',
                    subtitle: '${allInvoices.length} factures au total',
                    icon: LucideIcons.receipt,
                    color: AppColors2026.cyanNeon,
                  ),
                  const SizedBox(width: 8),
                  _InvoiceKpiTile(
                    title: 'Payées',
                    value: '${currencyFmt.format(totalPaid.round())} DH',
                    subtitle: '$paidCount encaissée(s)',
                    icon: LucideIcons.checkCircle2,
                    color: AppColors2026.emeraldNeon,
                  ),
                  const SizedBox(width: 8),
                  _InvoiceKpiTile(
                    title: 'En Attente',
                    value: '${currencyFmt.format(totalPending.round())} DH',
                    subtitle: '$pendingCount en cours',
                    icon: LucideIcons.clock3,
                    color: AppColors2026.amberSolar,
                  ),
                  const SizedBox(width: 8),
                  _InvoiceKpiTile(
                    title: 'En Retard',
                    value: '${currencyFmt.format(totalOverdue.round())} DH',
                    subtitle: '$overdueCount impayée(s)',
                    icon: LucideIcons.alertTriangle,
                    color: AppColors2026.roseLaser,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // 2. SEARCH BAR & QUICK FILTERS
            SizedBox(
              height: 42,
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
                  hintText: 'Rechercher N° facture, client, ICE...',
                  prefixIcon: const Icon(LucideIcons.search, size: 16),
                  suffixIcon: _search.isNotEmpty
                      ? IconButton(
                          icon: const Icon(LucideIcons.x, size: 14),
                          onPressed: () => setState(() => _search = ''),
                        )
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChipBtn(
                    label: 'Toutes (${allInvoices.length})',
                    selected: _statusFilter == 'all',
                    color: AppColors2026.cyanNeon,
                    onTap: () => setState(() => _statusFilter = 'all'),
                  ),
                  const SizedBox(width: 6),
                  _FilterChipBtn(
                    label: 'En attente ($pendingCount)',
                    selected: _statusFilter == 'pending',
                    color: AppColors2026.amberSolar,
                    onTap: () => setState(() => _statusFilter = 'pending'),
                  ),
                  const SizedBox(width: 6),
                  _FilterChipBtn(
                    label: 'Payées ($paidCount)',
                    selected: _statusFilter == 'paid',
                    color: AppColors2026.emeraldNeon,
                    onTap: () => setState(() => _statusFilter = 'paid'),
                  ),
                  const SizedBox(width: 6),
                  _FilterChipBtn(
                    label: 'En retard ($overdueCount)',
                    selected: _statusFilter == 'overdue',
                    color: AppColors2026.roseLaser,
                    onTap: () => setState(() => _statusFilter = 'overdue'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // 3. INVOICES LIST
            if (filtered.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Center(
                  child: Column(
                    children: [
                      Icon(LucideIcons.receipt, size: 48, color: AppColors2026.textMuted),
                      const SizedBox(height: 12),
                      const Text(
                        'Aucune facture trouvée',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors2026.textSecondary),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Créez une nouvelle facture pour la synchroniser avec BonaTours Web.',
                        style: TextStyle(fontSize: 11, color: AppColors2026.textMuted),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...filtered.map((inv) {
                Color statusColor;
                String statusLabel;
                if (inv.isPaid) {
                  statusColor = AppColors2026.emeraldNeon;
                  statusLabel = 'Payée';
                } else if (inv.isOverdue) {
                  statusColor = AppColors2026.roseLaser;
                  statusLabel = 'En retard';
                } else {
                  statusColor = AppColors2026.amberSolar;
                  statusLabel = 'En attente';
                }

                return SpatialGlassCard(
                  margin: const EdgeInsets.only(bottom: 12),
                  borderColor: statusColor.withOpacity(0.35),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row: N° Facture + Status Badge
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(7),
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.14),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(LucideIcons.fileText, size: 16, color: statusColor),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'FACTURE #${inv.invoiceNumber}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.5,
                                        ),
                                      ),
                                      Text(
                                        inv.invoiceDate,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors2026.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          NeonBadge(
                            label: statusLabel,
                            color: statusColor,
                            pulsing: inv.isOverdue,
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Client & ICE
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.user, size: 14, color: AppColors2026.cyanBright),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                inv.customerName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold),
                              ),
                            ),
                            if (inv.customerICE.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white10,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  'ICE: ${inv.customerICE}',
                                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),

                      if (inv.description.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          inv.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, color: AppColors2026.textSecondary),
                        ),
                      ],

                      const Divider(height: 18, color: Colors.white10),

                      // Totals & Actions Row
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'HT : ${currencyFmt.format(inv.totalHT.round())} DH • TVA : ${currencyFmt.format(inv.tva.round())} DH',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 10, color: AppColors2026.textMuted),
                                ),
                                Text(
                                  '${currencyFmt.format(inv.totalTTC.round())} DH TTC',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors2026.cyanBright,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 4),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Télécharger / Imprimer PDF',
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(6),
                                icon: const Icon(LucideIcons.printer, size: 16, color: AppColors2026.amberSolar),
                                onPressed: () async {
                                  final pdfBytes = await InvoicePdfService.generateInvoicePdf(inv);
                                  await WhatsAppHelper.printOrDownloadPdf(
                                    bytes: pdfBytes,
                                    filename: 'Facture_${inv.invoiceNumber.replaceAll("/", "_")}',
                                  );
                                },
                              ),
                              IconButton(
                                tooltip: 'Partager WhatsApp',
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(6),
                                icon: const Icon(LucideIcons.share2, size: 16, color: AppColors2026.emeraldNeon),
                                onPressed: () => _shareWhatsApp(inv),
                              ),
                              IconButton(
                                tooltip: 'Modifier Facture',
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(6),
                                icon: const Icon(LucideIcons.edit3, size: 16, color: AppColors2026.cyanBright),
                                onPressed: () => _openInvoiceForm(inv),
                              ),
                              IconButton(
                                tooltip: 'Supprimer',
                                constraints: const BoxConstraints(),
                                padding: const EdgeInsets.all(6),
                                icon: const Icon(LucideIcons.trash2, size: 16, color: AppColors2026.roseLaser),
                                onPressed: () => _confirmDelete(inv),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _InvoiceKpiTile extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _InvoiceKpiTile({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: color),
              ),
            ],
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors2026.textSecondary),
          ),
          Text(
            subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 9, color: color.withOpacity(0.85), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _FilterChipBtn extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _FilterChipBtn({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected ? color.withOpacity(0.22) : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? color : Colors.white12,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
            color: selected ? color : AppColors2026.textMuted,
          ),
        ),
      ),
    );
  }
}
